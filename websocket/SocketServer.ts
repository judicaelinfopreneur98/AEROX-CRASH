import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { WS_EVENTS, WsMessage } from './events';
import { GameEngine } from '../game-engine/GameEngine';
import { AuthService } from '../auth/AuthService';
import { WalletEngine } from '../wallet/WalletEngine';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAlive?: boolean;
}

export class SocketServer {
  private static instance: SocketServer;
  private wss: WebSocketServer | null = null;
  private gameEngine = GameEngine.getInstance();
  private authService = AuthService.getInstance();
  private wallet = WalletEngine.getInstance();

  private userSockets: Map<string, Set<AuthenticatedSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }
    return SocketServer.instance;
  }

  public init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedSocket, req) => {
      ws.isAlive = true;

      // Authentification immédiate dès la connexion si un token est dans l'URL ?token=...
      try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const queryToken = url.searchParams.get('token');
        if (queryToken) {
          const user = this.authService.verifyToken(queryToken);
          if (user) {
            ws.userId = user.id;
            ws.username = user.username;
            if (!this.userSockets.has(user.id)) {
              this.userSockets.set(user.id, new Set());
            }
            this.userSockets.get(user.id)!.add(ws);
          }
        }
      } catch {}

      // Heartbeat pong listener
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Envoi de l'état initial actuel de la manche
      this.sendToSocket(ws, WS_EVENTS.GAME_CREATED, this.gameEngine.getPublicRoundInfo());
      this.sendToSocket(ws, 'game.active_bets', this.gameEngine.getActiveBetsList());
      this.sendToSocket(ws, 'game.recent_history', this.gameEngine.getRecentRounds());

      // Gestion des messages entrants
      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as WsMessage;
          await this.handleClientMessage(ws, msg);
        } catch (err: any) {
          this.sendToSocket(ws, 'error', { message: 'Message JSON invalide.' });
        }
      });

      ws.on('close', () => {
        if (ws.userId) {
          const set = this.userSockets.get(ws.userId);
          if (set) {
            set.delete(ws);
            if (set.size === 0) this.userSockets.delete(ws.userId);
          }
        }
      });
    });

    // Configuration du heartbeat toutes les 30s
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((client: any) => {
        if (client.isAlive === false) {
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    // Liaison avec le GameEngine
    this.bindGameEngineEvents();
  }

  private bindGameEngineEvents() {
    this.gameEngine.on('game.created', (data) => {
      this.broadcast(WS_EVENTS.GAME_CREATED, data);
    });

    this.gameEngine.on('game.betting', (data) => {
      this.broadcast(WS_EVENTS.GAME_BETTING, data);
    });

    this.gameEngine.on('game.started', (data) => {
      this.broadcast(WS_EVENTS.GAME_STARTED, data);
    });

    this.gameEngine.on('game.multiplier', (data) => {
      this.broadcast(WS_EVENTS.GAME_MULTIPLIER, data);
    });

    this.gameEngine.on('game.crashed', (data) => {
      this.broadcast(WS_EVENTS.GAME_CRASHED, data);

      // Met à jour le solde de tous les joueurs connectés après le crash (défalcation confirmée)
      this.userSockets.forEach(async (sockets, uid) => {
        const bal = await this.wallet.getBalance(uid);
        if (bal.data) {
          this.sendToUser(uid, WS_EVENTS.WALLET_UPDATED, { balance: bal.data.balance });
        }
      });
    });

    this.gameEngine.on('game.result', (data) => {
      this.broadcast(WS_EVENTS.GAME_RESULT, data);
    });

    this.gameEngine.on('bet.accepted', (data) => {
      this.broadcast(WS_EVENTS.BET_ACCEPTED, data.bet);
      if (data.bet.userId && data.newBalance !== undefined) {
        this.sendToUser(data.bet.userId, WS_EVENTS.WALLET_UPDATED, { balance: data.newBalance });
      }
    });

    this.gameEngine.on('cashout.success', (data) => {
      this.broadcast(WS_EVENTS.CASHOUT_SUCCESS, data);
      if (data.userId && data.balance !== undefined) {
        this.sendToUser(data.userId, WS_EVENTS.WALLET_UPDATED, { balance: data.balance });
      }
    });
  }

  private async handleClientMessage(ws: AuthenticatedSocket, msg: WsMessage) {
    switch (msg.event) {
      case WS_EVENTS.PING:
        this.sendToSocket(ws, WS_EVENTS.PONG, { timestamp: Date.now() });
        break;

      case WS_EVENTS.ACTION_AUTH: {
        const { token } = msg.data || {};
        if (!token) {
          this.sendToSocket(ws, 'auth.error', { message: 'Jeton JWT manquant.' });
          return;
        }
        const user = this.authService.verifyToken(token);
        if (!user) {
          this.sendToSocket(ws, 'auth.error', { message: 'Session expirée ou jeton invalide.' });
          return;
        }
        ws.userId = user.id;
        ws.username = user.username;

        if (!this.userSockets.has(user.id)) {
          this.userSockets.set(user.id, new Set());
        }
        this.userSockets.get(user.id)!.add(ws);

        const bal = await this.wallet.getBalance(user.id);
        this.sendToSocket(ws, 'auth.success', { user, balance: bal.data?.balance });
        this.sendToSocket(ws, WS_EVENTS.WALLET_UPDATED, { balance: bal.data?.balance });
        break;
      }

      case WS_EVENTS.ACTION_BET: {
        let userId = ws.userId;
        let username = ws.username;

        // Authentification à la volée avec le token passé dans la payload
        if ((!userId || !username) && msg.data?.token) {
          const user = this.authService.verifyToken(msg.data.token);
          if (user) {
            userId = user.id;
            username = user.username;
            ws.userId = userId;
            ws.username = username;
            if (!this.userSockets.has(userId)) {
              this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(ws);
          }
        }

        // Si toujours pas d'utilisateur, fallback joueur démo pour tests sans blocage
        if (!userId || !username) {
          const demoUser = this.authService.getUserById('usr_demo_001');
          if (demoUser) {
            userId = demoUser.id;
            username = demoUser.username;
            ws.userId = userId;
            ws.username = username;
            if (!this.userSockets.has(userId)) {
              this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(ws);
          }
        }

        if (!userId || !username) {
          this.sendToSocket(ws, WS_EVENTS.BET_REJECTED, { error: 'Vous devez être authentifié pour parier.' });
          return;
        }

        const { amount, panelIndex, autoCashout } = msg.data || {};
        const res = await this.gameEngine.placeBet(
          userId,
          username,
          Number(amount),
          Number(panelIndex) || 1,
          autoCashout ? Number(autoCashout) : null
        );

        if (!res.success) {
          this.sendToSocket(ws, WS_EVENTS.BET_REJECTED, {
            error: res.error,
            panelIndex: Number(panelIndex) || 1,
          });
        } else {
          // Débit immédiat confirmé au client
          const bal = await this.wallet.getBalance(userId);
          this.sendToSocket(ws, WS_EVENTS.WALLET_UPDATED, { balance: bal.data?.balance });
        }
        break;
      }

      case WS_EVENTS.ACTION_CASHOUT: {
        let userId = ws.userId;

        if (!userId && msg.data?.token) {
          const user = this.authService.verifyToken(msg.data.token);
          if (user) {
            userId = user.id;
            ws.userId = user.id;
            ws.username = user.username;
            if (!this.userSockets.has(userId)) {
              this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(ws);
          }
        }

        if (!userId) {
          const demoUser = this.authService.getUserById('usr_demo_001');
          if (demoUser) {
            userId = demoUser.id;
            ws.userId = userId;
            ws.username = demoUser.username;
            if (!this.userSockets.has(userId)) {
              this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(ws);
          }
        }

        if (!userId) {
          this.sendToSocket(ws, WS_EVENTS.CASHOUT_FAILED, { error: 'Non authentifié.' });
          return;
        }

        const { betId } = msg.data || {};
        const res = await this.gameEngine.cashOut(userId, betId);

        if (!res.success) {
          this.sendToSocket(ws, WS_EVENTS.CASHOUT_FAILED, { error: res.error, betId });
        } else {
          // Crédit immédiat confirmé au client
          const bal = await this.wallet.getBalance(userId);
          this.sendToSocket(ws, WS_EVENTS.WALLET_UPDATED, { balance: bal.data?.balance });
        }
        break;
      }
    }
  }

  public broadcast(event: string, data: any) {
    if (!this.wss) return;
    const payload = JSON.stringify({ event, data, timestamp: Date.now() });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  public sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    const payload = JSON.stringify({ event, data, timestamp: Date.now() });
    sockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(payload);
      }
    });
  }

  public sendToSocket(ws: WebSocket, event: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data, timestamp: Date.now() }));
    }
  }

  public getConnectedClientsCount(): number {
    return this.wss ? this.wss.clients.size : 0;
  }
}
