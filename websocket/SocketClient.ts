import { WS_EVENTS } from './events';

type EventCallback = (data: any) => void;

export class SocketClient {
  private static instance: SocketClient;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private token: string | null = null;
  private isExplicitlyClosed = false;

  public isConnected = false;
  public latency = 0;
  private pingTimer: any = null;
  private pingSentAt = 0;

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

    const envWs = process.env.NEXT_PUBLIC_WS_URL;
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

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emitLocal('connection.open', { status: 'connected' });

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
        this.isConnected = false;
        this.stopLatencyPing();
        this.emitLocal('connection.close', { status: 'disconnected' });

        if (!this.isExplicitlyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          const timeout = Math.min(5000, 1000 * Math.pow(1.5, this.reconnectAttempts));
          this.reconnectAttempts++;
          setTimeout(() => this.connect(this.token), timeout);
        }
      };

      this.ws.onerror = (err) => {
        this.emitLocal('connection.error', err);
      };
    } catch (e) {
      console.error('[WS] Connexion impossible:', e);
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopLatencyPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public authenticate(token: string) {
    this.token = token;
    this.send(WS_EVENTS.ACTION_AUTH, { token });
  }

  public placeBet(amount: number, panelIndex: number, autoCashout?: number | null) {
    const token = this.getEffectiveToken();
    this.send(WS_EVENTS.ACTION_BET, { amount, panelIndex, autoCashout, token });
  }

  public cashOut(betId: string) {
    const token = this.getEffectiveToken();
    this.send(WS_EVENTS.ACTION_CASHOUT, { betId, token });
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
      if (this.isConnected) {
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
