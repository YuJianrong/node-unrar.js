/* eslint-disable @typescript-eslint/no-explicit-any */
export type SeekMethod = 'CUR' | 'SET' | 'END';

const ERROR_CODE = {
  0: 'ERAR_SUCCESS',
  10: 'ERAR_END_ARCHIVE',
  11: 'ERAR_NO_MEMORY',
  12: 'ERAR_BAD_DATA',
  13: 'ERAR_BAD_ARCHIVE',
  14: 'ERAR_UNKNOWN_FORMAT',
  15: 'ERAR_EOPEN',
  16: 'ERAR_ECREATE',
  17: 'ERAR_ECLOSE',
  18: 'ERAR_EREAD',
  19: 'ERAR_EWRITE',
  20: 'ERAR_SMALL_BUF',
  21: 'ERAR_UNKNOWN',
  22: 'ERAR_MISSING_PASSWORD',
  23: 'ERAR_EREFERENCE',
  24: 'ERAR_BAD_PASSWORD',
} as const;

export type FailReason = Exclude<
  (typeof ERROR_CODE)[keyof typeof ERROR_CODE],
  'ERAR_SUCCESS' | 'ERAR_END_ARCHIVE'
>;

const ERROR_MSG: { [k in FailReason]: string } = {
  ERAR_NO_MEMORY: 'Not enough memory',
  ERAR_BAD_DATA: 'Archive header or data are damaged',
  ERAR_BAD_ARCHIVE: 'File is not RAR archive',
  ERAR_UNKNOWN_FORMAT: 'Unknown archive format',
  ERAR_EOPEN: 'File open error',
  ERAR_ECREATE: 'File create error',
  ERAR_ECLOSE: 'File close error',
  ERAR_EREAD: 'File read error',
  ERAR_EWRITE: 'File write error',
  ERAR_SMALL_BUF: 'Buffer for archive comment is too small, comment truncated',
  ERAR_UNKNOWN: 'Unknown error',
  ERAR_MISSING_PASSWORD: 'Password for encrypted file or header is not specified',
  ERAR_EREFERENCE: 'Cannot open file source for reference record',
  ERAR_BAD_PASSWORD: 'Wrong password is specified',
};

export class UnrarError extends Error {
  constructor(
    public reason: FailReason,
    message: string,
    public file?: string,
  ) {
    super(message);
  }
}

export type CompressMethod =
  | 'Storing'
  | 'Fastest'
  | 'Fast'
  | 'Normal'
  | 'Good'
  | 'Best'
  | 'Unknown';

export interface FileHeader {
  name: string;
  flags: {
    encrypted: boolean;
    solid: boolean;
    directory: boolean;
  };
  packSize: number;
  unpSize: number;
  // hostOS: "MSDOS" | "OS/2" | "Win32" | "Unix",
  crc: number;
  time: string;
  unpVer: string;
  method: CompressMethod;
  comment: string;
  // fileAttr: number;
}

export interface ArcHeader {
  comment: string;
  flags: {
    volume: boolean;
    lock: boolean;
    solid: boolean;
    authInfo: boolean;
    recoveryRecord: boolean;
    headerEncrypted: boolean;
  };
  // files: FileHeader[];
}

export interface ArcList {
  arcHeader: ArcHeader;
  fileHeaders: Generator<FileHeader>;
}

export type ArcFile<withContent = never> = {
  fileHeader: FileHeader;
  extraction?: withContent;
};

export interface ArcFiles<withContent = never> {
  arcHeader: ArcHeader;
  files: Generator<ArcFile<withContent>>;
}

export interface ExtractOptions {
  files?: string[] | ((fileHeader: FileHeader) => boolean);
  password?: string;
}

export abstract class Extractor<withContent = never> {
  protected abstract _filePath: string;
  private _password: string;
  private _archive: any;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  constructor(
    protected unrar: any,
    password = '',
  ) {
    this._password = password;
    this._archive = null;
  }

  public getFileList(): ArcList {
    const arcHeader = this.openArc(true);

    function* getFileHeaders(this: Extractor<withContent>): Generator<FileHeader> {
      while (true) {
        const arcFile = this.processNextFile(() => true);
        if (arcFile === 'ERAR_END_ARCHIVE') {
          break;
        }
        yield arcFile.fileHeader;
      }
      this.closeArc();
    }

    return { arcHeader, fileHeaders: getFileHeaders.call(this) };
  }

