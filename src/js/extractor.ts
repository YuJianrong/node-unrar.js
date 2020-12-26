
import { Ext as extIns } from "./extractorCurrent";
import unrar from "./unrarSingleton";

export type SeekMethod = "CUR" | "SET" | "END";

export type FailReason =
  "ERAR_SUCCESS" |
  "ERAR_END_ARCHIVE" |
  "ERAR_NO_MEMORY" |
  "ERAR_BAD_DATA" |
  "ERAR_BAD_ARCHIVE" |
  "ERAR_UNKNOWN_FORMAT" |
  "ERAR_EOPEN" |
  "ERAR_ECREATE" |
  "ERAR_ECLOSE" |
  "ERAR_EREAD" |
  "ERAR_EWRITE" |
  "ERAR_SMALL_BUF" |
  "ERAR_UNKNOWN" |
  "ERAR_MISSING_PASSWORD" |
  "ERAR_EREFERENCE" |
  "ERAR_BAD_PASSWORD"
  ;

export type State = {
  state: "SUCCESS",
} | {
    state: "FAIL";
    reason: FailReason;
    msg: string | null;
  };

const ERROR_CODE: { [index: number]: FailReason } = {
  0: "ERAR_SUCCESS",
  10: "ERAR_END_ARCHIVE",
  11: "ERAR_NO_MEMORY",
  12: "ERAR_BAD_DATA",
  13: "ERAR_BAD_ARCHIVE",
  14: "ERAR_UNKNOWN_FORMAT",
  15: "ERAR_EOPEN",
  16: "ERAR_ECREATE",
  17: "ERAR_ECLOSE",
  18: "ERAR_EREAD",
  19: "ERAR_EWRITE",
  20: "ERAR_SMALL_BUF",
  21: "ERAR_UNKNOWN",
  22: "ERAR_MISSING_PASSWORD",
  23: "ERAR_EREFERENCE",
  24: "ERAR_BAD_PASSWORD",
};

const ERROR_MSG: { [index: number]: string } = {
  0: "Success",
  11: "Not enough memory",
  12: "Archive header or data are damaged",
  13: "File is not RAR archive",
  14: "Unknown archive format",
  15: "File open error",
  16: "File create error",
  17: "File close error",
  18: "File read error",
  19: "File write error",
  20: "Buffer for archive comment is too small, comment truncated",
  21: "Unknown error",
  22: "Password for encrypted file or header is not specified",
  23: "Cannot open file source for reference record",
  24: "Wrong password is specified",
};

export type CompressMethod = "Storing" | "Fastest" | "Fast" | "Normal" | "Good" | "Best" | "Unknown";

export interface FileHeader {
  name: string;
  flags: {
    encrypted: boolean,
    solid: boolean,
    directory: boolean,
  };
  packSize: number;
  unpSize: number;
  // hostOS: "MSDOS" | "OS/2" | "Win32" | "Unix",
  crc: number;
  time: string;
  unpVer: string;
  method: CompressMethod;
  // fileAttr: number;
}

export interface ArcHeader {
  comment: string;
  flags: {
    volume: boolean,
    lock: boolean,
    solid: boolean,
    authInfo: boolean,
    recoveryRecord: boolean,
    headerEncrypted: boolean,
  };
  // files: FileHeader[];
}

export interface ArcList {
  arcHeader: ArcHeader;
  fileHeaders: FileHeader[];
}

export type Result<T> = [State, T | null];

export interface ArcFile {
  fileHeader: FileHeader;
  extract: Result<Uint8Array>;
}

export interface ArcFiles {
  arcHeader: ArcHeader;
  files: Array<ArcFile | null>;
}

export abstract class Extractor {
  private static _current: Extractor | null = null;
  protected abstract _filePath: string;
  private _password: string;
  private _archive: any;
  private _lastFileContent: Uint8Array | null;

  constructor(password: string = "") {
    this._password = password;
    this._archive = null;
  }

