import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  timestamp,
  bigint,
  integer,
  boolean,
  jsonb,
  check,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const time = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow();
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  listed: boolean('listed').notNull().default(false),
  createdAt: time('created_at'),
  deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
});
export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    login: text('login').notNull(),
    updatedAt: time('updated_at'),
    encryptedTokens: text('encrypted_tokens'),
    authorizationStatus: text('authorization_status').notNull().default('active'),
    validatedAt: timestamp('validated_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('auth_identity_unique').on(t.provider, t.providerUserId)],
);
export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: time('created_at'),
});
export const wallets = pgTable(
  'wallets',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id),
    balance: bigint('balance', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    totalEarned: bigint('total_earned', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
  },
  (t) => [check('wallet_nonnegative', sql`${t.balance} >= 0 AND ${t.totalEarned} >= 0`)],
);
export const pointRules = pgTable(
  'point_rules',
  {
    version: integer('version').primaryKey(),
    intervalSeconds: bigint('interval_seconds', { mode: 'bigint' }).notNull(),
    points: bigint('points', { mode: 'bigint' }).notNull(),
    effectiveAt: time('effective_at'),
    historicalImport: text('historical_import').notNull().default('off'),
  },
  (t) => [
    check('positive_point_rule', sql`${t.intervalSeconds} > 0 AND ${t.points} > 0`),
    check('no_implicit_import', sql`${t.historicalImport} = 'off'`),
  ],
);
export const externalIdentities = pgTable(
  'external_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider').notNull(),
    channelId: text('channel_id').notNull(),
    providerKey: text('provider_key').notNull(),
    verifiedTwitchId: text('verified_twitch_id'),
    providerUsername: text('provider_username'),
    status: text('status').notNull().default('unverified'),
    epoch: integer('epoch').notNull().default(1),
    mappingHistory: jsonb('mapping_history').notNull().default([]),
  },
  (t) => [uniqueIndex('external_mapping_unique').on(t.provider, t.channelId, t.providerKey)],
);
export const checkpoints = pgTable(
  'watchtime_checkpoints',
  {
    identityId: uuid('identity_id')
      .primaryKey()
      .references(() => externalIdentities.id),
    baseline: bigint('baseline', { mode: 'bigint' }).notNull(),
    highWater: bigint('high_water', { mode: 'bigint' }).notNull(),
    remainder: bigint('remainder', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    epoch: integer('epoch').notNull(),
    ruleVersion: integer('rule_version')
      .notNull()
      .references(() => pointRules.version),
    lastSuccessfulSyncAt: time('last_successful_sync_at'),
  },
  (t) => [
    check(
      'checkpoint_values',
      sql`${t.baseline} >= 0 AND ${t.highWater} >= ${t.baseline} AND ${t.remainder} >= 0`,
    ),
  ],
);
export const snapshots = pgTable('watchtime_snapshots', {
  observationId: text('observation_id').primaryKey(),
  identityId: uuid('identity_id')
    .notNull()
    .references(() => externalIdentities.id),
  seconds: bigint('seconds', { mode: 'bigint' }),
  status: text('status').notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  receivedAt: time('received_at'),
});
export const ledger = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull(),
    amount: bigint('amount', { mode: 'bigint' }).notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    sourceRef: text('source_ref').notNull(),
    ruleVersion: integer('rule_version').references(() => pointRules.version),
    reason: text('reason'),
    createdAt: time('created_at'),
  },
  (t) => [
    check('ledger_allowed_type', sql`${t.type} IN ('watchtime', 'admin_correction')`),
    check(
      'ledger_valid_amount',
      sql`${t.amount} <> 0 AND (${t.type} <> 'watchtime' OR ${t.amount} > 0)`,
    ),
  ],
);
export const streamStates = pgTable('stream_states', {
  broadcasterId: text('broadcaster_id').primaryKey(),
  status: text('status').notNull().default('unknown'),
  streamId: text('stream_id'),
  title: text('title'),
  category: text('category'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  checkedAt: time('checked_at'),
  nextCheckAt: time('next_check_at'),
  failures: integer('failures').notNull().default(0),
  errorCode: text('error_code'),
});
export const syncJobs = pgTable('sync_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  cursor: text('cursor'),
  attempts: integer('attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  nextRunAt: time('next_run_at'),
  errorCode: text('error_code'),
});
export const processedEvents = pgTable('processed_events', {
  id: text('id').primaryKey(),
  processedAt: time('processed_at'),
});
export const oauthFlows = pgTable('oauth_flows', {
  stateHash: text('state_hash').primaryKey(),
  browserHash: text('browser_hash').notNull(),
  encryptedVerifier: text('encrypted_verifier').notNull(),
  returnPath: text('return_path').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const integrationCredentials = pgTable('integration_credentials', {
  key: text('key').primaryKey(),
  encryptedValue: text('encrypted_value').notNull(),
  updatedAt: time('updated_at'),
});
export const requestLimits = pgTable('request_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const auditLogs = pgTable('admin_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  subjectId: uuid('subject_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(),
  reason: text('reason').notNull(),
  reference: text('reference').notNull(),
  createdAt: time('created_at'),
});
