import { faker } from '@faker-js/faker';
import type { Modality, Priority, StudyStatus } from '@radflow/shared';
import { SlaPolicy } from './sla-policy';
import { Study } from './study.aggregate';
import { RadiologistId, ReportId, StudyId } from './value-objects/ids.vo';

type PropOrFactory<T> = T | ((index: number) => T);

export class StudyFakeBuilder {
  private _studyId: PropOrFactory<StudyId> = () => new StudyId();
  private _accessionNumber: PropOrFactory<string> = (index) =>
    `ACC-${faker.string.numeric(6)}-${index}`;
  private _patientName: PropOrFactory<string> = () => faker.person.fullName();
  private _modality: PropOrFactory<Modality> = () =>
    faker.helpers.arrayElement(['CT', 'MR', 'CR', 'US'] as const);
  private _priority: PropOrFactory<Priority> = () =>
    faker.helpers.arrayElement(['stat', 'urgent', 'routine'] as const);
  private _status: PropOrFactory<StudyStatus> = 'unread';
  private _orderedAt: PropOrFactory<Date> = () => faker.date.recent({ days: 1 });
  private _slaDeadline: PropOrFactory<Date> | null = null;
  private _assignedTo: PropOrFactory<RadiologistId> | null = null;
  private _reportId: PropOrFactory<ReportId> | null = null;

  private readonly countObjs: number;

  private constructor(countObjs = 1) {
    this.countObjs = countObjs;
  }

  static aStudy(): StudyFakeBuilder {
    return new StudyFakeBuilder();
  }

  static theStudies(countObjs: number): StudyFakeBuilder {
    return new StudyFakeBuilder(countObjs);
  }

  withStudyId(value: PropOrFactory<StudyId>): this {
    this._studyId = value;
    return this;
  }

  withAccessionNumber(value: PropOrFactory<string>): this {
    this._accessionNumber = value;
    return this;
  }

  withPatientName(value: PropOrFactory<string>): this {
    this._patientName = value;
    return this;
  }

  withModality(value: PropOrFactory<Modality>): this {
    this._modality = value;
    return this;
  }

  withPriority(value: PropOrFactory<Priority>): this {
    this._priority = value;
    return this;
  }

  stat(): this {
    return this.withPriority('stat');
  }

  urgent(): this {
    return this.withPriority('urgent');
  }

  routine(): this {
    return this.withPriority('routine');
  }

  withOrderedAt(value: PropOrFactory<Date>): this {
    this._orderedAt = value;
    return this;
  }

  withSlaDeadline(value: PropOrFactory<Date>): this {
    this._slaDeadline = value;
    return this;
  }

  claimedBy(radiologistId?: RadiologistId): this {
    this._status = 'in_progress';
    this._assignedTo = radiologistId ?? new RadiologistId();
    return this;
  }

  dictated(reportId?: ReportId): this {
    this.claimedBy(this._assignedTo instanceof RadiologistId ? this._assignedTo : undefined);
    this._status = 'dictated';
    this._reportId = reportId ?? new ReportId();
    return this;
  }

  withInvalidAccessionNumberTooLong(): this {
    return this.withAccessionNumber('A'.repeat(65));
  }

  withInvalidPatientNameEmpty(): this {
    return this.withPatientName('');
  }

  build(): Study {
    return this.buildMany()[0]!;
  }

  buildMany(): Study[] {
    return Array.from({ length: this.countObjs }, (_, index) => {
      const orderedAt = this.callFactory(this._orderedAt, index);
      const priority = this.callFactory(this._priority, index);
      const study = new Study({
        studyId: this.callFactory(this._studyId, index),
        accessionNumber: this.callFactory(this._accessionNumber, index),
        patientName: this.callFactory(this._patientName, index),
        modality: this.callFactory(this._modality, index),
        priority,
        status: this.callFactory(this._status, index),
        orderedAt,
        slaDeadline: this._slaDeadline
          ? this.callFactory(this._slaDeadline, index)
          : SlaPolicy.deadlineFor(priority, orderedAt),
        assignedTo: this._assignedTo ? this.callFactory(this._assignedTo, index) : null,
        reportId: this._reportId ? this.callFactory(this._reportId, index) : null,
      });
      study.validate();
      return study;
    });
  }

  private callFactory<T>(factoryOrValue: PropOrFactory<T>, index: number): T {
    return typeof factoryOrValue === 'function'
      ? (factoryOrValue as (index: number) => T)(index)
      : factoryOrValue;
  }
}
