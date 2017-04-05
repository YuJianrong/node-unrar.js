import * as assert from "assert";
import * as fs from "fs";
import * as unrar from "../index";

describe("File Test", () => {

  it("Archive Comment", () => {
    let extractor = unrar.createExtractorFromFile("./testFiles/WithComment.rar");
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
          fileAttr: 32,
          flags: {
            commented: false,
            directory: false,
            encrypted: false,
            solid: false,
          },
          method: 48,
          name: "1File.txt",
          packSize: 0,
          time: "2017-04-03T10:41:42.000",
          unpSize: 0,
          unpVer: "2.9",
        },
        {
          crc: 0,
          fileAttr: 32,
          flags: {
            commented: false,
            directory: false,
            encrypted: false,
            solid: false,
          },
          method: 48,
          name: "2中文.txt",
          packSize: 0,
          time: "2017-04-03T10:41:52.000",
          unpSize: 0,
          unpVer: "2.9",
        },
      ],
    });
  });

  it("Header encryption with password", () => {
    let extractor = unrar.createExtractorFromFile("./testFiles/HeaderEnc1234.rar", "1234");
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
          fileAttr: 32,
          flags: {
            commented: false,
            directory: false,
            encrypted: true,
            solid: false,
          },
          method: 51,
          name: "2中文.txt",
          packSize: 32,
          time: "2017-04-03T20:09:18.000",
          unpSize: 15,
          unpVer: "2.9",
        },
        {
          crc: 1468669977,
          fileAttr: 32,
          flags: {
            commented: false,
            directory: false,
            encrypted: true,
            solid: false,
          },
          method: 51,
          name: "1File.txt",
          packSize: 32,
          time: "2017-04-03T20:08:44.000",
          unpSize: 5,
          unpVer: "2.9",
        },
      ],
    });
  });

});
