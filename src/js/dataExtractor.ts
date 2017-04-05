import {DataFile} from "./dataFile";
import {Extractor, SeekMethod} from "./extractor";
import * as unrar from "./unrar";

export class DataExtractor extends Extractor {
  protected _filePath: string;
  private dataFiles: {
    [filename: string]: {
      fd: number;
      file: DataFile;
    },
  };
  private dataFileMap: {
    [fileId: number]: string;
  };
  private currentFd: number;
  constructor(data: ArrayBuffer, password: string) {
    super(password);
    this.dataFiles = {};
    this.dataFileMap = {};
    this.currentFd = 1;
    let rarFile = {
      file: new DataFile(new Uint8Array(data)),
      fd: this.currentFd++,
    };
    this._filePath = "_defaultUnrarJS_.rar";
    this.dataFiles[this._filePath] = rarFile;
    this.dataFileMap[rarFile.fd] = this._filePath;
  }
  protected open(filename: string): number {
    let dataFile = this.dataFiles[filename];
    if (!dataFile) {
      return 0;
    }
    return dataFile.fd;
  }
  protected create(filename: string): number {
    let fd = this.currentFd++;
    this.dataFiles[filename] = {
      file: new DataFile(),
      fd: this.currentFd++,
    };
    this.dataFileMap[fd] = filename;
    return fd;
  }
  protected closeFile(fd: number): Uint8Array | null {
    let fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return null;
    }
    return fileData.file.readAll();
  }
  protected read(fd: number, buf: any, size: number): number {
    let fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return -1;
    }
    let data = fileData.file.read(size);
    if (data === null) {
      return -1;
    }
    unrar.HEAP8.set(data, buf);
    return data.byteLength;
  }
  protected write(fd: number, buf: any, size: number): boolean {
    let fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return false;
    }
    fileData.file.write(unrar.HEAP8.slice(buf, buf + size));
    return true;
  }
  protected tell(fd: number): number {
    let fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return -1;
    }
    return fileData.file.tell();
  }
  protected seek(fd: number, pos: number, method: SeekMethod): boolean {
    let fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return false;
    }
    return fileData.file.seek(pos, method);
  }
}
