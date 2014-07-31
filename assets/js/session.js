/**
 * Task view controllers
 */
autoload("session", function($) {
  var socket = io.connect("/session");
  var table = $("#session-table");

  socket.on("new", function(data) {
    var session = data.session;
    var sessionRow = table.prepend(data.html);
    var dataContainer = $("#" + session.id + "-data");

    function onData(data) {
      console.log(data);
      dataContainer.append(data + "\n");
    }

    function onEnd(session) {

    }

    socket.on(session.id + "::data", onData);
    socket.on(session.id + "::end", onEnd);
  });
});
