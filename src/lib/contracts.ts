export type StreamStatus = 'live' | 'offline' | 'unknown';
export type DemoPlayback = 'ready' | 'blocked' | 'unavailable';
export interface StreamView {
  status: StreamStatus;
  title: string | null;
  category: string | null;
  checkedAt: string | null;
  source: 'twitch' | 'demo' | 'unconfigured';
  stale?: boolean;
}
export interface PublicConfig {
  demo: boolean;
  channelLogin: string | null;
  discordUrl: string | null;
  pointsName: string;
  pointsSymbol: string;
  embedParents: string[];
}
export interface AccountView {
  displayName: string;
  login: string;
  provider: string;
  avatarUrl?: string | null;
  balance: string;
  totalEarned: string;
  watchtimeSeconds: string | null;
  lastSuccessfulSyncAt: string | null;
  syncStatus: string;
  listed: boolean;
  deletionRequested: boolean;
}
export interface LedgerView {
  id: string;
  type: string;
  amount: string;
  createdAt: string;
  reason: string | null;
}
export interface VaultRoundView {
  id: string;
  game: string;
  stake: string;
  payout: string;
  net: string;
  balanceAfter: string;
  bet: Record<string, unknown>;
  outcome: Record<string, unknown>;
  createdAt: string;
}
export type LeaderboardPeriod = 'all' | 'month';
export interface LeaderboardEntryView {
  rank: number;
  name: string;
  avatarUrl: string | null;
  value: string;
  you: boolean;
}
export interface LeaderboardView {
  period: LeaderboardPeriod;
  since: string | null;
  entries: LeaderboardEntryView[];
  viewer: { listed: boolean; rank: number | null; value: string } | null;
}
