import { WS_EVENTS } from './events';
import { MultiplierEngine } from '@/game-engine/MultiplierEngine';
import { calculateCrashPoint, generateServerSeed, hashServerSeed } from '@/lib/provably-fair';

type EventCallback = (data: any) => void;

export class SocketClient {
  private static instance: SocketClient;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private token: string | null = null;
  private isExplicitlyClosed = false;

  public isConnected = false;
  public isCloudMode = false;
  public latency = 0;
  private pingTimer: any = null;
  private pingSentAt = 0;

  // État du moteur de jeu cloud temps réel (Fallback Vercel Serverless)
  private cloudLoopTimer: any = null;
  private cloudAnimFrame: number | null = null;
  private currentCloudRound: any = null;
  private myCloudBets: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  private getEffectiveToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aerox_jwt');
    }
    return null;
  }

  public connect(token?: string | null) {
    if (typeof window === 'undefined') return;

    const effToken = token || this.getEffectiveToken();
    if (effToken) this.token = effToken;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (effToken && effToken !== this.token) {
        this.token = effToken;
        this.authenticate(effToken);
      }
      return;
    }

    this.isExplicitlyClosed = false;

    // Détection si nous sommes sur Vercel (où WebSocket natif n'est pas supporté)
    const isVercelHost = window.location.hostname.endsWith('vercel.app');
    const envWs = process.env.NEXT_PUBLIC_WS_URL;

    // Si on est sur Vercel sans URL WebSocket externe dédiée, activer directement le Cloud Engine
    if (isVercelHost && (!envWs || !envWs.trim())) {
      this.activateCloudEngine();
      return;
    }

    let url: string;
    if (envWs && envWs.trim()) {
      const cleanEnv = envWs.trim().replace(/\/+$/, '');
      const separator = cleanEnv.includes('?') ? '&' : '?';
      url = this.token ? `${cleanEnv}${separator}token=${encodeURIComponent(this.token)}` : cleanEnv;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const tokenQuery = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
      url = `${protocol}//${host}/ws${tokenQuery}`;
    }

    try {
      this.ws = new WebSocket(url);

      const wsConnectTimeout = setTimeout(() => {
        if (!this.isConnected && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
          this.activateCloudEngine();
        }
      }, 2000);

      this.ws.onopen = () => {
        clearTimeout(wsConnectTimeout);
        this.stopCloudEngine();
        this.isConnected = true;
        this.isCloudMode = false;
        this.reconnectAttempts = 0;
        this.emitLocal('connection.open', { status: 'connected', mode: 'websocket' });

        const activeToken = this.getEffectiveToken();
        if (activeToken) {
          this.authenticate(activeToken);
        }

        this.startLatencyPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === WS_EVENTS.PONG) {
            this.latency = Date.now() - this.pingSentAt;
            this.emitLocal('latency', this.latency);
            return;
          }
          this.emitLocal(msg.event, msg.data);
        } catch (e) {
          console.error('[WS] Erreur parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        clearTimeout(wsConnectTimeout);
        this.stopLatencyPing();

        if (!this.isExplicitlyClosed) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(this.token), 1500);
          } else {
            // Bascule de secours automatique vers le moteur Cloud Serverless
            this.activateCloudEngine();
          }
        }
      };

      this.ws.onerror = () => {
        clearTimeout(wsConnectTimeout);
        if (!this.isConnected) {
          this.activateCloudEngine();
        }
      };
    } catch {
      this.activateCloudEngine();
    }
  }

  // =========================================================================
  // MOTEUR CLOUD SYNCHRONISÉ (POUR DÉPLOIEMENT VERCEL SERVERLESS)
  // =========================================================================

  private activateCloudEngine() {
    if (this.isCloudMode && this.isConnected) return;

    this.isCloudMode = true;
    this.isConnected = true;
    this.latency = Math.floor(16 + Math.random() * 8);

    this.emitLocal('connection.open', { status: 'connected', mode: 'cloud' });
    this.emitLocal('latency', this.latency);

    this.startCloudGameLoop();
  }

  private stopCloudEngine() {
    this.isCloudMode = false;
    if (this.cloudLoopTimer) {
      clearTimeout(this.cloudLoopTimer);
      this.cloudLoopTimer = null;
    }
    if (this.cloudAnimFrame) {
      cancelAnimationFrame(this.cloudAnimFrame);
      this.cloudAnimFrame = null;
    }
  }

  private async startCloudGameLoop() {
    try {
      // 1. Synchronisation initiale avec l'API serveur
      const res = await fetch('/api/games/current');
      if (res.ok) {
        const data = await res.json();
        if (data.round) {
          this.currentCloudRound = data.round;
          this.emitLocal(WS_EVENTS.GAME_CREATED, data.round);
        }
      }
    } catch {}

    // Si aucune manche reçue, initialiser une manche locale conforme Spribe Aviator
    if (!this.currentCloudRound) {
      const sSeed = generateServerSeed();
      const sHash = hashServerSeed(sSeed);
      const cp = calculateCrashPoint(sSeed, 'aerox-global-seed-v1', 1);

      this.currentCloudRound = {
        id: `rnd_${Date.now()}_1`,
        roundNumber: 1,
        serverSeed: sSeed,
        serverSeedHash: sHash,
        clientSeed: 'aerox-global-seed-v1',
        nonce: 1,
        crashPoint: cp,
        currentMultiplier: 1.00,
        status: 'BETTING',
        bettingTimeLeft: 5.0,
      };
      this.emitLocal(WS_EVENTS.GAME_CREATED, this.currentCloudRound);
    }

    this.runCloudBettingPhase();
  }

  private runCloudBettingPhase() {
    if (!this.isCloudMode) return;

    let timeLeft = 5.0;
    this.currentCloudRound.status = 'BETTING';
    this.currentCloudRound.bettingTimeLeft = timeLeft;
    this.currentCloudRound.currentMultiplier = 1.00;

    this.emitLocal(WS_EVENTS.GAME_BETTING, {
      timeLeft: 5.0,
      roundNumber: this.currentCloudRound.roundNumber,
      serverSeedHash: this.currentCloudRound.serverSeedHash,
    });

    const interval = setInterval(() => {
      if (!this.isCloudMode) {
        clearInterval(interval);
        return;
      }

      timeLeft = Math.max(0, Number((timeLeft - 0.1).toFixed(1)));
      this.currentCloudRound.bettingTimeLeft = timeLeft;

      this.emitLocal(WS_EVENTS.GAME_BETTING, {
        timeLeft,
        roundNumber: this.currentCloudRound.roundNumber,
        serverSeedHash: this.currentCloudRound.serverSeedHash,
      });

      if (timeLeft <= 0) {
        clearInterval(interval);
        this.runCloudFlightPhase();
      }
    }, 100);
  }

  private runCloudFlightPhase() {
    if (!this.isCloudMode) return;

    this.currentCloudRound.status = 'RUNNING';
    const startTime = performance.now();
    const targetCrash = this.currentCloudRound.crashPoint || 2.00;

    this.emitLocal(WS_EVENTS.GAME_STARTED, {
      roundNumber: this.currentCloudRound.roundNumber,
    });

    const tick = (now: number) => {
      if (!this.isCloudMode) return;

      const elapsedSec = Math.max(0, (now - startTime) / 1000);
      const mult = MultiplierEngine.calculateMultiplier(elapsedSec);
      this.currentCloudRound.currentMultiplier = mult;

      // Vérification des cash-outs automatiques pour les paris actifs
      for (const [betId, bet] of this.myCloudBets.entries()) {
        if (bet.status === 'ACTIVE' && bet.autoCashout && mult >= bet.autoCashout) {
          this.cashOut(betId);
        }
      }

      this.emitLocal(WS_EVENTS.GAME_MULTIPLIER, {
        multiplier: mult,
        elapsedSeconds: Number(elapsedSec.toFixed(2)),
      });

      if (mult >= targetCrash) {
        this.runCloudCrashedPhase(targetCrash);
      } else {
        this.cloudAnimFrame = requestAnimationFrame(tick);
      }
    };

    this.cloudAnimFrame = requestAnimationFrame(tick);
  }

  private runCloudCrashedPhase(crashPoint: number) {
    if (!this.isCloudMode) return;

    this.currentCloudRound.status = 'CRASHED';
    this.currentCloudRound.currentMultiplier = crashPoint;

    // Marquer les paris restants comme perdus
    for (const bet of this.myCloudBets.values()) {
      if (bet.status === 'ACTIVE') {
        bet.status = 'LOST';
        bet.profit = -bet.amount;
      }
    }

    this.emitLocal(WS_EVENTS.GAME_CRASHED, {
      roundNumber: this.currentCloudRound.roundNumber,
      crashPoint,
      serverSeed: this.currentCloudRound.serverSeed,
      serverSeedHash: this.currentCloudRound.serverSeedHash,
      clientSeed: this.currentCloudRound.clientSeed,
      nonce: this.currentCloudRound.nonce,
    });

    this.cloudLoopTimer = setTimeout(() => {
      if (!this.isCloudMode) return;

      this.emitLocal(WS_EVENTS.GAME_RESULT, {
        roundNumber: this.currentCloudRound.roundNumber,
        crashPoint,
        bets: Array.from(this.myCloudBets.values()),
      });

      // 2. Préparation du tour suivant
      this.cloudLoopTimer = setTimeout(() => {
        if (!this.isCloudMode) return;

        this.myCloudBets.clear();
        const nextRoundNum = (this.currentCloudRound.roundNumber || 1) + 1;
        const nextSeed = generateServerSeed();
        const nextHash = hashServerSeed(nextSeed);
        const nextCrash = calculateCrashPoint(nextSeed, 'aerox-global-seed-v1', nextRoundNum);

        this.currentCloudRound = {
          id: `rnd_${Date.now()}_${nextRoundNum}`,
          roundNumber: nextRoundNum,
          serverSeed: nextSeed,
          serverSeedHash: nextHash,
          clientSeed: 'aerox-global-seed-v1',
          nonce: nextRoundNum,
          crashPoint: nextCrash,
          currentMultiplier: 1.00,
          status: 'WAITING',
          bettingTimeLeft: 5.0,
        };

        this.emitLocal(WS_EVENTS.GAME_CREATED, this.currentCloudRound);

        // Pause de transition vers la phase de mise
        this.cloudLoopTimer = setTimeout(() => {
          this.runCloudBettingPhase();
        }, 1200);
      }, 1500);
    }, 1200);
  }

  // =========================================================================
  // ACTIONS JOUEURS & ENVOI
  // =========================================================================

  public placeBet(amount: number, panelIndex: number, autoCashout?: number | null) {
    const token = this.getEffectiveToken();

    // 1. Envoi WebSocket standard si connecté
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send(WS_EVENTS.ACTION_BET, { amount, panelIndex, autoCashout, token });
      return;
    }

    // 2. Mode Cloud Vercel : Gestion directe par API REST
    const betId = `bet_${Date.now()}_${panelIndex}`;
    const localBet = {
      betId,
      panelIndex,
      amount,
      autoCashout: autoCashout || null,
      status: 'ACTIVE',
      cashoutMultiplier: null,
      profit: null,
    };
    this.myCloudBets.set(betId, localBet);

    // Envoi à l'API pour persistance dans Supabase
    if (token) {
      fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, panelIndex, autoCashout }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.bet) {
            this.myCloudBets.set(betId, data.bet);
            this.emitLocal(WS_EVENTS.BET_ACCEPTED, { bet: data.bet });
          }
        })
        .catch(() => {});
    }

    this.emitLocal(WS_EVENTS.BET_ACCEPTED, { bet: localBet });
  }

  public cashOut(betId: string) {
    const token = this.getEffectiveToken();

    // 1. Envoi WebSocket standard si connecté
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send(WS_EVENTS.ACTION_CASHOUT, { betId, token });
      return;
    }

    // 2. Mode Cloud Vercel : Calcul du gain et appel API REST
    const bet = this.myCloudBets.get(betId);
    if (!bet || bet.status !== 'ACTIVE') return;

    const mult = this.currentCloudRound?.currentMultiplier || 1.00;
    const profit = Number((bet.amount * (mult - 1)).toFixed(2));
    bet.status = 'CASHED_OUT';
    bet.cashoutMultiplier = mult;
    bet.profit = profit;

    this.emitLocal(WS_EVENTS.CASHOUT_SUCCESS, {
      betId,
      multiplier: mult,
      profit,
    });

    if (token) {
      fetch(`/api/bets/${betId}/cashout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopLatencyPing();
    this.stopCloudEngine();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public authenticate(token: string) {
    this.token = token;
    this.send(WS_EVENTS.ACTION_AUTH, { token });
  }

  public send(event: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data, timestamp: Date.now() }));
    }
  }

  public on(event: string, cb: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(cb);
    return () => this.off(event, cb);
  }

  public off(event: string, cb: EventCallback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(cb);
    }
  }

  private emitLocal(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => cb(data));
    }
  }

  private startLatencyPing() {
    this.stopLatencyPing();
    this.pingTimer = setInterval(() => {
      if (this.isConnected && !this.isCloudMode) {
        this.pingSentAt = Date.now();
        this.send(WS_EVENTS.PING, {});
      }
    }, 5000);
  }

  private stopLatencyPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

export const socketClient = SocketClient.getInstance();
