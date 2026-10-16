/**
 * POST /api/instagram/refresh/:accountId - silent long-lived token refresh.
 * Only works while the token is still valid; expired tokens require a full
 * OAuth reconnect.
 */

import { getAuthenticatedUser, unauthorized } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { refreshLongLivedToken } from '@/lib/instagram/oauth';
import { decrypt, encrypt } from '@/lib/crypto';
import { getEnv } from '@/lib/env';
import { computeTokenStatus } from '@/lib/api/schemas';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const logger = createLogger('api:refresh');

type RouteContext = { params: Promise<{ accountId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const user = await getAuthenticatedUser(request);
  if (!user) return unauthorized();

  const { accountId } = await context.params;
  const db = createServiceClient();

  const { data: account, error: fetchError } = await db
    .from('instagram_accounts')
    .select('id, user_id, username, access_token_encrypted, token_expires_at')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (fetchError || !account) {
    return Response.json({ error: 'Conta do Instagram não encontrada' }, { status: 404 });
  }

  const { status } = computeTokenStatus(account.token_expires_at as string | null);
  if (status === 'expired') {
    return Response.json(
      { error: 'token_expired', message: 'O token expirou. Reconecte sua conta do Instagram.' },
      { status: 400 }
    );
  }

  const env = getEnv();
  let currentToken: string;
  try {
    currentToken = decrypt(account.access_token_encrypted as string, env.TOKEN_ENCRYPTION_KEY);
  } catch {
    return Response.json({ error: 'Falha ao renovar o token' }, { status: 500 });
  }

  const result = await refreshLongLivedToken(currentToken);
  if ('error' in result) {
    logger.error({ accountId, status: result.status }, 'Token refresh API failed');
    if (result.error === 'invalid') {
      return Response.json(
        { error: 'token_invalid', message: 'O token não é mais válido. Reconecte sua conta do Instagram.' },
        { status: 400 }
      );
    }
    return Response.json({ error: 'Falha ao renovar o token' }, { status: 500 });
  }

  const newExpiresAt = new Date(Date.now() + result.expires_in * 1000);
  const { error: updateError } = await db
    .from('instagram_accounts')
    .update({
      access_token_encrypted: encrypt(result.access_token, env.TOKEN_ENCRYPTION_KEY),
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', accountId)
    .eq('user_id', user.id);

  if (updateError) {
    logger.error({ err: updateError, accountId }, 'Falha ao salvar o token renovado');
    return Response.json({ error: 'Falha ao salvar o token renovado' }, { status: 500 });
  }

  return Response.json({
    success: true,
    token_expires_at: newExpiresAt.toISOString(),
    token_days_remaining: Math.floor(result.expires_in / 86400),
    token_status: 'ok',
  });
}
