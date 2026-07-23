import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { proxyRequest } from '../shared/proxy';
import type { EnvDto } from '../../config/env.dto';

/** Proxies the DICOM bridge (accession -> OHIF viewer URL) of the integration service. */
@Controller('dicom')
export class DicomProxyController {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  @All('studies/:accessionNumber')
  async forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    await proxyRequest(
      request,
      response,
      this.config.get('INTEGRATION_URL', { infer: true }),
      'integration',
    );
  }
}

/** Proxies the HL7 inspection endpoints (emitted ORU) of the integration service. */
@Controller('hl7')
export class Hl7ProxyController {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  @All(['oru', 'oru/:accessionNumber'])
  async forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    await proxyRequest(
      request,
      response,
      this.config.get('INTEGRATION_URL', { infer: true }),
      'integration',
    );
  }
}
