import { createHash } from 'crypto';

export class Sha256Hasher {
  /////////////////////////////////////////////////////////
  private emptyHashCache: Buffer[] = [];
  constructor() {
    this.emptyHashCache.push(this.hash(Buffer.alloc(64, 0)));
  }
  emptyHash(depth: number): Buffer {
    while (depth >= this.emptyHashCache.length - 1) {
      const child = this.emptyHashCache[this.emptyHashCache.length - 1];
      const hash = this.compress(
        child, 
        child,
      );
      this.emptyHashCache.push(hash);
    }

    return this.emptyHashCache[depth];
  }
  /////////////////////////////////////////////////////////
  compress(lhs: Buffer, rhs: Buffer): Buffer {
    return createHash('sha256')
      .update(Buffer.concat([lhs, rhs]))
      .digest();
  }
  hash(data: Buffer): Buffer {
    return createHash('sha256').update(data).digest();
  }
}