  public getFileList(): Result<ArcList> {

    let ret: Result<ArcList>;
    let [state, arcHeader] = this.openArc(true);
    if (state.state !== "SUCCESS") {
      ret = [state, null];
    } else {
      let fileState, arcFile;
      let fileHeaders: FileHeader[] = [];
      while (true) {
        [fileState, arcFile] = this.processNextFile(() => true);
        if (fileState.state !== "SUCCESS") {
          break;
        }
        fileHeaders.push(arcFile!.fileHeader);
      }
      if ((fileState as { reason: FailReason }).reason !== "ERAR_END_ARCHIVE") {
        ret = [fileState, null];
      } else {
        ret = [{
          state: "SUCCESS",
        }, {
          arcHeader: arcHeader!,
          fileHeaders,
        }];
      }
    }
    this.closeArc();

    return ret;
  }

  public extractAll(): Result<ArcFiles> {

    let ret: Result<ArcFiles>;
    let [state, arcHeader] = this.openArc(false);
    if (state.state !== "SUCCESS") {
      ret = [state, null];
    } else {
      let fileState, arcFile;
      let files: ArcFile[] = [];
      while (true) {
        [fileState, arcFile] = this.processNextFile(() => false);
        if (fileState.state !== "SUCCESS") {
          break;
        }
        files.push(arcFile!);
      }
      if ((fileState as { reason: FailReason }).reason !== "ERAR_END_ARCHIVE") {
        ret = [fileState, null];
      } else {
        ret = [{
          state: "SUCCESS",
        }, {
          arcHeader: arcHeader!,
          files,
        }];
      }
    }
    this.closeArc();

    return ret;
  }

  public extractFiles(files: string[], password?: string): Result<ArcFiles> {
    let ret: Result<ArcFiles>;
    let [state, arcHeader] = this.openArc(false, password);
    let fileMap: { [index: string]: number } = {};
    for (let i = 0; i < files.length; ++i) {
      fileMap[files[i]] = i;
    }
    if (state.state !== "SUCCESS") {
      ret = [state, null];
    } else {
      let fileState, arcFile;
      let arcFiles: Array<ArcFile | null> = Array(files.length).fill(null);
      let count = 0;
      while (true) {
        let skip = false, index: number | null = null;
        [fileState, arcFile] = this.processNextFile((filename) => {
          if (filename in fileMap) {
            index = fileMap[filename];
            return false;
          } else {
            skip = true;
            return true;
          }
        });
        if (fileState.state !== "SUCCESS") {
          break;
        }
        if (!skip) {
          arcFiles[index!] = arcFile;
          count++;
          if (count === files.length) {
            (fileState as { reason: FailReason }).reason = "ERAR_END_ARCHIVE";
            break;
          }
        }
      }
      if ((fileState as { reason: FailReason }).reason !== "ERAR_END_ARCHIVE") {
        ret = [fileState, null];
      } else {
        ret = [{
          state: "SUCCESS",
        }, {
          arcHeader: arcHeader!,
          files: arcFiles,
        }];
      }
    }
    this.closeArc();

    return ret;
  }

  protected fileCreated(filename: string): void {
    return;
  }

  protected abstract open(filename: string): number;
  protected abstract create(filename: string): number;
  protected abstract read(fd: number, buf: any, size: number): number;
  protected abstract write(fd: number, buf: any, size: number): boolean;
  protected abstract tell(fd: number): number;
  protected abstract seek(fd: number, pos: number, method: SeekMethod): boolean;
  protected abstract closeFile(fd: number): Uint8Array | null;

  protected close(fd: number): void {
    this._lastFileContent = this.closeFile(fd);
    return;
  }

  private openArc(listOnly: boolean, password?: string): Result<ArcHeader> {

    extIns.current = this;
    this._archive = new unrar.RarArchive();
    let header = this._archive.open(this._filePath, password ? password : this._password, listOnly);
    let ret: Result<ArcHeader>;
    if (header.state.errCode !== 0) {
      ret = [this.getFailInfo(header.state.errCode, header.state.errType), null];
    } else {
      ret = [{
        state: "SUCCESS",
      }, {
        comment: header.comment,
        flags: {
          /* tslint:disable: no-bitwise */
          volume: (header.flags & 0x0001) !== 0,
          lock: (header.flags & 0x0004) !== 0,
          solid: (header.flags & 0x0008) !== 0,
          authInfo: (header.flags & 0x0020) !== 0,
          recoveryRecord: (header.flags & 0x0040) !== 0,
          headerEncrypted: (header.flags & 0x0080) !== 0,
          /* tslint:enable: no-bitwise */
        },
      }];
    }
    // archive.delete();
    extIns.current = null;
    return ret;
  }

