/**
 * auth.js -- Authentication authorization for incoming requests
 */

module.exports = function(io, ai_key) {
	var players = require('./players.js'),
		session = require('./session.js'),
		Cookies = require('cookies')

	var valid_username = function (username) {
		if (typeof username != 'string' && !(username instanceof String))
			return false;

		var username_regex = /^[a-zA-Z0-9]+$/;
		var ok = username.match(username_regex);

		if (username.toLowerCase() == "server")
			return false;

		if (username.substring(0,7).toLowerCase() == "gamebot")
			return false;

		if (ok && username.length >= 4 && username.length <= 16)
			return true;

		return false;
	};

	var user_online = function (username) {
		if (players.lookup(username) == -1)
			return false;
		return true;
	};

	var getSID = function(handshakeData, keys) {
		var cookie = new Cookies(handshakeData, {}, keys);

		return cookie.get('__sid', {signed: true});
	};

	var handshake = function (handshakeData, accept) {
		var query = handshakeData.query;

		/* check username */

		if (!query.hasOwnProperty('username')) {
			accept(null, false);
			return;
		}

		/* check if username is already taken */

		if (user_online(query.username)) {
			accept(null, false);
			return;
		}

		/* check if bot */

		if (query.hasOwnProperty('s_ai_key')) {
			if (query.s_ai_key == ai_key) {
				accept(null, true);
			} else {
				accept(null, false);
			}
		} else {
			/* check valid session */
			var keys = ['1fXeKFTQ1op6vL-dYD8xaNPrVBNzncW1',
						'epbk_GCo-q1dz1lSXReRKGlEDI-EffAm',
						'Gc9BNRlvDBH8FPFw65r1fRAP3uAv9X8g',
						'AjLSufqBtkZXAOI1bE8eCKnpSObrJ8dS',
						'NZfT3iMGd9SfiEogNhtTtoelfWMuOoeV'];

			var sid = getSID(handshakeData, keys);

			if (!session.valid(sid)) {
				accept(null, false);
				return;
			}

			if (!valid_username(query.username)) {
				accept(null, false);
				return;
			}

			var sess = session.lookupBySID(sid);

			if (!sess) {
				accept(null, false);
				return;
			}

			sess.set('username', query.username);
			handshakeData.sid = sid;
		}

		accept(null, true);
	};

	return handshake;
};
