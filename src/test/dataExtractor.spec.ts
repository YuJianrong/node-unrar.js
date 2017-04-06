import * as assert from "assert";
import * as fs from "fs";
import * as unrar from "../index";

function getExtractor(fileName: string, password?: string) {
  let buf = fs.readFileSync(`./testFiles/${fileName}`);
  let arrBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return unrar.createExtractorFromData(arrBuf, password);
}

describe("Data Test", () => {

  it("Archive Comment", () => {
    let extractor = getExtractor("WithComment.rar");
    let [state, list] = extractor.getFileList();
    assert.deepStrictEqual(state, {
      state: "SUCCESS",
    });
    assert.deepStrictEqual(list, {
      arcHeader: {
        comment: "Test Comments for rar files.\r\n\r\n测试一下中文注释。\r\n日本語のコメントもテストしていまし。",
        flags: {
          authInfo: false,
          headerEncrypted: false,
          lock: false,
          recoveryRecord: false,
          solid: false,
          volumn: false,
        },
      }, fileHeaders: [
        {
          crc: 0,
          flags: {
            directory: false,
            encrypted: false,
            solid: false,
          },
          method: "Storing",
          name: "1File.txt",
          packSize: 0,
          time: "2017-04-03T10:41:42.000",
          unpSize: 0,
          unpVer: "2.9",
        },
        {
          crc: 0,
          flags: {
            directory: false,
            encrypted: false,
            solid: false,
          },
          method: "Storing",
          name: "2中文.txt",
          packSize: 0,
          time: "2017-04-03T10:41:52.000",
          unpSize: 0,
          unpVer: "2.9",
        },
      ],
    });
  });

  it("Header encryption", () => {
    let extractor = getExtractor("HeaderEnc1234.rar");
    let [state, list] = extractor.getFileList();
    assert.equal(state.state, "FAIL");
    assert.equal((state as any).reason, "ERAR_MISSING_PASSWORD");
    assert.equal(list, null);
  });

  it("File encrypted with different passwords", () => {
    let extractor = getExtractor("FileEncByName.rar");
    let [state, list] = extractor.getFileList();
    assert.deepStrictEqual(state, {
      state: "SUCCESS",
    });
    assert.deepStrictEqual(list, {
      arcHeader: {
        comment: "",
        flags: {
          authInfo: false,
          headerEncrypted: false,
          lock: false,
          recoveryRecord: false,
          solid: false,
          volumn: false,
        },
      }, fileHeaders: [
        {
          crc: 1468669977,
          flags: {
            directory: false,
            encrypted: false,
            solid: false,
          },
          method: "Storing",
          name: "1File.txt",
          packSize: 5,
          time: "2017-04-03T20:08:44.000",
          unpSize: 5,
          unpVer: "2.9",
        }, {
          name: "2中文.txt",
          flags: {
            encrypted: true,
            solid: false,
            directory: false,
          },
          packSize: 32,
          unpSize: 15,
          crc: 2631402331,
          time: "2017-04-03T20:09:18.000",
          unpVer: "2.9",
          method: "Normal",
        }, {
          name: "3Sec.txt",
          flags: {
            encrypted: true,
            solid: false,
            directory: false,
          },
          packSize: 16,
          unpSize: 5,
          crc: 762090570,
          time: "2017-04-03T19:58:42.000",
          unpVer: "2.9",
          method: "Normal",
        },
      ],
    });

  });

  it("Header encryption with password", () => {
    let extractor = getExtractor("HeaderEnc1234.rar", "1234");
    let [state, list] = extractor.getFileList();
    assert.deepStrictEqual(state, {
      state: "SUCCESS",
    });
    assert.deepStrictEqual(list, {
      arcHeader: {
        comment: "Hello, world",
        flags: {
          authInfo: false,
          headerEncrypted: true,
          lock: false,
          recoveryRecord: false,
          solid: false,
          volumn: false,
        },
      }, fileHeaders: [
        {
          crc: 2631402331,
          flags: {
            directory: false,
            encrypted: true,
            solid: false,
          },
          method: "Normal",
          name: "2中文.txt",
          packSize: 32,
          time: "2017-04-03T20:09:18.000",
          unpSize: 15,
          unpVer: "2.9",
        },
        {
          crc: 1468669977,
          flags: {
            directory: false,
            encrypted: true,
            solid: false,
          },
          method: "Normal",
          name: "1File.txt",
          packSize: 32,
          time: "2017-04-03T20:08:44.000",
          unpSize: 5,
          unpVer: "2.9",
        },
      ],
    });

  });

  it("Extract Header encryption file", () => {
    let extractor = getExtractor("HeaderEnc1234.rar", "1234");
    let [state, list] = extractor.extractAll();
    assert.deepStrictEqual(state, {
      state: "SUCCESS",
    });
    assert.notDeepEqual(list, null);
    assert.deepStrictEqual(list!.files[0]!.fileHeader, {
      name: "2中文.txt",
      flags: {
        encrypted: true,
        solid: false,
        directory: false,
      },
      packSize: 32,
      unpSize: 15,
      crc: 2631402331,
      time: "2017-04-03T20:09:18.000",
      unpVer: "2.9",
      method: "Normal",
    });

    assert.deepStrictEqual(list!.files[1]!.fileHeader, {
      name: "1File.txt",
      flags: {
        encrypted: true,
        solid: false,
        directory: false,
      },
      packSize: 32,
      unpSize: 5,
      crc: 1468669977,
      time: "2017-04-03T20:08:44.000",
      unpVer: "2.9",
      method: "Normal",
    });

    assert.deepStrictEqual(list!.files[0]!.extract[0], { state: "SUCCESS" });

    assert.equal(new Buffer(list!.files[0]!.extract[1]!.subarray(0, 3)).toString("hex"), "efbbbf");
    assert.equal(new Buffer(list!.files[0]!.extract[1]!.subarray(3)).toString("utf-8"), "中文中文");
    assert.equal(new Buffer(list!.files[1]!.extract[1]!).toString("utf-8"), "1File");

  });

  it("Extract File encrypted with different passwords (no password)", () => {
    let extractor = getExtractor("FileEncByName.rar");
    let [state, list] = extractor.extractAll();
    assert.deepStrictEqual(state, { state: "SUCCESS" });

    assert.deepStrictEqual(list!.files[0]!.extract[0], { state: "SUCCESS" });
    assert.deepStrictEqual(new Buffer(list!.files[0]!.extract[1]!).toString("utf8"), "1File");

    assert.deepStrictEqual(list!.files[1]!.extract[1], null);
    assert.deepStrictEqual(list!.files[1]!.extract[0], {
      msg: "Password for encrypted file or header is not specified",
      reason: "ERAR_MISSING_PASSWORD",
      state: "FAIL",
    });

    assert.deepStrictEqual(list!.files[2]!.extract[1], null);
    assert.deepStrictEqual(list!.files[2]!.extract[0], {
      msg: "Password for encrypted file or header is not specified",
      reason: "ERAR_MISSING_PASSWORD",
      state: "FAIL",
    });

  });

  it("Extract File encrypted with different passwords (one password)", () => {
    let extractor = getExtractor("FileEncByName.rar", "3Sec");
    let [state, list] = extractor.extractAll();

    assert.deepStrictEqual(state, { state: "SUCCESS" });

    assert.deepStrictEqual(list!.files[0]!.extract[0], { state: "SUCCESS" });
    assert.deepStrictEqual(new Buffer(list!.files[0]!.extract[1]!).toString("utf8"), "1File");

    assert.deepStrictEqual(list!.files[1]!.extract[1], null);
    assert.deepStrictEqual(list!.files[1]!.extract[0], {
      state: "FAIL",
      reason: "ERAR_BAD_DATA",
      msg: "Archive header or data are damaged",
    });

    assert.deepStrictEqual(list!.files[2]!.extract[0], { state: "SUCCESS" });
    assert.deepStrictEqual(new Buffer(list!.files[2]!.extract[1]!).toString("utf8"), "3Secc");

  });

  it("Extract File encrypted with different passwords (multiple passwords)", () => {
    let extractor = getExtractor("FileEncByName.rar", "1234");
    let [state, list] = extractor.extractFiles(["2中文.txt", "1File.txt"], "2中文");

    assert.deepStrictEqual(state, { state: "SUCCESS" });

    assert.deepStrictEqual(list!.files.length, 2);

    assert.deepStrictEqual(list!.files[0]!.extract[0], { state: "SUCCESS" });
    assert.equal(new Buffer(list!.files[0]!.extract[1]!.subarray(0, 3)).toString("hex"), "efbbbf");
    assert.equal(new Buffer(list!.files[0]!.extract[1]!.subarray(3)).toString("utf-8"), "中文中文");

    assert.deepStrictEqual(list!.files[1]!.extract[0], { state: "SUCCESS" });
    assert.equal(new Buffer(list!.files[1]!.extract[1]!).toString("utf-8"), "1File");

    [state, list] = extractor.extractFiles(["3Sec.txt", "haha.txt"], "3Sec");
    assert.deepStrictEqual(list!.files[0]!.extract[0], { state: "SUCCESS" });
    assert.equal(new Buffer(list!.files[0]!.extract[1]!).toString("utf-8"), "3Secc");

    assert.deepStrictEqual(list!.files[1], null);

  });

  it("Extract File with folders", () => {
    let extractor = getExtractor("FolderTest.rar");
    let [state, list] = extractor.extractAll();
    assert.deepStrictEqual(state, { state: "SUCCESS" });

    assert.deepStrictEqual(list!.files[0]!.fileHeader.name, "Folder1/Folder Space/long.txt");
    assert.deepStrictEqual(list!.files[1]!.fileHeader.name, "Folder1/Folder 中文/2中文.txt");
    assert.deepStrictEqual(list!.files[2]!.fileHeader.name, "Folder1/Folder Space");
    assert.deepStrictEqual(list!.files[3]!.fileHeader.name, "Folder1/Folder 中文");
    assert.deepStrictEqual(list!.files[4]!.fileHeader.name, "Folder1");

    let long = "", i = 0;
    while (long.length < 1024 * 1024) {
      long += "1" + "0".repeat(i++);
    }
    assert.equal(new Buffer(list!.files[0]!.extract[1]!).toString("utf-8"), long);

    assert.equal(new Buffer(list!.files[1]!.extract[1]!.subarray(3)).toString("utf-8"), "中文中文");

  });

});
