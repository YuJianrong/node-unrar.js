import { SeekMethod } from './Extractor';

export class DataFile {
  private buffers: Uint8Array[];
  private size: number;
  private pos: number;
  constructor(data?: Uint8Array) {
    this.buffers = [];
    this.pos = 0;
    this.size = 0;
    if (data) {
      this.buffers.push(data);
      this.size = data.byteLength;
      this.pos = 0;
    }
  }
  public read(size: number): Uint8Array | null {
    this.flatten();
    if (size + this.pos > this.size) {
      // size = this.size - this.pos;
      return null;
    }
    const oldPos = this.pos;
    this.pos += size;
    // return this.buffers[0].subarray(oldPos, this.pos);
    return this.buffers[0].slice(oldPos, this.pos);
  }
  public readAll(): Uint8Array {
    this.flatten();
    return this.buffers[0] || new Uint8Array();
  }
  public write(data: Uint8Array): boolean {
    this.buffers.push(data);
    this.size += data.byteLength;
    this.pos += data.byteLength;
    return true;
  }
  public tell(): number {
    return this.pos;
  }
  public seek(pos: number, method: SeekMethod): boolean {
    let newPos = this.pos;
    if (method === 'SET') {
      newPos = pos;
    } else if (method === 'CUR') {
      newPos += pos;
    } else {
      newPos = this.size - pos;
    }
    if (newPos < 0 || newPos > this.size) {
      return false;
    }
    this.pos = newPos;
    return true;
  }
  private flatten(): void {
    if (this.buffers.length <= 1) {
      return;
    }
    const newBuffer = new Uint8Array(this.size);
    let offset = 0;
    for (const buffer of this.buffers) {
      newBuffer.set(buffer, offset);
      offset += buffer.byteLength;
    }
    this.buffers = [newBuffer];
  }
}
