export interface AdminMetrics {
  totalUsers: number;
  activePlayersNow: number;
  totalRounds: number;
  totalBetsVolume: number;
  totalPayoutsVolume: number;
  grossGamingRevenue: number;
  rtpRate: number;
  wsConnections: number;
  serverUptimeSeconds: number;
}

export interface AuditRecord {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: string;
  createdAt: Date;
}