  private processNextFile(callback: (_: string) => boolean): Result<ArcFile> {

    function getDateString(dosTime: number): string {
      const bitLen = [5, 6, 5, 5, 4, 7];
      let parts: number[] = [];
      for (let len of bitLen) {
        // tslint:disable-next-line: no-bitwise
        parts.push(dosTime & ((1 << len) - 1));
        // tslint:disable-next-line: no-bitwise
        dosTime >>= len;
      }
      parts = parts.reverse();
      let pad = (num: number): string => num < 10 ? "0" + num : "" + num;

      return `${1980 + parts[0]}-${pad(parts[1])}-${pad(parts[2])}` +
        `T${pad(parts[3])}:${pad(parts[4])}:${pad(parts[5] * 2)}.000`;
    }

    function getMethod(method: number): CompressMethod {
      let methodMap: {[index: number]: CompressMethod} = {
        0x30: "Storing",
        0x31: "Fastest",
        0x32: "Fast",
        0x33: "Normal",
        0x34: "Good",
        0x35: "Best",
      };
      return methodMap[method] || "Unknown";
    }

    extIns.current = this;
    let ret: Result<ArcFile>;
    let arcFileHeader = this._archive.getFileHeader();
    let extractInfo: Result<Uint8Array> = [{ state: "SUCCESS" }, null];
    if (arcFileHeader.state.errCode === 0) {
      let skip = callback(arcFileHeader.name);
      this._lastFileContent = null;
      let fileState = this._archive.readFile(skip);
      if (fileState.errCode !== 0 && !skip) {
        extractInfo[0] = this.getFailInfo(fileState.errCode, fileState.errType);
        if (fileState.errCode === 22) {
          fileState = this._archive.readFile(true);
        } else {
          fileState.errCode = 0;
        }
      }
      if (fileState.errCode === 0) {
        extractInfo[1] = this._lastFileContent;
      } else {
        arcFileHeader.state.errCode = fileState.errCode;
        arcFileHeader.state.errType = fileState.errType;
      }
      this._lastFileContent = null;
    }
    if (arcFileHeader.state.errCode !== 0) {
      ret = [this.getFailInfo(arcFileHeader.state.errCode, arcFileHeader.state.errType), null];
    } else {
      ret = [{
        state: "SUCCESS",
      }, {
        fileHeader: {
          name: arcFileHeader.name,
          flags: {
            /* tslint:disable: no-bitwise */
            encrypted: (arcFileHeader.flags & 0x04) !== 0,
            solid: (arcFileHeader.flags & 0x10) !== 0,
            directory: (arcFileHeader.flags & 0x20) !== 0,
            /* tslint:enable: no-bitwise */
          },
          packSize: arcFileHeader.packSize,
          unpSize: arcFileHeader.unpSize,
          // hostOS: arcFileHeader.hostOS
          crc: arcFileHeader.crc,
          time: getDateString(arcFileHeader.time),
          unpVer: `${Math.floor(arcFileHeader.unpVer / 10)}.${(arcFileHeader.unpVer % 10)}`,
          method: getMethod(arcFileHeader.method),
          // // fileAttr: arcFileHeader.fileAttr,
        },
        extract: extractInfo,
      }];
    }

    extIns.current = null;
    return ret;
  }

  private closeArc(): void {
    extIns.current = this;
    this._archive.delete();
    extIns.current = null;
    this._archive = null;
  }

  private getFailInfo(errCode: number, errType: string): State {
    return {
      state: "FAIL",
      reason: ERROR_CODE[errCode],
      msg: ERROR_MSG[errCode],
    };
  }

}
