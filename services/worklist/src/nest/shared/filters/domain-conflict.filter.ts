import { Catch } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { ConcurrencyError } from '@radflow/ddd';
import { InvalidStateTransitionError } from '@radflow/ddd';
import { SignedByAnotherRadiologistError } from '../../../core/study/domain/study.aggregate';
import { DuplicatedAccessionNumberError } from '../../../core/study/domain/study.repository';
import { StudyNotAssignedToRadiologistError } from '../../../core/study/application/use-cases/release-study/release-study.use-case';

/** Workflow conflicts map to 409; acting on someone else's study maps to 403. */
@Catch(
  InvalidStateTransitionError,
  ConcurrencyError,
  DuplicatedAccessionNumberError,
  SignedByAnotherRadiologistError,
  StudyNotAssignedToRadiologistError,
)
export class DomainConflictFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isForbidden =
      exception instanceof StudyNotAssignedToRadiologistError ||
      exception instanceof SignedByAnotherRadiologistError;
    const statusCode = isForbidden ? 403 : 409;
    response.status(statusCode).json({
      statusCode,
      error: isForbidden ? 'Forbidden' : 'Conflict',
      message: exception.message,
    });
  }
}
