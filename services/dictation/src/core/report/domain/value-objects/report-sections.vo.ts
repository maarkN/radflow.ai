import { ValueObject } from '@radflow/ddd';

export type ReportSectionsProps = {
  technique: string;
  findings: string;
  impression: string;
};

/** Immutable report body; edits produce a new instance. */
export class ReportSections extends ValueObject {
  readonly technique: string;
  readonly findings: string;
  readonly impression: string;

  constructor(props: ReportSectionsProps) {
    super();
    this.technique = props.technique;
    this.findings = props.findings;
    this.impression = props.impression;
  }

  withEdits(edits: Partial<ReportSectionsProps>): ReportSections {
    return new ReportSections({
      technique: edits.technique ?? this.technique,
      findings: edits.findings ?? this.findings,
      impression: edits.impression ?? this.impression,
    });
  }

  toJSON(): ReportSectionsProps {
    return {
      technique: this.technique,
      findings: this.findings,
      impression: this.impression,
    };
  }
}
