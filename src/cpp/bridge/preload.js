var Ext = require("./extractorCurrent.js").Ext;

var jsAPI = {
  open:function(){
    return Ext.current.open.apply(Ext.current, arguments);
  },
  close:function(){
    return Ext.current.close.apply(Ext.current, arguments);
  },
  read:function(){
    return Ext.current.read.apply(Ext.current, arguments);
  },
  write:function(){
    return Ext.current.write.apply(Ext.current, arguments);
  },
  tell:function(){
    return Ext.current.tell.apply(Ext.current, arguments);
  },
  seek:function(){
    return Ext.current.seek.apply(Ext.current, arguments);
  },
  create:function(){
    return Ext.current.create.apply(Ext.current, arguments);
  },
};