import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { proxyRequest } from '../shared/proxy';
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

  @All(['', ':id/claim', ':id/release', ':id'])
  async forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    await proxyRequest(
      request,
      response,
      this.config.get('WORKLIST_URL', { infer: true }),
      'worklist',
    );
  }
}
