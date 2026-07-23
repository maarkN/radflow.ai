import { IsNotEmpty, MaxLength } from 'class-validator';
import { ClassValidatorFields } from '../../shared/domain/validators/class-validator-fields';
import type { Notification } from '../../shared/domain/notification';
import type { Study } from './study.aggregate';

export class StudyRules {
  @MaxLength(64, { groups: ['accessionNumber'] })
  @IsNotEmpty({ groups: ['accessionNumber'] })
  accessionNumber: string;

  @MaxLength(255, { groups: ['patientName'] })
  @IsNotEmpty({ groups: ['patientName'] })
  patientName: string;

  constructor(aggregate: Study) {
    this.accessionNumber = aggregate.accessionNumber;
    this.patientName = aggregate.patientName;
  }
}

export class StudyValidator extends ClassValidatorFields {
  override validate(notification: Notification, data: Study, fields?: string[]): boolean {
    const checkedFields = fields?.length ? fields : ['accessionNumber', 'patientName'];
    return super.validate(notification, new StudyRules(data), checkedFields);
  }
}

export const StudyValidatorFactory = {
  create(): StudyValidator {
    return new StudyValidator();
  },
};
