node-unrar-js
======================
[![Build Status](https://travis-ci.org/YuJianrong/node-unrar.js.svg?branch=master)](https://travis-ci.org/YuJianrong/node-unrar.js)
[![npm version](https://badge.fury.io/js/node-unrar-js.svg)](https://badge.fury.io/js/node-unrar-js)
[![MIT License](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://www.typescriptlang.org/)

```node-unrar.js``` is a npm module to extract rar archive in pure JavaScript. It's combined by a Javascript adoption layer and JavaScript unRar library compiled by [Emscripten](http://emscripten.org/) from the [C++ unrar library](http://www.rarlab.com/rar/unrarsrc-5.4.5.tar.gz) from http://www.rarlab.com/rar_add.htm .

Installation
---------------------

You can install the module via ```npm```:

```bash
npm install node-unrar-js
```

Features
---------------------
* Fully support for RAR archive, because it comes from the official source code.
* Unicode support, for both comment and file path/name.
* API for Extraction to both memory and file system.

Unsupported Features
---------------------
* Volume archives are not supported.
* Synchronize File System IO functions are used in File Extraction for the limitation of the library.
* Files must be extracted at once now, can not be extracted one by one for progress indicator (may be improved later).

API to create the extractor
----------------------
* `createExtractorFromData(data: ArrayBuffer, password?: string)` - Create the Memory Extractor

  Options:
  * `data` : ArrayBuffer object of the RAR archive file.
  * `password` : Optional string for extraction password

* `createExtractorFromFile(filepath: string, targetPath?: string, password?: string)` - Get the File Extractor

  Options:
  * `filepath` : File path of the RAR archive file.
  * `targetPath` : Optional string target folder
  * `password` : Optional string for extraction password

API of the extractor
----------------------
* `getFileList()` : Get the file list of the archive.
  Return: `[state, result]`
  * If function call failed
    * the state will be `{state: "FAIL", reason: <FailReason>, msg: <string>}`
    * the result will be `null`.
  * When function call success
    * the state will be `{state: "SUCCESS"}`
    * the result will be like: 
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
  }, fileHeaders: [
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
    },
    // ...
  ]
}
```

* `extractAll()`: Extract all the files.

  Return: `[state, result]`
  * If function call failed, the response will be structed like return value above.
  * When function call success
    * the result will be like: 
```js
{
  arcHeader: {...} // Same as the arcHeader above
  files: [
    {
      fileHeader: {...} // Same as the fileHeader above
      extract: [state, extractedContent]
  ]
}
```
The `state` above will be same as the state of the return above, and the `extractedContent` will be `null` if file extract failed or in File extraction mode.

If extracted successful, the `extractedContent` will be `Uint8Array` object.

* ```extractFiles(files: string[], password?: string)```: Extract the specific files

  Option:
  * `files`: File path list to be extracted.
  * `password`: A different to main password may be set on these specific files.

  Return: 
  
  Same to the return value of `extractAll()`, the result will be stored in the same order of the input array `files`. If the specific file is not found in the archive, the `file` item of the `files` array will be `null`.


Example
----------------------
```js
var fs = require("fs");
var unrar = require("node-unrar-js");

// Read the archive file into a typedArray
var buf = Uint8Array.from(fs.readFileSync("a.rar")).buffer;
var extractor = unrar.createExtractorFromData(buf);

var list = extractor.getFileList();
if (list[0].state === "SUCCESS") {
  list[1].arcHeader...
  list[1].fileHeaders[...]
}

var extracted = extractor.extractAll();
var extracted = extractor.extractFiles(["1.txt", "1.txt"], "password")();
if (list[0].state === "SUCCESS") {
  list[1].arcHeader...
  list[1].files[0].fileHeader: ..
  if (list[1].files[0].extract[0].state === "SUCCESS") {
    list[1].files[0].extract[1] // Uint8Array 
  }
}

```


TypeScript
----------------------
This module is written in [TypeScript](https://www.typescriptlang.org/), you can import it directly in TypeScript and get the benefit of static type checking and auto-complete of IDE. 


Development and Contribution
----------------------
If you want to compile the module by yourself, please follow the steps below:
* Pull the docker image for Emscripten (Please install the [docker](https://www.docker.com/) at first)

``` docker pull apiaryio/emcc ```
* Download the c++ source of unRar library:

``` npm run prepare ```
* Build for debug:

``` npm run buildDebug```
* Build for release

``` npm run buildRelease```
* Run Test

``` npm run test```

## License

This module is licensed under MIT.

#### Changelog
0.8.0:

* First release

