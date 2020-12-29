import * as assert from 'assert';
import * as fs from 'fs';
import * as unrar from '../index';
import { ArcFile, UnrarError } from '../js/Extractor';

function getExtractor(fileName: string, password?: string) {
  const buf = fs.readFileSync(`./testFiles/${fileName}`);
  const arrBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return unrar.createExtractorFromData({ data: arrBuf, password });
}

describe('Data Test', () => {
  it('Archive Comment', async () => {
    const extractor = await getExtractor('WithComment.rar');
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

  it('Header encryption', async () => {
    const extractor = await getExtractor('HeaderEnc1234.rar');

    const test = () => extractor.getFileList();
    assert.throws(test, (err) => {
      assert.ok(err instanceof UnrarError);
      assert.deepStrictEqual(err.message, 'Password for encrypted file or header is not specified');
      assert.deepStrictEqual(err.reason, 'ERAR_MISSING_PASSWORD');
      return true;
    });
  });

  it('File encrypted with different passwords', async () => {
    const extractor = await getExtractor('FileEncByName.rar');
    const { arcHeader, fileHeaders } = extractor.getFileList();
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
    assert.deepStrictEqual(
      [...fileHeaders],
      [
        {
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
        },
        {
          name: '2中文.txt',
          flags: {
            encrypted: true,
            solid: false,
            directory: false,
          },
          packSize: 32,
          unpSize: 15,
          crc: 2631402331,
          time: '2017-04-03T20:09:18.000',
          unpVer: '2.9',
          method: 'Normal',
        },
        {
          name: '3Sec.txt',
          flags: {
            encrypted: true,
            solid: false,
            directory: false,
          },
          packSize: 16,
          unpSize: 5,
          crc: 762090570,
          time: '2017-04-03T19:58:42.000',
          unpVer: '2.9',
          method: 'Normal',
        },
      ],
    );
  });

  it('Header encryption with password', async () => {
    const extractor = await getExtractor('HeaderEnc1234.rar', '1234');
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

  it('Extract Header encryption file', async () => {
    const extractor = await getExtractor('HeaderEnc1234.rar', '1234');
    const { arcHeader, files } = extractor.extract();
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
    const list = [...files];
    assert.deepStrictEqual(
      list.map(({ fileHeader }) => fileHeader),
      [
        {
          name: '2中文.txt',
          flags: {
            encrypted: true,
            solid: false,
            directory: false,
          },
          packSize: 32,
          unpSize: 15,
          crc: 2631402331,
          time: '2017-04-03T20:09:18.000',
          unpVer: '2.9',
          method: 'Normal',
        },
        {
          name: '1File.txt',
          flags: {
            encrypted: true,
            solid: false,
            directory: false,
          },
          packSize: 32,
          unpSize: 5,
          crc: 1468669977,
          time: '2017-04-03T20:08:44.000',
          unpVer: '2.9',
          method: 'Normal',
        },
      ],
    );

    assert.strictEqual(Buffer.from(list[0].extraction.subarray(0, 3)).toString('hex'), 'efbbbf');
    assert.strictEqual(Buffer.from(list[0].extraction.subarray(3)).toString('utf-8'), '中文中文');
    assert.strictEqual(Buffer.from(list[1].extraction).toString('utf-8'), '1File');
  });

  it('Extract Files by callback', async () => {
    const extractor = await getExtractor('FileEncByName.rar');
    const { files } = extractor.extract({ files: (fileHeader) => !fileHeader.flags.encrypted });
    const list = [...files];

    assert.deepStrictEqual(list, [
      {
        extraction: Uint8Array.from('1File'.split('').map((c) => c.charCodeAt(0))),
        fileHeader: {
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
        },
      },
    ]);
  });

  it('Extract File encrypted with different passwords (no password)', async () => {
    const extractor = await getExtractor('FileEncByName.rar');
    const { files } = extractor.extract();

    const { value: file0 } = files.next() as IteratorResult<ArcFile<Uint8Array>, never>;

    assert.deepStrictEqual(Buffer.from(file0.extraction).toString('utf8'), '1File');

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
  });

  it('Extract File encrypted with different passwords (multiple passwords)', async () => {
    const extractor = await getExtractor('FileEncByName.rar', '1234');
    let { files } = extractor.extract({ files: ['2中文.txt', '1File.txt'], password: '2中文' });

    let list = [...files];
    assert.deepStrictEqual(list.length, 2);

    assert.strictEqual(Buffer.from(list[0].extraction).toString('utf-8'), '1File');
    assert.strictEqual(Buffer.from(list[1].extraction.subarray(0, 3)).toString('hex'), 'efbbbf');
    assert.strictEqual(Buffer.from(list[1].extraction.subarray(3)).toString('utf-8'), '中文中文');

    files = extractor.extract({ files: ['3Sec.txt'], password: '3Sec' }).files;
    list = [...files];
    assert.strictEqual(Buffer.from(list[0].extraction).toString('utf-8'), '3Secc');
  });

  it('Extract File with folders', async () => {
    const extractor = await getExtractor('FolderTest.rar');
    const { files } = extractor.extract();

    const list = [...files];

    assert.deepStrictEqual(list[0].fileHeader.name, 'Folder1/Folder Space/long.txt');
    assert.deepStrictEqual(list[1].fileHeader.name, 'Folder1/Folder 中文/2中文.txt');

    let long = '',
      i = 0;
    while (long.length < 1024 * 1024) {
      long += '1' + '0'.repeat(i++);
    }
    assert.strictEqual(Buffer.from(list[0].extraction).toString('utf-8'), long);

    assert.strictEqual(Buffer.from(list[1].extraction.subarray(3)).toString('utf-8'), '中文中文');
  });
});
