import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/types';
import { authAccounts, externalIdentities, users, wallets } from '../db/schema';
import type { TwitchProfile, TokenSet, TwitchOAuthAdapter } from '../integrations/twitch-oauth';
import { RevokedAuthorization, tokenSetSchema } from '../integrations/twitch-oauth';
import { sessions } from '../db/schema';
import { decrypt, encrypt } from './crypto';

export async function saveTwitchIdentity(
  db: Database,
  profile: TwitchProfile,
  tokens: TokenSet,
  secret: string,
) {
  return db.transaction(async (tx) => {
    // The unique identity needs a lock BEFORE it exists to handle concurrent first logins.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`twitch-login:${profile.id}`}))`);
    const [existing] = await tx
      .select()
      .from(authAccounts)
      .where(and(eq(authAccounts.provider, 'twitch'), eq(authAccounts.providerUserId, profile.id)));
    const userId =
      existing?.userId ??
      (
        await tx
          .insert(users)
          .values({
            displayName: profile.display_name,
            avatarUrl: safeAvatar(profile.profile_image_url),
          })
          .returning()
      )[0].id;
    if (existing) {
      await tx.select().from(wallets).where(eq(wallets.userId, userId)).for('update');
      await tx
        .update(users)
        .set({
          displayName: profile.display_name,
          avatarUrl: safeAvatar(profile.profile_image_url),
        })
        .where(eq(users.id, userId));
      if (existing.login !== profile.login) {
        await tx
          .update(externalIdentities)
          .set({
            status: 'name_changed',
            mappingHistory: sql`${externalIdentities.mappingHistory} || ${JSON.stringify([{ previousLogin: existing.login, nextLogin: profile.login, at: new Date().toISOString(), action: 'pause_for_review' }])}::jsonb`,
          })
          .where(eq(externalIdentities.userId, userId));
      }
      await tx
        .update(authAccounts)
        .set({
          login: profile.login,
          encryptedTokens: encrypt(JSON.stringify(tokens), secret, `twitch:${profile.id}`),
          authorizationStatus: 'active',
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(authAccounts.id, existing.id));
    } else {
      await tx
        .insert(authAccounts)
        .values({
          userId,
          provider: 'twitch',
          providerUserId: profile.id,
          login: profile.login,
          encryptedTokens: encrypt(JSON.stringify(tokens), secret, `twitch:${profile.id}`),
          validatedAt: new Date(),
        });
      await tx.insert(wallets).values({ userId });
    }
    return userId;
  });
}
export function safeAvatar(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'static-cdn.jtvnw.net' ? url.href : null;
  } catch {
    return null;
  }
}

export async function validateAuthorization(
  db: Database,
  userId: string,
  adapter: TwitchOAuthAdapter,
  secret: string,
  startedAt: Date,
) {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select()
      .from(authAccounts)
      .where(and(eq(authAccounts.userId, userId), eq(authAccounts.provider, 'twitch')))
      .for('update');
    if (!account || account.authorizationStatus !== 'active' || !account.encryptedTokens)
      return false;
    if (
      account.validatedAt &&
      account.validatedAt >= startedAt &&
      Date.now() - account.validatedAt.getTime() < 55 * 60_000
    )
      return true;
    try {
      let tokens = tokenSetSchema.parse(
        JSON.parse(decrypt(account.encryptedTokens, secret, `twitch:${account.providerUserId}`)),
      );
      if (tokens.expiresAt < Date.now() + 60_000) tokens = await adapter.refresh(tokens);
      let validated: { userId: string; expiresIn: number };
      try {
        validated = await adapter.validate(tokens.accessToken);
      } catch (error) {
        if (!(error instanceof RevokedAuthorization)) throw error;
        tokens = await adapter.refresh(tokens);
        validated = await adapter.validate(tokens.accessToken);
      }
      if (validated.userId !== account.providerUserId)
        throw new RevokedAuthorization('IDENTITY_CHANGED');
      await tx
        .update(authAccounts)
        .set({
          encryptedTokens: encrypt(
            JSON.stringify(tokens),
            secret,
            `twitch:${account.providerUserId}`,
          ),
          validatedAt: new Date(),
        })
        .where(eq(authAccounts.id, account.id));
      return true;
    } catch (error) {
      if (!(error instanceof RevokedAuthorization)) throw error;
      await tx
        .update(authAccounts)
        .set({ authorizationStatus: 'revoked', encryptedTokens: null })
        .where(eq(authAccounts.id, account.id));
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      return false;
    }
  });
}
