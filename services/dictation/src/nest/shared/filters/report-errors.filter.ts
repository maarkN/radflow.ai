import { Catch } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { ConcurrencyError, InvalidStateTransitionError, NotFoundError } from '@radflow/ddd';
import { DraftClientError } from '../../../core/report/application/ports/draft-client.interface';
import { WorklistClientError } from '../../../core/report/application/ports/worklist-client.interface';
import { TranscriptMissingError } from '../../../core/report/application/use-cases/generate-draft/generate-draft.use-case';
import {
  ReportAlreadySignedError,
  ReportNotReadyToSignError,
} from '../../../core/report/domain/report.aggregate';

@Catch(NotFoundError)
export class NotFoundErrorFilter implements ExceptionFilter {
  catch(exception: NotFoundError, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(404)
      .json({ statusCode: 404, error: 'Not Found', message: exception.message });
  }
}

/** Workflow conflicts (immutability, missing preconditions, concurrent edits) map to 409. */
@Catch(
  ReportAlreadySignedError,
  ReportNotReadyToSignError,
  TranscriptMissingError,
  InvalidStateTransitionError,
  ConcurrencyError,
)
export class ReportConflictFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(409)
      .json({ statusCode: 409, error: 'Conflict', message: exception.message });
  }
}

/** Upstream services (report-ai, worklist) failing map to 502 with the reason. */
@Catch(DraftClientError, WorklistClientError)
export class UpstreamErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(502)
      .json({ statusCode: 502, error: 'Bad Gateway', message: exception.message });
  }
}
