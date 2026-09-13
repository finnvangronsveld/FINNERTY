import 'server-only';
import type { PublicConfig } from '@/lib/contracts';
export function isDemo() {
  return process.env.NODE_ENV !== 'production' && (process.env.APP_MODE ?? 'demo') === 'demo';
}
function safeDiscord(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['discord.gg', 'discord.com'].includes(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function publicConfig(): PublicConfig {
  return {
    demo: isDemo(),
    channelLogin: /^[a-z0-9_]{1,25}$/.test(process.env.TWITCH_CHANNEL_LOGIN ?? '')
      ? process.env.TWITCH_CHANNEL_LOGIN!
      : null,
    discordUrl: safeDiscord(process.env.DISCORD_INVITE_URL),
    pointsName: process.env.POINTS_NAME || 'Vault Points',
    pointsSymbol: process.env.POINTS_SYMBOL || 'VP',
    embedParents: (process.env.TWITCH_EMBED_PARENTS || 'localhost,127.0.0.1')
      .split(',')
      .map((v) => v.trim())
      .filter((v) => /^[a-z0-9.-]+$/.test(v)),
  };
}
