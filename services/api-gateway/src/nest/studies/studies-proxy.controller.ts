import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { EnvDto } from '../../config/env.dto';

/**
 * Thin BFF proxy to the worklist service. Auth/RBAC will be enforced here in
 * epic 4; for now the gateway forwards requests and normalizes errors.
 */
@Controller('studies')
export class StudiesProxyController {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  @All(['', ':id/claim', ':id/release'])
  async forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    const baseUrl = this.config.get('WORKLIST_URL', { infer: true });
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
      response
        .status(upstream.status)
        .set('content-type', 'application/json')
        .send(body);
    } catch {
      response.status(502).json({
        statusCode: 502,
        error: 'Bad Gateway',
        message: 'worklist service is unreachable',
      });
    }
  }
}