  public extract({ files, password }: ExtractOptions = {}): ArcFiles<withContent> {
    const arcHeader = this.openArc(false, password);
    function* getFiles(this: Extractor<withContent>): Generator<ArcFile<withContent>> {
      let count = 0;
      while (true) {
        let shouldSkip: (fileHeader: FileHeader) => boolean = () => false;
        if (Array.isArray(files)) {
          if (count === files.length) {
            break;
          }
          shouldSkip = ({ name }: FileHeader) => !files.includes(name);
        } else if (files) {
          shouldSkip = (fileHeader) => !files(fileHeader);
        }
        const arcFile = this.processNextFile(shouldSkip);
        if (arcFile === 'ERAR_END_ARCHIVE') {
          break;
        }
        if (arcFile.extraction === 'skipped') {
          continue;
        }
        count++;
        yield {
          fileHeader: arcFile.fileHeader,
        } as ArcFile<withContent>;
      }
      this.closeArc();
    }
    return { arcHeader, files: getFiles.call(this) };
  }

  protected fileCreated(filename: string): void {
    return;
  }

  protected abstract open(filename: string): number;
  protected abstract create(filename: string): number;
  protected abstract read(fd: number, buf: number, size: number): number;
  protected abstract write(fd: number, buf: number, size: number): boolean;
  protected abstract tell(fd: number): number;
  protected abstract seek(fd: number, pos: number, method: SeekMethod): boolean;
  protected abstract closeFile(fd: number): void;

  protected close(fd: number): void {
    this.closeFile(fd);
  }

  private openArc(listOnly: boolean, password?: string): ArcHeader {
    this._archive = new this.unrar.RarArchive();
    const header = this._archive.open(
      this._filePath,
      password ? password : this._password,
      listOnly,
    );
    if (header.state.errCode !== 0) {
      throw this.getFailException(header.state.errCode, header.state.errType);
    }
    return {
      comment: header.comment,
      flags: {
        volume: (header.flags & 0x0001) !== 0,
        lock: (header.flags & 0x0004) !== 0,
        solid: (header.flags & 0x0008) !== 0,
        authInfo: (header.flags & 0x0020) !== 0,
        recoveryRecord: (header.flags & 0x0040) !== 0,
        headerEncrypted: (header.flags & 0x0080) !== 0,
      },
    };
  }

  private processNextFile(
    shouldSkip: (fileHeader: FileHeader) => boolean,
  ): ArcFile<'skipped' | 'extracted'> | 'ERAR_END_ARCHIVE' {
    function getDateString(dosTime: number): string {
      const bitLen = [5, 6, 5, 5, 4, 7];
      let parts: number[] = [];
      for (const len of bitLen) {
        parts.push(dosTime & ((1 << len) - 1));
        dosTime >>= len;
      }
      parts = parts.reverse();
      const pad = (num: number): string => (num < 10 ? '0' + num : '' + num);

      return (
        `${1980 + parts[0]}-${pad(parts[1])}-${pad(parts[2])}` +
        `T${pad(parts[3])}:${pad(parts[4])}:${pad(parts[5] * 2)}.000`
      );
    }

    function getMethod(method: number): CompressMethod {
      const methodMap: { [index: number]: CompressMethod } = {
        0x30: 'Storing',
        0x31: 'Fastest',
        0x32: 'Fast',
        0x33: 'Normal',
        0x34: 'Good',
        0x35: 'Best',
      };
      return methodMap[method] || 'Unknown';
    }

    const arcFileHeader = this._archive.getFileHeader();

    if (arcFileHeader.state.errCode === 10) {
      return 'ERAR_END_ARCHIVE';
    }

    if (arcFileHeader.state.errCode !== 0) {
      throw this.getFailException(arcFileHeader.state.errCode, arcFileHeader.state.errType);
    }

    const fileHeader: FileHeader = {
      name: arcFileHeader.name,
      flags: {
        encrypted: (arcFileHeader.flags & 0x04) !== 0,
        solid: (arcFileHeader.flags & 0x10) !== 0,
        directory: (arcFileHeader.flags & 0x20) !== 0,
      },
      packSize: arcFileHeader.packSize,
      unpSize: arcFileHeader.unpSize,
      // hostOS: arcFileHeader.hostOS
      crc: arcFileHeader.crc,
      time: getDateString(arcFileHeader.time),
      unpVer: `${Math.floor(arcFileHeader.unpVer / 10)}.${arcFileHeader.unpVer % 10}`,
      method: getMethod(arcFileHeader.method),
      comment: arcFileHeader.comment,
      // // fileAttr: arcFileHeader.fileAttr,
    };

    const skip = shouldSkip(fileHeader);
    const fileState = this._archive.readFile(skip);
    if (fileState.errCode !== 0) {
      throw this.getFailException(fileState.errCode, fileState.errType, fileHeader.name);
    }
    return {
      fileHeader,
      extraction: skip ? 'skipped' : 'extracted',
    };
  }

  private closeArc(): void {
    this._archive.delete();
    this._archive = null;
  }

  private getFailException(
    errCode: Exclude<keyof typeof ERROR_CODE, 0 | 10>,
    _errType: string,
    file?: string,
  ) {
    const reason = ERROR_CODE[errCode];
    this.closeArc();
    return new UnrarError(reason, ERROR_MSG[reason], file);
  }
}
