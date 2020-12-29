/* global mergeInto, LibraryManager, Module, UTF32ToString, UTF8ToString */


mergeInto(LibraryManager.library, {
  jsOpen: function (filename) {
    const handle = Module.extractor.open(UTF32ToString(filename));
    Module.setTempRet0(handle /  0x100000000 | 0);
    return handle % 0x100000000;
  },
  jsCreate: function (filename) {
    const handle = Module.extractor.create(UTF32ToString(filename));
    Module.setTempRet0(handle /  0x100000000 | 0);
    return handle % 0x100000000;
  },
  jsClose: function (handleLo, handleHi) {
    return Module.extractor.close(handleLo + handleHi * 0x100000000);
  },
  jsRead: function (handleLo, handleHi, buf, size) {
    return Module.extractor.read(handleLo + handleHi * 0x100000000, buf, size);
  },
  jsWrite: function (handleLo, handleHi, buf, size) {
    return Module.extractor.write(handleLo + handleHi * 0x100000000, buf, size);
  },
  jsTell: function (handleLo, handleHi) {
    const pos = Module.extractor.tell(handleLo + handleHi * 0x100000000);
    Module.setTempRet0(pos /  0x100000000 | 0);
    return pos % 0x100000000;
  },
  jsSeek: function (handleLo, handleHi, offsetLo, offsetHi, method) {
    return Module.extractor.seek(handleLo + handleHi * 0x100000000, offsetLo + offsetHi * 0x100000000, UTF8ToString(method));
  },
});
