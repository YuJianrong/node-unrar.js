# node-unrar-js

[![Build Status](https://github.com/YuJianrong/node-unrar.js/workflows/Build/badge.svg)](https://github.com/YuJianrong/node-unrar.js/actions?query=workflow%3ABuild)
[![npm version](https://badge.fury.io/js/node-unrar-js.svg)](https://badge.fury.io/js/node-unrar-js)
[![MIT License](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://www.typescriptlang.org/)

`node-unrar.js` is a npm module to extract rar archive in pure JavaScript. It's combined by a Javascript adoption layer and JavaScript unRar library compiled by [Emscripten](http://emscripten.org/) from the [C++ unrar library](http://www.rarlab.com/rar/unrarsrc-6.0.2.tar.gz) which hosted on http://www.rarlab.com/rar_add.htm .

## Installation

You can install the module via `npm`:

```bash
npm install node-unrar-js
```

## Features

- Fully support for RAR archive, because it comes from the official source code.
- Unicode support, for both comment and file path/name.
- API for Extraction to both memory and file system.
- Both Commonjs module (for nodejs) and ES2015 module (for webpack) are supported.

## Unsupported Features

- Volume archives are not supported.
- Synchronize File System IO functions are used in File Extraction.

## API to create the extractor

- `async function createExtractorFromData(options: ExtractorFromDataOptions): Promise<Extractor<Uint8Array>>` - Create the in Memory Extractor

  Options `ExtractorFromDataOptions`:

  - `data: ArrayBuffer` : ArrayBuffer object of the RAR archive file
  - `password?: string` : _Optional_ password
  - `wasmBinary? ArrayBuffer;` : _Optional_ Use in browser, the wasm binary must be loaded in the code and send to this function to load the wasm code

- `async function createExtractorFromFile(options: ExtractorFromFileOptions): Promise<Extractor>` - Get the File Extractor

  Options `ExtractorFromFileOptions`:

  - `filepath: string` : File path of the RAR archive file
  - `targetPath?: string` : _Optional_ target folder
  - `password?: string` : _Optional_ password
  - `filenameTransform?: (filename: string) => string`: _Optional_ transform the file name before it's created on file system

  _Node_: This function is not available in EM2015 Module since the EM2015 Module is used for webpack in Browser.

## API of the extractor

- `getFileList(): ArcList` : Get the file header and file list of the archive.

  Members in `ArcList`:

  - `arcHeader: ArcHeader` : The header of the archive
  - `fileHeaders: Generator<FileHeader>` : The iterator of the `FileHeader` objects

```js
{
  arcHeader: {
    comment: "",
    flags: {
      authInfo: false,
      headerEncrypted: false,
      lock: false,
      recoveryRecord: false,
      solid: false,
      volume: false,
    },
  }, fileHeaders: (Iterator)
    {
      crc: 0,
      flags: {
        directory: false,
        encrypted: false,
        solid: false,
      },
      method: "Storing",
      name: "FileName",
      packSize: 0,
      time: "2017-04-03T10:41:42.000",
      unpSize: 0,
      unpVer: "2.9",
      comment: "",
    },
}
```

- `extract(options: ExtractOptions)`: Extract the files.
  - Options `ExtractOptions`:
    - `files?: string[] | ((fileHeader: FileHeader) => boolean)` _Optional_ Extract all the files if `files` is empty
      - `string[]`: Extract the specific files only
      - `(fileHeader: FileHeader) => boolean`: Extract only the filtered file (_eg. extract only the files without password_).
    - `password?: string`: _Optional_ password for the extracted files only (Different password can be applied to any single file in RAR archive).
  - The return values are different for `createExtractorFromData` and `createExtractorFromFile`:
    - `ArcFiles<Uint8Array>` for `createExtractorFromData`
    - `ArcFiles` for `createExtractorFromFile`
  - Members in `ArcFiles`:
    - `arcHeader: ArcHeader` : The header of the archive
    - `files: Generator<ArcFile>` : The iterator of the `ArcFile` objects
    - Members in `ArcFile`:
      - `fileHeader: FileHeader` : The header of the extracted file
      - `extraction: Uint8Array` : The extracted content of the file (`createExtractorFromData` only).
  - Note: Different to `getFileList`, only files will be parsed by this api, the folders will be skipped.

```js
{
  arcHeader: {...} // Same as the arcHeader above
  files: (Iterator)
    {
      fileHeader: {...} // Same as the fileHeader above
      extraction?: Uint8Array // createExtractorFromData only
  ]
}
```

**Note: The returned iterators from the two apis are lazy, it means the file header/content will not be parsed/extracted if any file is not iterated yet.**

## Exception

The customized Error Object `UnrarError` will be thrown for any exception in extracting. The definition of the Object is:

```Typescript
class UnrarError extends Error {
    reason: FailReason;
    file?: string | undefined; // Will be filled for any exception in extraction of a file
}
```

The following code is used in the `FailReason`:

| FailReason            | Message                                                    |
| --------------------- | ---------------------------------------------------------- |
| ERAR_NO_MEMORY        | Not enough memory                                          |
| ERAR_BAD_DATA         | Archive header or data are damaged                         |
| ERAR_BAD_ARCHIVE      | File is not RAR archive                                    |
| ERAR_UNKNOWN_FORMAT   | Unknown archive format                                     |
| ERAR_EOPEN            | File open error                                            |
| ERAR_ECREATE          | File create error                                          |
| ERAR_ECLOSE           | File close error                                           |
| ERAR_EREAD            | File read error                                            |
| ERAR_EWRITE           | File write error                                           |
| ERAR_SMALL_BUF        | Buffer for archive comment is too small, comment truncated |
| ERAR_UNKNOWN          | Unknown error                                              |
| ERAR_MISSING_PASSWORD | Password for encrypted file or header is not specified     |
| ERAR_EREFERENCE       | Cannot open file source for reference record               |
| ERAR_BAD_PASSWORD     | Wrong password is specified                                |

## Memory Leak

Note: although the return value `fileHeaders` and `files` are iterators, they must be traversed to the end! Otherwise the C++ object for archive extraction will not be destructed and cause memory leak.

## Example

```js
const fs = require('fs');
const unrar = require('node-unrar-js');

async function main() {
  // Read the archive file into a typedArray
  const buf = Uint8Array.from(fs.readFileSync('a.rar')).buffer;
  const extractor = await unrar.createExtractorFromData({ data: buf });

  const list = extractor.getFileList();
  const listArcHeader = list.arcHeader; // archive header
  const fileHeaders = [...list.fileHeaders]; // load the file headers

  const extracted = extractor.extract({ files: ['1.txt'] });
  // extracted.arcHeader  : archive header
  const files = [...extracted.files]; //load the files
  files[0].fileHeader; // file header
  files[0].extraction; // Uint8Array content, createExtractorFromData only
}
main();
```

## Demo in webpack

This package can also be used in browser by Webpack, please visit the [demo project](https://github.com/YuJianrong/node-unrar.js/tree/master/demo/web) to see how to use it in webpack.

## TypeScript

This module is written in [TypeScript](https://www.typescriptlang.org/), you can import it directly in TypeScript and get the benefit of static type checking and auto-complete of IDE.

## Development and Contribution

If you want to compile the module by yourself, please follow the steps below:

- Install the [docker](https://www.docker.com/)

- Download the c++ source of unRar library by:

`npm run prepare`

- Build for debug:

`npm run build:debug`

- Build for release

`npm run build:release`

- Run Test

`npm run test`

## License

This module is licensed under MIT.

### Changelog

#### 1.0.3 (2021-05-10)

- Fix for Security Vulnerability on dependencies

#### 1.0.2 (2021-04-01)

- Fix for Security Vulnerability on dependencies

#### 1.0.1 (2021-02-18)

- Add new option `filenameTransform` for `ExtractorFromFileOptions`.

#### 1.0.0 (2020-12-29)

- Refactory by the latest EMScripten and UnRar DLL source. Since both of them changed a lot, there are many breaking changes in this update
- **(Breaking change)**: Use Javascript Exception instead of tuple `[state, result]` for error handling.
- **(Breaking change)**: The extractor object return by `createExtractorFromData` and `createExtractorFromFile` are now promise object. Since loading the wasm object in the latest EMScriten is asynchronized.
- **(Breaking change)**: The `fileHeaders` and `files` returned by the extractions api are changed from array to iterator, make the extraction lazy.

#### 0.8.0:

- First release
