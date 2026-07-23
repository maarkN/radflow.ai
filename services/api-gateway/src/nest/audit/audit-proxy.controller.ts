import { Controller, Get, Inject, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';
import type { EnvDto } from '../../config/env.dto';

/** Admin-only view over the per-service append-only audit trails. */
@Controller('audit')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AuditProxyController {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>) {}

  @Get(':service')
  async forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    const bases: Record<string, string> = {
      worklist: this.config.get('WORKLIST_URL', { infer: true }),
      dictation: this.config.get('DICTATION_URL', { infer: true }),
    };
    const service = request.params.service;
    const base = typeof service === 'string' ? bases[service] : undefined;
    if (!base) {
      response
        .status(404)
        .json({ statusCode: 404, error: 'Not Found', message: 'unknown audit source' });
      return;
    }
    try {
      const upstream = await fetch(`${base}/audit`);
      response
        .status(upstream.status)
        .set('content-type', 'application/json')
        .send(await upstream.text());
    } catch {
      response
        .status(502)
        .json({ statusCode: 502, error: 'Bad Gateway', message: 'audit source unreachable' });
    }
  }
}
