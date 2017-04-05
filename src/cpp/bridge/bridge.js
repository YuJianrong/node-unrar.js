
mergeInto(LibraryManager.library, {
  jsOpen: function(filename) {
    return jsAPI.open.call(null, UTF32ToString(filename));
  },
  jsCreate: function(filename){
    return jsAPI.create.call(null, UTF32ToString(filename));
  },
  jsClose: function() {
    return jsAPI.close.apply(null, arguments);
  },
  jsRead: function() {
    return jsAPI.read.apply(null, arguments);
  },
  jsWrite: function() {
    return jsAPI.write.apply(null, arguments);
  },
  jsTell: function() {
    return jsAPI.tell.apply(null, arguments);
  },
  jsSeek: function(fd, offset, method) {
    return jsAPI.seek.call(null, fd, offset, UTF8ToString(method));
  }
});