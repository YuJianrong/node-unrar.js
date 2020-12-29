import * as shjs from 'shelljs';

const release = process.argv.indexOf('release') !== -1;

console.log('start Emscripten building');

const unrarFiles: string[] = [
  'dll',
  'qopen',

  'rar',
  'strlist',
  'strfn',
  'pathfn',
  'smallfn',
  'global',
  // "file",
  // "filefn",
  'filcreat',
  'archive',
  'arcread',
  'unicode',
  'system',
  'isnt',
  'crypt',
  'crc',
  'rawread',
  'encname',
  'resource',
  'match',
  'timefn',
  'rdwrfn',
  'consio',
  'options',
  'errhnd',
  'rarvm',
  'secpassword',
  'rijndael',
  'getbits',
  'sha1',
  'sha256',
  'blake2s',
  'hash',
  'extinfo',
  'extract',
  'volume',
  'list',
  // "find",
  'unpack',
  'headers',
  'threadpool',
  'rs16',
  'cmddata',
  'ui',
];

const extraFiles: string[] = [
  './src/cpp/bridge/bridge',
  './src/cpp/bridge/file',
  './src/cpp/bridge/filefn',
  './src/cpp/bridge/find',
];

console.log(`Compile unrar`);
shjs.exec(
  [
    'docker run --rm -v $(pwd):/src -t -u $(id -u):$(id -g) emscripten/emsdk:2.0.11 emcc',
    '--bind',
    '-Wno-switch -Wno-dangling-else -Wno-logical-op-parentheses',
    '-DRARDLL',
    '-std=c++17',
    '-s MODULARIZE',
    '-s ALLOW_MEMORY_GROWTH=1',
    // '-s EXPORT_ES6=1',
    // '-s USE_ES6_IMPORT_META=0',
    '-s FILESYSTEM=0',
    '-s DISABLE_EXCEPTION_CATCHING=0',
    '-s FETCH_SUPPORT_INDEXEDDB=0',
    // '-s WASM=0',
    `-s EXTRA_EXPORTED_RUNTIME_METHODS='["setTempRet0"]'`,
    '--memory-init-file 0',
    release ? '-O3' : '-g3',
    // release ? '' : '--source-map-base ./dist/js/',
    '--js-library ./src/cpp/bridge/bridge.js',
    '-o ./dist/js/unrar.js',
    unrarFiles.map((file) => `./src/cpp/unrar/${file}.cpp`).join(' '),
    extraFiles.map((file) => `${file}.cpp`).join(' '),
  ].join(' '),
);
