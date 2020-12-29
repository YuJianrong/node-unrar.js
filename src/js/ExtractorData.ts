import { DataFile } from './ExtractorData.helper';
import { ArcFile, ArcFiles, ExtractOptions, Extractor, SeekMethod } from './Extractor';

export class ExtractorData extends Extractor<Uint8Array> {
  protected _filePath: string;

  private dataFiles: {
    [filename: string]: {
      fd: number;
      file: DataFile;
    };
  };

  private dataFileMap: {
    [fileId: number]: string;
  };

  private currentFd: number;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
  constructor(unrar: any, data: ArrayBuffer, password: string) {
    super(unrar, password);
    this.dataFiles = {};
    this.dataFileMap = {};
    this.currentFd = 1;
    const rarFile = {
      file: new DataFile(new Uint8Array(data)),
      fd: this.currentFd++,
    };
    this._filePath = '_defaultUnrarJS_.rar';
    this.dataFiles[this._filePath] = rarFile;
    this.dataFileMap[rarFile.fd] = this._filePath;
  }

  public extract(options: ExtractOptions = {}): ArcFiles<Uint8Array> {
    const { arcHeader, files } = super.extract(options);

    function* getFiles(this: ExtractorData): Generator<ArcFile<Uint8Array>> {
      for (const file of files) {
        file.extraction = this.dataFiles[
          this.getExtractedFileName(file.fileHeader.name)
        ].file.readAll();
        yield file;
      }
    }

    return { arcHeader, files: getFiles.call(this) };
  }

  private getExtractedFileName(filename: string) {
    return `*Extracted*/${filename}`;
  }

  protected open(filename: string): number {
    const dataFile = this.dataFiles[filename];
    if (!dataFile) {
      return 0;
    }
    return dataFile.fd;
  }

  protected create(filename: string): number {
    const fd = this.currentFd++;
    this.dataFiles[this.getExtractedFileName(filename)] = {
      file: new DataFile(),
      fd: this.currentFd++,
    };
    this.dataFileMap[fd] = this.getExtractedFileName(filename);
    return fd;
  }

  protected closeFile(fd: number): void {
    const fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return;
    }
    fileData.file.seek(0, 'SET');
  }

  protected read(fd: number, buf: number, size: number): number {
    const fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return -1;
    }
    const data = fileData.file.read(size);
    if (data === null) {
      return -1;
    }
    this.unrar.HEAPU8.set(data, buf);
    return data.byteLength;
  }

  protected write(fd: number, buf: number, size: number): boolean {
    const fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return false;
    }
    fileData.file.write(this.unrar.HEAPU8.slice(buf, buf + size));
    return true;
  }

  protected tell(fd: number): number {
    const fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return -1;
    }
    return fileData.file.tell();
  }

  protected seek(fd: number, pos: number, method: SeekMethod): boolean {
    const fileData = this.dataFiles[this.dataFileMap[fd]];
    if (!fileData) {
      return false;
    }
    return fileData.file.seek(pos, method);
  }
}
