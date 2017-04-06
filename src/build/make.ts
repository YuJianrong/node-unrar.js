import * as shjs from "shelljs";

/* tslint:disable: no-console */

let release = process.argv.indexOf("release") !== -1;

console.log("start Emscripten building");

let unrarFiles: string[] = [
  "dll",
  "qopen",

  "rar",
  "strlist",
  "strfn",
  "pathfn",
  "smallfn",
  "global",
  // "file",
  // "filefn",
  "filcreat",
  "archive",
  "arcread",
  "unicode",
  "system",
  "isnt",
  "crypt",
  "crc",
  "rawread",
  "encname",
  "resource",
  "match",
  "timefn",
  "rdwrfn",
  "consio",
  "options",
  "errhnd",
  "rarvm",
  "secpassword",
  "rijndael",
  "getbits",
  "sha1",
  "sha256",
  "blake2s",
  "hash",
  "extinfo",
  "extract",
  "volume",
  "list",
  // "find",
  "unpack",
  "headers",
  "threadpool",
  "rs16",
  "cmddata",
  "ui",
];

// unrarFiles = [];

let extraFiles: string[] = [
  "./src/cpp/bridge/bridge",
  "./src/cpp/bridge/file",
  "./src/cpp/bridge/filefn",
  "./src/cpp/bridge/find",
];

// shjs.mkdir("dist/js");

console.log(`Compile unrar`);
shjs.exec([
  "docker run --rm -v $(pwd):/src -t apiaryio/emcc emcc",
  "--bind",
  "-Wno-switch -Wno-dangling-else -Wno-logical-op-parentheses",
  "-DRARDLL",
  "-std=c++14",
  "-s ALLOW_MEMORY_GROWTH=1",
  "-s DISABLE_EXCEPTION_CATCHING=0",
  "--memory-init-file 0",
  release ? "-O3" : "-g4",
  "--js-library ./src/cpp/bridge/bridge.js",
  "--pre-js ./src/cpp/bridge/preload.js",
  "-o ./dist/js/unrar.js",
  unrarFiles.map( (file) => `./src/cpp/unrar/${file}.cpp`).join(" "),
  extraFiles.map( (file) => `${file}.cpp`).join(" "),
].join(" "));
