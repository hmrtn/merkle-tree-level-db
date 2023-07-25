import { LevelUp, LevelUpChain } from 'levelup';
import { HashPath } from './hash_path';
import { Sha256Hasher } from './sha256_hasher';

const MAX_DEPTH = 32;
const LEAF_BYTES = 64; // All leaf values are 64 bytes.

export class MerkleTree {
  private hasher = new Sha256Hasher();
  private root = Buffer.alloc(32);

  constructor(private db: LevelUp, private name: string, private depth: number, root?: Buffer) {
    if (!(depth >= 1 && depth <= MAX_DEPTH)) {
      throw Error('Bad depth');
    }

    if (root) {
      this.root = root;
    } else {
      this.root = this.hasher.emptyHash(depth);
    }
  }

  static async new(db: LevelUp, name: string, depth = MAX_DEPTH) {
    const meta: Buffer = await db.get(Buffer.from(name)).catch(() => {});
    if (meta) {
      const root = meta.slice(0, 32);
      const depth = meta.readUInt32LE(32);
      return new MerkleTree(db, name, depth, root);
    } else {
      const tree = new MerkleTree(db, name, depth);
      await tree.writeMetaData();
      return tree;
    }
  }

  private async writeMetaData(batch?: LevelUpChain<string, Buffer>) {
    const data = Buffer.alloc(40);
    this.root.copy(data);
    data.writeUInt32LE(this.depth, 32);
    if (batch) {
      batch.put(this.name, data);
    } else {
      await this.db.put(this.name, data);
    }
  }

  getRoot() {
    return this.root;
  }

  async getHashPath(index: number): Promise<HashPath> {
    const pathData: Buffer[][] = [];
  
    let depth = 0;
    while (depth < this.depth) {
      // Calculate the sibling index
      // const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      const siblingIndex = index ^ 1; // Fancy
  
      // Read sibling hash and current node hash
      const siblingHash = await this.readNode(depth, siblingIndex);
      const nodeHash = await this.readNode(depth, index);
  
      // Add the node hash and sibling hash to the path data
      // if (index % 2 === 0) {
      if (!(index & 1)) { // Fancy
        pathData.push([nodeHash, siblingHash]);
      } else {
        pathData.push([siblingHash, nodeHash]);
      }
  
      // Move up to the next depth
      depth++;
      // index = Math.floor(index / 2);
      index >>= 1; // Fancy
    }
  
    return new HashPath(pathData);
  }

  // Read NODE
  async readNode(depth: number, index: number): Promise<Buffer> {
    const key = this.generateKey(depth, index);
    try {
      const nodeHash = await this.db.get(key.toString());
      return nodeHash;
    } catch (error) {
      return this.hasher.emptyHash(depth);
    }
  }

  // Generate Key for DB
  private generateKey(depth: number, index: number): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32LE(depth, 0);
    buffer.writeUInt32LE(index, 4);
    return this.hasher.hash(Buffer.concat([Buffer.from(this.name), buffer]));
  }

  // Write NODE
  private async writeNode(depth: number, index: number, value: Buffer, batch?: LevelUpChain<string, Buffer>) {
    if (value.length > LEAF_BYTES) {
      throw Error('Bad leaf value');
    }
    const key = this.generateKey(depth, index);
    if (batch) {
      batch.put(key.toString(), value);
    } else {
      await this.db.put(key.toString(), value);
    }
  }

  async updateElement(index: number, value: Buffer): Promise<Buffer> {
    let hashValue = this.hasher.hash(value);
    await this.writeNode(0, index, hashValue);
  
    let depth = 1;
    while (depth <= this.depth) {
      // Calculate the sibling index
      // const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      const siblingIndex = index ^ 1; // Fancy
  
      // Read sibling hash
      const siblingHash = await this.readNode(depth - 1, siblingIndex);
  
      // Hash the updated value with the sibling hash to get the parent hash
      // if (index % 2 === 0) {
      if (!(index & 1)) { // Fancy
        hashValue = this.hasher.compress(hashValue, siblingHash);
      } else {
        hashValue = this.hasher.compress(siblingHash, hashValue);
      }
  
      // Write the new hash to the parent node
      await this.writeNode(
        depth, 
        // Math.floor(index / 2), 
        index >> 1, // Fancy
        hashValue
      );
  
      // Move up to the next depth
      depth++;
      // index = Math.floor(index / 2);
      index >>= 1; // Fancy
    }
  
    // Update root
    this.root = hashValue;
    await this.writeMetaData();
  
    // Return the new root
    return this.root;
  }
}

// index ^ 1: 
// This operation is the bitwise XOR of the index with 1. It gives true (or 1) if the number of true inputs is odd. For a binary number, XORing it with 1 flips the least significant bit (LSB). When index is an integer, the LSB is the same as the parity of the number (even or odd). So this operation is the same as getting the sibling index in a binary tree (if index is even, the sibling index is index+1, if index is odd, the sibling index is index-1).
//
// EXAMPLE:
// Here, we're taking the bitwise XOR of the index with 1. Here's how that works:
// Binary representation of 12 is 00001100.
// Binary representation of 1 is 00000001.
// Now, we XOR them:
//
// 00001100
// 00000001
// --------
// 00001101
//
// The result is 00001101, which is 13 in decimal.


// !(index & 1): 
// This operation is the bitwise AND of the index with 1 followed by logical NOT. Bitwise AND with 1 effectively checks if a number is odd (it checks if the least significant bit is set). Then the logical NOT flips the result. So the expression !(index & 1) is true if the index is even, and false if the index is odd. This is equivalent to index % 2 === 0.
//
// EXAMPLE:
// Here, we're taking the bitwise AND of the index with 1, and then applying a logical NOT. Here's how that works:
// Binary representation of 12 is 00001100.
// Binary representation of 1 is 00000001.
// Now, we AND them:
//
// 00001100
// 00000001
// --------
// 00000000
//
// The result is 00000000, which is 0 in decimal. Now, when we apply logical NOT to 0, we get 1 (true), because 12 is an even number.


// index >>= 1: 
// This operation is the bitwise right shift of the index. It moves all bits in the binary representation of the index one place to the right, effectively discarding the least significant bit (LSB) and inserting a 0 on the left. This is equivalent to integer division by 2 (index = Math.floor(index / 2)). The >>= is an assignment operator that changes the value of index in-place.
//
// EXAMPLE:
// Here, we're performing a bitwise right shift operation on the index.
// Binary representation of 12 is 00001100.
// After right shifting by 1:
// 00001100 >> 1 = 00000110
// The result is 00000110, which is 6 in decimal.
