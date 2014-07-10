/**
 * server.js file
 */

var port = process.env.PORT || 8080,
	httpHandler = require('./httpHandler.js'),
	app = require('http').createServer(httpHandler),
	session = require('./session.js'),
	game = require('./game.js'),
	auth = require('./auth.js'),
	io = require('socket.io').listen(app);

/* initialize sessions */
console.log("Initializing sessions...");
session.init();

app.listen(port, function() {
	console.log("Web server is listening on " + port);
}); /* run app */

/* configuration for different environments */

io.configure('development', function() {
	io.set('log level', 4);
});

io.configure('production', function() {
	io.enable('browser client etag');
	io.enable('browser client minification');
	io.enable('browser client gzip');
	io.set('log level', 1);

	io.set('transports', ['websocket']);
	//io.set('polling duration', 10);
});

/* generate random 32-char string ai key */
ai_key = (function(len) {
	var key = '';
	var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for ( var i = 0; i < len; i++ ) {
		key += chars.charAt((Math.random() * chars.length) | 0);
	}

	return key;
})(32);

console.log("Generating AI Key... " + ai_key);

/* start AI */
var ai = require('./ai.js')(port, 10, ai_key);

/* configuration for every environment */
io.configure(function() {
	io.set('authorization', auth(io, ai_key));
});

/* pass the io and ai objects to game.js */
io.sockets.on('connection', game(io, ai));

