import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { proxyRequest } from '../shared/proxy';
import type { EnvDto } from '../../config/env.dto';

/** Proxies the report/dictation API of the dictation service. */
@Controller('reports')
export class ReportsProxyController {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  @All(['', ':id/transcript', ':id/draft', ':id/sign', ':id'])
  async forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    await proxyRequest(
      request,
      response,
      this.config.get('DICTATION_URL', { infer: true }),
      'dictation',
    );
  }
}
