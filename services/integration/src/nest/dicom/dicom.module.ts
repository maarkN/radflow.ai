import { Controller, Get, Inject, Module, NotFoundException, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildOhifViewerUrl, OrthancClient } from '../../core/dicom/orthanc-client';
import type { EnvDto } from '../../config/env.dto';

/** Bridges worklist accession numbers to DICOM studies stored in Orthanc. */
@Controller('dicom')
export class DicomController {
  constructor(
    @Inject(OrthancClient) private readonly orthanc: OrthancClient,
    @Inject(ConfigService) private readonly config: ConfigService<EnvDto, true>,
  ) {}

  @Get('studies/:accessionNumber')
  async findByAccession(@Param('accessionNumber') accessionNumber: string) {
    const study = await this.orthanc.findStudyByAccession(accessionNumber);
    if (!study) {
      throw new NotFoundException(`No DICOM study found for accession ${accessionNumber}`);
    }
    return {
      data: {
        accessionNumber,
        studyInstanceUid: study.studyInstanceUid,
        viewerUrl: buildOhifViewerUrl(
          this.config.get('ORTHANC_PUBLIC_URL', { infer: true }),
          study.studyInstanceUid,
        ),
      },
    };
  }
}

@Module({
  controllers: [DicomController],
  providers: [
    {
      provide: OrthancClient,
      useFactory: (config: ConfigService<EnvDto, true>) =>
        new OrthancClient(config.get('ORTHANC_URL', { infer: true })),
      inject: [ConfigService],
    },
  ],
  exports: [OrthancClient],
})
export class DicomModule {}
