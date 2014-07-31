(function autoloaderTop(global) {
  global.modules = {};
  global.load = [];

  global.autoload = function(name, module) {
    global.modules[name] = module;
    global.load.push(name);
  };
})(window);
