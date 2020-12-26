import * as fs from "fs";
import * as path from "path";

import { Extractor, SeekMethod } from "./extractor";
import unrar from "./unrarSingleton";

export class FileExtractor extends Extractor {
  protected _filePath: string;
  private _target: string;
  private fileMap: {
    [fd: number]: {
      size: number;
      pos: number;
      name: string;
    },
  };
  constructor(filepath: string, targetPath: string, password: string) {
    super(password);
    this._filePath = filepath;
    this.fileMap = {};
    this._target = targetPath;
  }
  protected open(filename: string): number {
    let fd = fs.openSync(filename, "r");
    this.fileMap[fd] = {
      size: fs.fstatSync(fd).size,
      pos: 0,
      name: filename,
    };
    return fd;
  }
  protected create(filename: string): number {
    let fullpath = path.join(this._target, filename);
    let dir = path.parse(fullpath).dir;
    dir
      .split("/")
      .reduce((path, folder) => {
        path += folder + "/";
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path);
        }
        return path;
      }, "");

    let fd = fs.openSync(fullpath, "w");
    this.fileMap[fd] = {
      size: 0,
      pos: 0,
      name: filename,
    };
    return fd;
  }
  protected closeFile(fd: number): Uint8Array | null {
    delete this.fileMap[fd];
    fs.closeSync(fd);
    return null;
  }
  protected read(fd: number, buf: any, size: number): number {
    let file = this.fileMap[fd];
    let buffer = new Buffer(size);
    let readed = fs.readSync(fd, buffer, 0, size, file.pos);
    unrar.HEAPU8.set(buffer, buf);
    file.pos += readed;
    return readed;
  }
  protected write(fd: number, buf: any, size: number): boolean {
    let file = this.fileMap[fd];
    let writeNum = fs.writeSync(fd, new Buffer(unrar.HEAPU8.subarray(buf, buf + size)), 0 , size);
    file.pos += writeNum;
    file.size += writeNum;
    return writeNum === size;
  }
  protected tell(fd: number): number {
    return this.fileMap[fd].pos;
  }
  protected seek(fd: number, pos: number, method: SeekMethod): boolean {
    let file = this.fileMap[fd];
    let newPos = file.pos;
    if (method === "SET") {
      newPos = 0;
    } else if (method === "END") {
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
