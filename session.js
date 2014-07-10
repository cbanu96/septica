/*
 * session.js -- Session Data Handling...
 */

var sessions = {};

var Session = function(sid) {
	this.sid = sid;
	this.data = {};
	this.last_used = ((new Date().getTime()) / 1000) | 0; // created
};

Session.prototype.set = function(key, value) {
	this.data[key] = value;
};

Session.prototype.get = function(key) {
	if (this.data[key] !== undefined)
		return this.data[key];
};

Session.prototype.update = function() {
	this.last_used = ((new Date().getTime()) / 1000) | 0;
};

Session.prototype.isActive = function() {
	var current = ((new Date().getTime()) / 1000) | 0;

	if (current - this.last_used > 60 * 60)
		return false;

	return true;
}

Session.prototype.cleanup = function() {
	var self = this;
	// delete all data references, prevent any circular references
	Object.keys(self.data).forEach(function(key) {
		delete self.data[key];
	});
	// set last used timestamp to 61 minutes ago,
	// so it will be picked up by the next sweep of sessionCleanup
	this.last_used = ((new Date().getTime()) / 1000) | 0 - 61*60;
};

var sessionCleanup = function() {
	var count = 0;
	Object.keys(sessions).forEach(function(key){
		if (!sessions[key].isActive()) {
			count++;
			sessions[key].cleanup();
			delete sessions[key];
		}
	});

	return count;
};

var generateSessionToken = function () {
	var generateString = function(len) {
		var key = '';
		var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for ( var i = 0; i < len; i++ ) {
			key += chars.charAt((Math.random() * chars.length) | 0);
		}

		return key;
	};

	var sid;

	while (true) {
		sid = generateString(32);
		if (!sessions.hasOwnProperty(sid)) {
			break;
		}
	}

	return sid;
};

module.exports.lookupBySID = function(sid) {
	return sessions[sid];
}

module.exports.create = function() {
	// generate random non-conflicting string
	var sid = generateSessionToken();

	// add new session
	sessions[sid] = new Session(sid);

	return sid; // return session id.
};

module.exports.valid = function(sid) {
	if (sessions[sid] && sessions[sid].isActive())
		return true;
	return false;
};

module.exports.delete = function(sid) {
	sessions[sid] && sessions[sid].cleanup();
	delete sessions[sid];
};

module.exports.init = function() {
	setInterval(function() {
		var x = sessionCleanup();
		console.log("Cleaned up " + x + " inactive sessions.");
	}, 300000); // every 5 minutes
};