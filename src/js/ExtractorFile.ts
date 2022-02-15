import * as fs from 'fs';
import * as path from 'path';

import { Extractor, SeekMethod } from './Extractor';

export class ExtractorFile extends Extractor {
  protected _filePath: string;
  private _target: string;
  private fileMap: {
    [fd: number]: {
      size: number;
      pos: number;
      name: string;
    };
  };

  constructor(
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
    unrar: any,
    filepath: string,
    targetPath: string,
    password: string,
    private filenameTransform: (filename: string) => string,
  ) {
    super(unrar, password);
    this._filePath = filepath;
    this.fileMap = {};
    this._target = targetPath;
  }

  protected open(filename: string): number {
    const fd = fs.openSync(filename, 'r');
    this.fileMap[fd] = {
      size: fs.fstatSync(fd).size,
      pos: 0,
      name: filename,
    };
    return fd;
  }

  protected create(filename: string): number {
    const fullpath = path.join(this._target, this.filenameTransform(filename));
    const dir = path.parse(fullpath).dir;
    fs.mkdirSync(dir, { recursive: true });

    const fd = fs.openSync(fullpath, 'w');
    this.fileMap[fd] = {
      size: 0,
      pos: 0,
      name: filename,
    };
    return fd;
  }

  protected closeFile(fd: number): void {
    delete this.fileMap[fd];
    fs.closeSync(fd);
  }

  protected read(fd: number, buf: number, size: number): number {
    const file = this.fileMap[fd];
    const buffer = Buffer.allocUnsafe(size);
    const readed = fs.readSync(fd, buffer, 0, size, file.pos);
    this.unrar.HEAPU8.set(buffer, buf);
    file.pos += readed;
    return readed;
  }

  protected write(fd: number, buf: number, size: number): boolean {
    const file = this.fileMap[fd];
    const writeNum = fs.writeSync(
      fd,
      Buffer.from(this.unrar.HEAPU8.subarray(buf, buf + size)),
      0,
      size,
    );
    file.pos += writeNum;
    file.size += writeNum;
    return writeNum === size;
  }

  protected tell(fd: number): number {
    return this.fileMap[fd].pos;
  }

  protected seek(fd: number, pos: number, method: SeekMethod): boolean {
    const file = this.fileMap[fd];
    let newPos = file.pos;
    if (method === 'SET') {
      newPos = 0;
    } else if (method === 'END') {
      newPos = file.size;
    }
    newPos += pos;
    if (newPos < 0 || newPos > file.size) {
      return false;
    }
    file.pos = newPos;
    return true;
  }
}
