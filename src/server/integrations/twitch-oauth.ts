import * as oauth from 'oauth4webapi';
import { z } from 'zod';
export const twitchAuthorizationServer: oauth.AuthorizationServer = {
  issuer: 'https://id.twitch.tv/oauth2',
  authorization_endpoint: 'https://id.twitch.tv/oauth2/authorize',
  token_endpoint: 'https://id.twitch.tv/oauth2/token',
};
export interface TwitchCredentials {
  clientId: string;
  clientSecret: string;
  callback: string;
}
export const tokenSetSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number().positive(),
});
export type TokenSet = z.infer<typeof tokenSetSchema>;
export const twitchProfileSchema = z.object({
  id: z.string().regex(/^\d+$/),
  login: z.string().regex(/^[a-z0-9_]+$/),
  display_name: z.string().min(1).max(100),
  profile_image_url: z.string().url(),
});
export type TwitchProfile = z.infer<typeof twitchProfileSchema>;
export class RevokedAuthorization extends Error {}
export interface TwitchOAuthAdapter {
  exchange(parameters: URLSearchParams, expectedState: string, verifier: string): Promise<TokenSet>;
  refresh(tokens: TokenSet): Promise<TokenSet>;
  validate(accessToken: string): Promise<{ userId: string; expiresIn: number }>;
  profile(accessToken: string): Promise<TwitchProfile>;
}
export function twitchOAuth(
  credentials: TwitchCredentials,
  request: typeof fetch = fetch,
): TwitchOAuthAdapter {
  const as = twitchAuthorizationServer;
  const client = { client_id: credentials.clientId };
  const auth = oauth.ClientSecretPost(credentials.clientSecret);
  const options = () => ({ [oauth.customFetch]: request, signal: AbortSignal.timeout(8000) });
  function normalized(result: oauth.TokenEndpointResponse, previous?: TokenSet): TokenSet {
    return tokenSetSchema.parse({
      accessToken: result.access_token,
      refreshToken: result.refresh_token ?? previous?.refreshToken,
      expiresAt: Date.now() + Number(result.expires_in) * 1000,
    });
  }
  return {
    async exchange(parameters, expectedState, verifier) {
      const validated = oauth.validateAuthResponse(as, client, parameters, expectedState);
      const response = await oauth.authorizationCodeGrantRequest(
        as,
        client,
        auth,
        validated,
        credentials.callback,
        verifier,
        options(),
      );
      return normalized(await oauth.processAuthorizationCodeResponse(as, client, response));
    },
    async refresh(tokens) {
      const response = await oauth.refreshTokenGrantRequest(
        as,
        client,
        auth,
        tokens.refreshToken,
        options(),
      );
      if (response.status === 400 || response.status === 401)
        throw new RevokedAuthorization('AUTHORIZATION_REVOKED');
      return normalized(await oauth.processRefreshTokenResponse(as, client, response), tokens);
    },
    async validate(accessToken) {
      const response = await request('https://id.twitch.tv/oauth2/validate', {
        headers: { Authorization: `OAuth ${accessToken}` },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (response.status === 401) throw new RevokedAuthorization('AUTHORIZATION_REVOKED');
      if (!response.ok) throw new Error('TWITCH_VALIDATION_UNAVAILABLE');
      const value = z
        .object({
          client_id: z.string(),
          user_id: z.string(),
          expires_in: z.number().nonnegative(),
        })
        .parse(await response.json());
      if (value.client_id !== credentials.clientId)
        throw new RevokedAuthorization('WRONG_OAUTH_CLIENT');
      return { userId: value.user_id, expiresIn: value.expires_in };
    },
    async profile(accessToken) {
      const response = await request('https://api.twitch.tv/helix/users', {
        headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': credentials.clientId },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('TWITCH_PROFILE_UNAVAILABLE');
      return z.object({ data: z.array(twitchProfileSchema).length(1) }).parse(await response.json())
        .data[0];
    },
  };
}
