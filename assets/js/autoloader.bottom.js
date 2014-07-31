$(document).ready(function() {
  if(!load || !modules)
    throw Error("Required variables `load` and `modules` are not defined. " +
      "Did you include `autoloader.top.js` first?");

  if(!load.length) return;
  load.forEach(function(name) {
    console.log("AutoLoader: Loading module " + name);
    setTimeout(modules[name], 10, $);
  });
});
