import { isDeepStrictEqual } from 'node:util';

export abstract class ValueObject {
  equals(vo: this | null | undefined): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.constructor.name !== this.constructor.name) {
      return false;
    }
    return isDeepStrictEqual(vo, this);
  }
}
