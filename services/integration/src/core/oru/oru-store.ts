export type StoredOru = {
  accessionNumber: string;
  studyId: string;
  message: string;
  emittedAt: Date;
};

/** In-memory ring buffer with the last emitted ORU messages (demo/debug aid). */
export class OruStore {
  private items: StoredOru[] = [];

  constructor(private readonly capacity = 100) {}

  add(item: StoredOru): void {
    this.items.push(item);
    if (this.items.length > this.capacity) {
      this.items.shift();
    }
  }

  list(): readonly StoredOru[] {
    return [...this.items].reverse();
  }

  findByAccession(accessionNumber: string): StoredOru | null {
    return this.items.findLast((item) => item.accessionNumber === accessionNumber) ?? null;
  }
}
