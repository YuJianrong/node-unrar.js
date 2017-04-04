
import { Ext as extIns } from "./extractorCurrent";
import * as unrar from "./unrar";

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

export interface File {
  name: string;
  flags: {
    encrypted: boolean,
    commented: boolean,
    solid: boolean,
    directory: boolean,
  };
  packSize: number;
  unpSize: number;
  // hostOS: "MSDOS" | "OS/2" | "Win32" | "Unix",
  crc: number;
  time: string;
  unpVer: string;
  method: number;
  fileAttr: number;
}

export interface Header {
  comment: string;
  flags: {
    volumn: boolean,
    lock: boolean,
    solid: boolean,
    authInfo: boolean,
    recoveryRecord: boolean,
    headerEncrypted: boolean,
  };
  files: File[];
}

export type FileListResult = [State, Header | null];

export abstract class Extractor {
  private static _current: Extractor | null = null;
  protected abstract _filePath: string;
  private _password: string;

  constructor(password: string) {
    this._password = password;
  }

  public getFileList(): FileListResult {

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

    extIns.current = this;
    let result = unrar.getArchiveList(this._filePath, this._password);
    extIns.current = null;

    if (result.errCode !== 0) {
      return [this.getFailInfo(result.errCode, result.errType), null];
    }

    result = result.result;
    let files: File[] = [];

    let vecFileList = result.fileList;
    for (let i = 0, l = vecFileList.size(); i < l; ++i) {
      let file = vecFileList.get(i);
      files.push({
        name: file.name,
        flags: {
          /* tslint:disable: no-bitwise */
          encrypted: (file.flags & 0x04) !== 0,
          commented: (file.flags & 0x08) !== 0,
          solid: (file.flags & 0x10) !== 0,
          directory: (file.flags & 0b11100000) === 0b11100000,
          /* tslint:enable: no-bitwise */
        },
        packSize: file.packSize,
        unpSize: file.unpSize,
        // hostOS: file.hostOS
        crc: file.crc,
        time: getDateString(file.time),
        unpVer: `${Math.floor(file.unpVer / 10)}.${(file.unpVer % 10)}`,
        method: file.method,
        fileAttr: file.fileAttr,
      });
    }
    vecFileList.delete();

    return [{
      state: "SUCCESS",
    }, {
      comment: result.comment,
      flags: {
        /* tslint:disable: no-bitwise */
        volumn: (result.flags & 0x0001) !== 0,
        lock: (result.flags & 0x0004) !== 0,
        solid: (result.flags & 0x0008) !== 0,
        authInfo: (result.flags & 0x0020) !== 0,
        recoveryRecord: (result.flags & 0x0040) !== 0,
        headerEncrypted: (result.flags & 0x0080) !== 0,
        /* tslint:enable: no-bitwise */
      },
      files,
    }];
  }

  protected abstract open(filename: string): number;
  protected abstract create(filename: string): number;
  protected abstract close(fd: number): void;
  protected abstract read(fd: number, buf: any, size: number): number;
  protected abstract write(fd: number, buf: any, size: number): boolean;
  protected abstract tell(fd: number): number;
  protected abstract seek(fd: number, pos: number, method: SeekMethod): boolean;

  private getFailInfo(errCode: number, errType: string): State {
    return {
      state: "FAIL",
      reason: ERROR_CODE[errCode],
      msg: ERROR_MSG[errCode],
    };
  }

}
