import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ClaimStudyUseCase } from '../../core/study/application/use-cases/claim-study/claim-study.use-case';
import { CreateStudyUseCase } from '../../core/study/application/use-cases/create-study/create-study.use-case';
import { GetStudyUseCase } from '../../core/study/application/use-cases/get-study/get-study.use-case';
import { ListStudiesUseCase } from '../../core/study/application/use-cases/list-studies/list-studies.use-case';
import { MarkDictatedUseCase } from '../../core/study/application/use-cases/mark-dictated/mark-dictated.use-case';
import { ReleaseStudyUseCase } from '../../core/study/application/use-cases/release-study/release-study.use-case';
import { SignStudyUseCase } from '../../core/study/application/use-cases/sign-study/sign-study.use-case';
import type {
  IWorklistStatsQuery,
  WorklistStats,
} from '../../core/study/application/queries/worklist-stats.query';
import { ClaimStudyRequestDto } from './dto/claim-study.request.dto';
import { CreateStudyRequestDto } from './dto/create-study.request.dto';
import { MarkDictatedRequestDto } from './dto/mark-dictated.request.dto';
import { SearchStudiesRequestDto } from './dto/search-studies.request.dto';
import { SignStudyRequestDto } from './dto/sign-study.request.dto';
import { StudyCollectionPresenter, StudyPresenter } from './studies.presenter';

@Controller('studies')
export class StudiesController {
  constructor(
    @Inject(CreateStudyUseCase) private readonly createStudy: CreateStudyUseCase,
    @Inject(ClaimStudyUseCase) private readonly claimStudy: ClaimStudyUseCase,
    @Inject(ReleaseStudyUseCase) private readonly releaseStudy: ReleaseStudyUseCase,
    @Inject(ListStudiesUseCase) private readonly listStudies: ListStudiesUseCase,
    @Inject(GetStudyUseCase) private readonly getStudy: GetStudyUseCase,
    @Inject(MarkDictatedUseCase) private readonly markDictated: MarkDictatedUseCase,
    @Inject(SignStudyUseCase) private readonly signStudy: SignStudyUseCase,
    @Inject('WorklistStatsQuery') private readonly worklistStats: IWorklistStatsQuery,
  ) {}

  // O interceptor global já envelopa em {data} — devolver o objeto cru.
  @Get('stats')
  stats(): Promise<WorklistStats> {
    return this.worklistStats.execute();
  }

  @Post(':id/dictate')
  @HttpCode(200)
  async dictate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkDictatedRequestDto,
  ): Promise<StudyPresenter> {
    const output = await this.markDictated.execute({
      studyId: id,
      reportId: dto.reportId,
      radiologistId: dto.radiologistId,
    });
    return new StudyPresenter(output);
  }

  @Post(':id/sign')
  @HttpCode(200)
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignStudyRequestDto,
  ): Promise<StudyPresenter> {
    const output = await this.signStudy.execute({
      studyId: id,
      radiologistId: dto.radiologistId,
      contentHash: dto.contentHash,
    });
    return new StudyPresenter(output);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StudyPresenter> {
    const output = await this.getStudy.execute({ studyId: id });
    return new StudyPresenter(output);
  }

  @Post()
  async create(@Body() dto: CreateStudyRequestDto): Promise<StudyPresenter> {
    const output = await this.createStudy.execute({
      accessionNumber: dto.accessionNumber,
      patientName: dto.patientName,
      modality: dto.modality,
      priority: dto.priority,
      orderedAt: dto.orderedAt ? new Date(dto.orderedAt) : undefined,
    });
    return new StudyPresenter(output.study);
  }

  @Get()
  async search(@Query() dto: SearchStudiesRequestDto): Promise<StudyCollectionPresenter> {
    const output = await this.listStudies.execute({
      page: dto.page,
      perPage: dto.perPage,
      sort: dto.sort,
      sortDir: dto.sortDir,
      filter: {
        status: dto.status,
        modality: dto.modality,
        priority: dto.priority,
        assignedTo: dto.assignedTo,
      },
    });
    return new StudyCollectionPresenter(output);
  }

  @Post(':id/claim')
  @HttpCode(200)
  async claim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaimStudyRequestDto,
  ): Promise<StudyPresenter> {
    const output = await this.claimStudy.execute({
      studyId: id,
      radiologistId: dto.radiologistId,
    });
    return new StudyPresenter(output);
  }

  @Post(':id/release')
  @HttpCode(200)
  async release(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaimStudyRequestDto,
  ): Promise<StudyPresenter> {
    const output = await this.releaseStudy.execute({
      studyId: id,
      radiologistId: dto.radiologistId,
    });
    return new StudyPresenter(output);
  }
}
