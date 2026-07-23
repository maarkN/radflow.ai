import { modalitySchema, prioritySchema, studyStatusSchema } from '@radflow/shared';
import type { Modality, Priority, StudyStatus } from '@radflow/shared';
import { LoadEntityError } from '../../../../shared/domain/validators/validation.error';
import { Study } from '../../../domain/study.aggregate';
import { RadiologistId, ReportId, StudyId } from '../../../domain/value-objects/ids.vo';
import { StudyModel } from './study.model';

export const StudyModelMapper = {
  toModel(aggregate: Study): StudyModel {
    const model = new StudyModel();
    model.studyId = aggregate.studyId.id;
    model.accessionNumber = aggregate.accessionNumber;
    model.patientName = aggregate.patientName;
    model.modality = aggregate.modality;
    model.priority = aggregate.priority;
    model.status = aggregate.status;
    model.orderedAt = aggregate.orderedAt;
    model.slaDeadline = aggregate.slaDeadline;
    model.assignedTo = aggregate.assignedTo?.id ?? null;
    model.reportId = aggregate.reportId?.id ?? null;
    model.version = aggregate.version;
    return model;
  },

  toEntity(model: StudyModel): Study {
    const enums = {
      modality: modalitySchema.safeParse(model.modality),
      priority: prioritySchema.safeParse(model.priority),
      status: studyStatusSchema.safeParse(model.status),
    };
    const enumErrors = Object.entries(enums)
      .filter(([, parsed]) => !parsed.success)
      .map(([field]) => ({ [field]: [`${field} has an invalid stored value`] }));
    if (enumErrors.length > 0) {
      throw new LoadEntityError(enumErrors);
    }

    const study = new Study({
      studyId: new StudyId(model.studyId),
      accessionNumber: model.accessionNumber,
      patientName: model.patientName,
      modality: enums.modality.data as Modality,
      priority: enums.priority.data as Priority,
      status: enums.status.data as StudyStatus,
      orderedAt: model.orderedAt,
      slaDeadline: model.slaDeadline,
      assignedTo: model.assignedTo ? new RadiologistId(model.assignedTo) : null,
      reportId: model.reportId ? new ReportId(model.reportId) : null,
      version: model.version,
    });
    study.validate();
    if (study.notification.hasErrors()) {
      throw new LoadEntityError(study.notification.toJSON());
    }
    return study;
  },
};
