import * as assert from "assert";
import * as fs from "fs";
import * as shjs from "shelljs";
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
          volume: false,
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

  it("Header encryption with password", () => {
    let extractor = unrar.createExtractorFromFile("./testFiles/HeaderEnc1234.rar", "", "1234");
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
          volume: false,
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

  it("Extract File with folders", () => {
    let extractor = unrar.createExtractorFromFile("./testFiles/FolderTest.rar", "./tmp/", "1234");
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
    assert.equal(fs.readFileSync("./tmp/Folder1/Folder Space/long.txt", "utf-8"), long);

    shjs.rm("-rf", "./tmp");

  });

});
