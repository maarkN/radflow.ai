import type { Request, Response } from 'express';

/** Forwards the request to an upstream service, passing the status through. */
export async function proxyRequest(
  request: Request,
  response: Response,
  baseUrl: string,
  upstreamName: string,
): Promise<void> {
  const targetPath = request.originalUrl.replace(/^\/api\/v1/, '');
  try {
    const upstream = await fetch(`${baseUrl}${targetPath}`, {
      method: request.method,
      headers: { 'content-type': 'application/json' },
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
