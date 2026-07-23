import { All, Controller, Get, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { JwtAuthGuard, Roles } from '../auth/auth.guard';
import { proxyRequest } from '../shared/proxy';
import type { EnvDto } from '../../config/env.dto';

/**
 * BFF proxy to the worklist service with RBAC:
 * reading is open to any authenticated role; creating studies is for
 * technologists/admin; claiming and releasing is radiologist work.
 */
@Controller('studies')
@UseGuards(JwtAuthGuard)
export class StudiesProxyController {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  private forward(request: Request, response: Response): Promise<void> {
    return proxyRequest(
      request,
      response,
      this.config.get('WORKLIST_URL', { infer: true }),
      'worklist',
    );
  }

  @Get()
  async list(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.forward(request, response);
  }

  @Get(':id')
  async findOne(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.forward(request, response);
  }

  @Post()
  @Roles('technologist', 'admin')
  async create(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.forward(request, response);
  }

  @All([':id/claim', ':id/release'])
  @Roles('radiologist')
  async workflow(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.forward(request, response);
  }
}
