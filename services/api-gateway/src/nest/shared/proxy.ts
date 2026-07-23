import type { Request, Response } from 'express';
import type { AuthUser } from '../auth/auth.guard';

/**
 * Forwards the request to an upstream service, passing the status through.
 * The authenticated identity travels as X-User-* headers — internal services
 * trust the gateway (they are not exposed outside the compose network).
 */
export async function proxyRequest(
  request: Request & { user?: AuthUser },
  response: Response,
  baseUrl: string,
  upstreamName: string,
): Promise<void> {
  const targetPath = request.originalUrl.replace(/^\/api\/v1/, '');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (request.user) {
    headers['x-user-id'] = request.user.sub;
    headers['x-user-role'] = request.user.role;
  }
  const traceparent = request.headers.traceparent;
  if (typeof traceparent === 'string') {
    headers.traceparent = traceparent;
  }
  try {
    const upstream = await fetch(`${baseUrl}${targetPath}`, {
      method: request.method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(request.method)
        ? JSON.stringify(request.body)
        : undefined,
    });
    const body = await upstream.text();
    response.status(upstream.status).set('content-type', 'application/json').send(body);
  } catch {
    response.status(502).json({
      statusCode: 502,
      error: 'Bad Gateway',
      message: `${upstreamName} service is unreachable`,
    });
  }
}
