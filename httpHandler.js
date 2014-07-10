/**
 * httpHandler.js -- File handling functions
 */

var fs = require('fs'),
	zlib = require('zlib'),
	session = require('./session.js'),
	Cookies = require('cookies');

module.exports = function() {
	var writeData = function(req, res, httpcode, filepath) {
		var encodeOutput = function(req, res, httpcode, filepath) {
			setContentType(req, res, httpcode, filepath);

			var accept_encoding = req.headers['accept-encoding'];
			if (!accept_encoding)
				accept_encoding = '';

			var raw = fs.createReadStream(filepath);
			if (accept_encoding.match(/\bgzip\b/)) {
				res.setHeader("Content-Encoding", 'gzip');
				res.statusCode = httpcode;
				raw.pipe(zlib.createGzip()).pipe(res);
			} else if (accept_encoding.match(/\bdeflate\b/)) {
				res.setHeader("Content-Encoding", 'deflate');
				res.statusCode = httpcode;
				raw.pipe(zlib.createDeflate()).pipe(res);
			} else {
				res.writeHead(httpcode, {});
				res.statusCode = httpcode;
				raw.pipe(res);
			}
		};

		var setContentType = function(req, res, httpcode, filepath) {
			var extension = filepath.split('.').pop();

			if (extension == 'svg')
				res.setHeader("Content-Type", "image/svg+xml");
			else if (extension == 'js')
				res.setHeader("Content-Type", "application/javascript");
			else if (extension == 'css')
				res.setHeader("Content-Type", "text/css");
			else if (extension == 'html')
				res.setHeader("Content-Type", "text/html");
			else if (extension == 'png')
				res.setHeader("Content-Type", "image/png");
		};

		if (httpcode == 200) {
			fs.stat(filepath, function(err, stat) {
				if (err) {
					res.statusCode = 404;
					res.end(); // ADD 404 PAGE... TODO!
					return;
				}

				var etag = stat.size + '|' + Date.parse(stat.mtime);
				res.setHeader('Last-Modified', stat.mtime);
				var ifnonematch = req.headers['if-none-match'];
				if (ifnonematch == etag) {
					res.statusCode = 304;
					res.end();
					return;
				}

				res.setHeader('ETag', etag);
				encodeOutput(req, res, httpcode, filepath);
			});
		} else encodeOutput(req, res, httpcode, filepath);
	};

	var fileHandler = function (req, res) {
		var url = req.url;
		var path = req.url.split("?")[0]; /* we don't care about parameters */

		/* Remove beginning slashes and dots */
		while (path[0] == '/' || path[0] == '.')
			path = path.substr(1);

		path = (path.length === 0) ? "index.html" : path;

		if (path == 'js/const.js') {
			/* shared client-server code */
			writeData(req, res, 200, __dirname + '/const.js');
		}
		else {
			writeData(req, res, 200, __dirname + '/public/' + path);
		}
	};

	var authHandler = function(req, res) {

		var sendAuthHeaders = function(realm) {
			res.statusCode = 401;
			res.setHeader('WWW-Authenticate', 'Basic realm="' + realm + '"');
			res.end();
		};

		var authorize = function(req, check, failure, success) {
			var auth = req.headers['authorization'];
			if (!auth) {
				failure();
			} else {
				var credentials = (new Buffer(auth.split(' ')[1], 'base64').toString()).split(':');

				if (check(credentials[0], credentials[1]))
					success();
				else
					failure();
			}
		};

		fileHandler(req, res);
	};

	var sessionHandler = function (req, res) {
		if (req.url === '/' || req.url === '/index.html') {
			// sessions are only checked on / requests
			var keys = ['1fXeKFTQ1op6vL-dYD8xaNPrVBNzncW1',
						'epbk_GCo-q1dz1lSXReRKGlEDI-EffAm',
						'Gc9BNRlvDBH8FPFw65r1fRAP3uAv9X8g',
						'AjLSufqBtkZXAOI1bE8eCKnpSObrJ8dS',
						'NZfT3iMGd9SfiEogNhtTtoelfWMuOoeV'];
			var cookies = new Cookies (req, res, keys);

			var sid = cookies.get('__sid', { signed: true });
			if (sid === undefined ) {
				// tampered or no cookie

				// create new session
				var sid = session.create();
				cookies.set('__sid', sid, { signed: true });

			} else {
				// valid cookie
				// but is it a real session cookie?
				var sess = session.lookupBySID(sid);
				if (sess === undefined) {
					// not a real one
					var sid = session.create();
					cookies.set('__sid', sid, { signed: true });
				}
			}
		}

		authHandler(req, res);
	};

	return sessionHandler;
}();

