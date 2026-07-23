import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AttachTranscriptUseCase } from '../../core/report/application/use-cases/attach-transcript/attach-transcript.use-case';
import { GenerateDraftUseCase } from '../../core/report/application/use-cases/generate-draft/generate-draft.use-case';
import { GetReportUseCase } from '../../core/report/application/use-cases/get-report/get-report.use-case';
import { SignReportUseCase } from '../../core/report/application/use-cases/sign-report/sign-report.use-case';
import { StartReportUseCase } from '../../core/report/application/use-cases/start-report/start-report.use-case';
import { UpdateReportUseCase } from '../../core/report/application/use-cases/update-report/update-report.use-case';
import type { ReportOutput } from '../../core/report/application/use-cases/common/report-output';
import {
  AttachTranscriptRequestDto,
  SignReportRequestDto,
  StartReportRequestDto,
  UpdateReportRequestDto,
} from './dto/reports.request.dtos';

@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(StartReportUseCase) private readonly startReport: StartReportUseCase,
    @Inject(AttachTranscriptUseCase) private readonly attachTranscript: AttachTranscriptUseCase,
    @Inject(GenerateDraftUseCase) private readonly generateDraft: GenerateDraftUseCase,
    @Inject(UpdateReportUseCase) private readonly updateReport: UpdateReportUseCase,
    @Inject(SignReportUseCase) private readonly signReport: SignReportUseCase,
    @Inject(GetReportUseCase) private readonly getReport: GetReportUseCase,
  ) {}

  @Post()
  async start(@Body() dto: StartReportRequestDto): Promise<ReportOutput> {
    return this.startReport.execute({ studyId: dto.studyId, radiologistId: dto.radiologistId });
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ReportOutput> {
    return this.getReport.execute({ reportId: id });
  }

  @Get()
  async findByStudy(@Query('studyId', ParseUUIDPipe) studyId: string): Promise<ReportOutput> {
    return this.getReport.execute({ studyId });
  }

  @Put(':id/transcript')
  async transcript(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachTranscriptRequestDto,
  ): Promise<ReportOutput> {
    return this.attachTranscript.execute({ reportId: id, transcript: dto.transcript });
  }

  @Post(':id/draft')
  @HttpCode(200)
  async draft(@Param('id', ParseUUIDPipe) id: string): Promise<ReportOutput> {
    return this.generateDraft.execute({ reportId: id });
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportRequestDto,
  ): Promise<ReportOutput> {
    return this.updateReport.execute({ reportId: id, sections: dto.sections });
  }

  @Post(':id/sign')
  @HttpCode(200)
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignReportRequestDto,
  ): Promise<ReportOutput> {
    return this.signReport.execute({ reportId: id, radiologistId: dto.radiologistId });
  }
}
