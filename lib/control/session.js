exports.attach = function(app) {
  var db = app.get("db");
  var current = app.get("sessions");

  app.get("/session", function(req, res, next) {
    var startToken = req.query.from || "SESSIOO";
    var reader = db.createReadStream({
      end: "SESSION",
      start: startToken,
      limit: req.query.limit || 100,
      reverse: true,
      valueEncoding: "json"
    });

    var endToken, sessions = [];
    reader.on('data', function(data) {
      endToken = data.key;
      sessions.push(data.value);
    });

    reader.on("end", function() {
      res.render("session-list.ejs", {
        current: current,
        currentKeys: Object.keys(current).sort(),
        sessions: sessions,
        token: endToken
      });
    });
  });
};
