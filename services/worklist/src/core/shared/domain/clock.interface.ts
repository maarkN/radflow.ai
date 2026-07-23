export interface IClock {
  now(): Date;
}

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements IClock {
  constructor(private readonly fixedAt: Date) {}

  now(): Date {
    return this.fixedAt;
  }
}
