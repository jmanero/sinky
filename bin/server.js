var Delight = require("express-delight");
var EJS = require("ejs");
var Express = require("express");
var FS = require("fs");
var HTTP = require("http");
var LevelDown = require("leveldown");
var LevelUP = require("levelup");
var Net = require("net");
var Path = require("path");
var SocketIO = require("socket.io");
var Util = require("util");
var UUID = require("libuuid");

var sessionRowTemplatePath = Path.resolve(__dirname, "../view/include/session-row.ejs");
var sessionRowTemplate = EJS.compile(FS.readFileSync(sessionRowTemplatePath, "ascii"), {
  filename: sessionRowTemplatePath
});

var db = LevelUP("./db", {
  db: LevelDown
});

var sessions = {};

function ip2Hex(address) {
  if (!Net.isIPv4(address)) throw TypeError("Input " + address + " is not a valid IPv4 address");

  return address.split(/\./g).map(function(o) {
    var hex = (+o).toString(16)
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

/**
 * Session Entity
 */
var Session = function(source) {
  this.id = UUID.create();
  this.source = ip2Hex(source);
  this.active = true;
  this.start = new Date();

  this._data = [];
  this.data = [];

  sessions[this.id] = this;
  channel.emit("new", {
    html: sessionRowTemplate({
      session: this
    }),
    session: this
  });
};

Session.prototype.push = function(data) {
  this._data.push(data);

  var hex = data.toString("hex");
  this.data.push(hex);
  console.log("Data " + hex);
  channel.emit(this.id + "::data", hex);
};

Session.prototype.error = function(err) {
  this.error = {
    name: err.name,
    code: err.code,
    message: err.message,
    stack: err.stack ? err.stack.split(/\r?\n/g) : []
  };
  channel.emit(this.id + "::error", this);
};

Session.prototype.end = function() {
  var session = this;
  this.end = new Date();
  this.active = false;

  db.put("DATA-" + this.start + "-" + this.id, Buffer.concat(this._data), {
    valueEncoding: "binary"
  }, function() {
    db.put("SESSION-" + session.start + "-" + session.id, JSON.stringify(session), function() {
      delete sessions[session.id];
      channel.emit(session.id + "::end", session);

      // Try to index by source address
      db.get("SOURCE-" + session.source, {
        valueEncoding: "json"
      }, function(err, value) {
        if(err && err.name !== "NotFoundError") return;
        if((err && err.name === "NotFoundError") || !(value instanceof Array)) value = [];

        value.push(session.start + "-" + session.id);
        db.put("SOURCE-" + session.source, JSON.stringify(value));
      });
    });
  });
};

Session.prototype.toJSON = function() {
  return ({
    id: this.id,
    source: this.source,
    active: this.active,
    error: this.error,
    start: this.start,
    end: this.end,
    data: this.data
  });
};

// Control Interface
var app = Express();
var control = HTTP.createServer(app);
var io = SocketIO(control);

var channel = io.of("/session");

// Data Receiver
var server = Net.createServer(function(socket) {
  var session = new Session(socket.remoteAddress);

  socket.on("data", function(data) {
    session.push(data);
  });
  socket.on("error", function(err) {
    session.error(err);
  });
  socket.on("close", function() {
    session.end();
  });
});
server.on("error", function(err) {
  console.log("ServerError: " + err.message);
  if (err.stack) console.log(err.stack);
});

app.set("db", db);
app.set("sessions", sessions);
app.set("channel", channel);
app.set("views", Path.resolve(__dirname, "../view"));

app.use(Delight.favicon(Path.resolve(__dirname, "../assets/blackhole.png")));
app.use("/assets", Delight.static(Path.resolve(__dirname, "../assets")));

Delight.util(app);
Delight.body(app);
app.get("/", function(req, res, next) {
  res.redirect("/session");
});

require("../lib/control/session").attach(app);
require("../lib/control/stream").attach(app);

control.listen(9575);
server.listen(443);
