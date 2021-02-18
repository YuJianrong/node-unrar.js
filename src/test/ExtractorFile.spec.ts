import * as assert from 'assert';
import * as fs from 'fs';
import * as shjs from 'shelljs';
import * as unrar from '../index';
import { ArcFile, UnrarError } from '../js/Extractor';

describe('File Test', () => {
  it('Archive Comment', async () => {
    const extractor = await unrar.createExtractorFromFile({
      filepath: './testFiles/WithComment.rar',
    });
    const { arcHeader, fileHeaders } = extractor.getFileList();
    assert.deepStrictEqual(arcHeader, {
      comment:
        'Test Comments for rar files.\r\n\r\n测试一下中文注释。\r\n日本語のコメントもテストしていまし。',
      flags: {
        authInfo: false,
        headerEncrypted: false,
        lock: false,
        recoveryRecord: false,
        solid: false,
        volume: false,
      },
    });

    assert.deepStrictEqual(
      [...fileHeaders],
      [
        {
          comment: '',
          crc: 0,
          flags: {
            directory: false,
            encrypted: false,
            solid: false,
          },
          method: 'Storing',
          name: '1File.txt',
          packSize: 0,
          time: '2017-04-03T10:41:42.000',
          unpSize: 0,
          unpVer: '2.9',
        },
        {
          comment: '',
          crc: 0,
          flags: {
            directory: false,
            encrypted: false,
            solid: false,
          },
          method: 'Storing',
          name: '2中文.txt',
          packSize: 0,
          time: '2017-04-03T10:41:52.000',
          unpSize: 0,
          unpVer: '2.9',
        },
      ],
    );
  });

  it('Header encryption with password', async () => {
    const extractor = await unrar.createExtractorFromFile({
      filepath: './testFiles/HeaderEnc1234.rar',
      password: '1234',
    });
    const { arcHeader, fileHeaders } = extractor.getFileList();
    assert.deepStrictEqual(arcHeader, {
      comment: 'Hello, world',
      flags: {
        authInfo: false,
        headerEncrypted: true,
        lock: false,
        recoveryRecord: false,
        solid: false,
        volume: false,
      },
    });
    assert.deepStrictEqual(
      [...fileHeaders],
      [
        {
          comment: '',
          crc: 2631402331,
          flags: {
            directory: false,
            encrypted: true,
            solid: false,
          },
          method: 'Normal',
          name: '2中文.txt',
          packSize: 32,
          time: '2017-04-03T20:09:18.000',
          unpSize: 15,
          unpVer: '2.9',
        },
        {
          comment: '',
          crc: 1468669977,
          flags: {
            directory: false,
            encrypted: true,
            solid: false,
          },
          method: 'Normal',
          name: '1File.txt',
          packSize: 32,
          time: '2017-04-03T20:08:44.000',
          unpSize: 5,
          unpVer: '2.9',
        },
      ],
    );
  });

  it('Extract File with folders', async () => {
    const extractor = await unrar.createExtractorFromFile({
      filepath: './testFiles/FolderTest.rar',
      targetPath: './tmp/',
      password: '1234',
    });
    const { arcHeader, files } = extractor.extract();
    assert.deepStrictEqual(arcHeader, {
      comment: '',
      flags: {
        authInfo: false,
        headerEncrypted: false,
        lock: false,
        recoveryRecord: false,
        solid: false,
        volume: false,
      },
    });

    const list = [...files];

    assert.deepStrictEqual(list[0].fileHeader.name, 'Folder1/Folder Space/long.txt');
    assert.deepStrictEqual(list[1].fileHeader.name, 'Folder1/Folder 中文/2中文.txt');

    let long = '',
      i = 0;
    while (long.length < 1024 * 1024) {
      long += '1' + '0'.repeat(i++);
    }
    assert.strictEqual(fs.readFileSync('./tmp/Folder1/Folder Space/long.txt', 'utf-8'), long);

    shjs.rm('-rf', './tmp');
  });

  it('Extract File with name transformed', async () => {
    const extractor = await unrar.createExtractorFromFile({
      filepath: './testFiles/FolderTest.rar',
      targetPath: './tmp/',
      password: '1234',
      filenameTransform: (name) => `${name}.tmp`,
    });
    const { files } = extractor.extract();
    const list = [...files];

    assert.deepStrictEqual(list[0].fileHeader.name, 'Folder1/Folder Space/long.txt');
    assert.deepStrictEqual(list[1].fileHeader.name, 'Folder1/Folder 中文/2中文.txt');

    let long = '',
      i = 0;
    while (long.length < 1024 * 1024) {
      long += '1' + '0'.repeat(i++);
    }
    assert.strictEqual(fs.readFileSync('./tmp/Folder1/Folder Space/long.txt.tmp', 'utf-8'), long);

    shjs.rm('-rf', './tmp');
  });

  it('Extract File encrypted with different passwords (no password)', async () => {
    const extractor = await unrar.createExtractorFromFile({
      filepath: './testFiles/FileEncByName.rar',
      targetPath: './tmp/',
    });
    const { files } = extractor.extract();

    const { value: file0 } = files.next() as IteratorResult<ArcFile<never>, never>;

    assert.deepStrictEqual(file0.fileHeader, {
      comment: '',
      crc: 1468669977,
      flags: {
        directory: false,
        encrypted: false,
        solid: false,
      },
      method: 'Storing',
      name: '1File.txt',
      packSize: 5,
      time: '2017-04-03T20:08:44.000',
      unpSize: 5,
      unpVer: '2.9',
    });

    assert.throws(
      () => files.next(),
      (err) => {
        assert.ok(err instanceof UnrarError);
        assert.deepStrictEqual(
          err.message,
          'Password for encrypted file or header is not specified',
        );
        return true;
      },
    );
    shjs.rm('-rf', './tmp');
  });
});
