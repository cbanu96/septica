/**
 * AI module
 */

module.exports = function(port, number, ai_key) {
	var io = require('socket.io-client'),
		_ = require('underscore'),
		constants = require('./const.js');

	var ai_list = [];
	var ai_counter = 0;

	var list_lookup_by_socket = function(socket) {
		for ( var i = 0, len = ai_list.length; i < len; i++ ) {
			if (ai_list[i].socket == socket)
				return i;
		}

		return -1;
	};

	var AIEventHandlerFactory = function(socket, callback) {
		var self = this;
		var fn = function () {
			var args = _.toArray(arguments);
			var ai_idx = list_lookup_by_socket(socket);
			if (ai_idx != -1 && ai_list[ai_idx]) {
				args.unshift(ai_list[ai_idx]);
				callback.apply(self, args);
			}
		};

		return fn;
	};

	var AI = function(name) {
		this.username = name;
		this.socket = io.connect('', {
			'port': port,
			'force new connection': true,
			'query': 'username=' + this.username + '&s_ai_key=' + ai_key,
			'reconnect': false
		});
		this.in_game = false;
		this.game = {
			cut: -1,
			turn: -1,
			status: -1,
			starter: -1,
			cards: [],
			player_idx: -1,
			stack: [],
			players: [],
		};
		this.timeout = null;

		this.init_handlers();
	};

	AI.prototype.emit = function() {
		var socket = this.socket;
		socket.emit.apply(socket, arguments);
	};

	AI.prototype.join = function(room_id) {
		if (this.in_game == false) {
			console.log("BOT: " + this.username + " > connecting to " + room_id);
			this.emit(constants.C_GAME_JOIN, room_id);
		}
	};

	AI.prototype.leave = function() {
		if (this.in_game == true) {
			this.emit(constants.C_GAME_LEAVE);
		}
	};

	AI.prototype.pass = function() {
		if (this.in_game == true) {
			this.emit(constants.C_GAME_PASS);
		}
	};

	AI.prototype.card = function(card_id) {
		if (this.in_game == true) {
			this.emit(constants.C_GAME_CARD, card_id);
		}
	};

	AI.prototype.log = function(msg) {
		console.log("BOT: " + this.username + " > " + msg);
	};

	AI.prototype.priority_drop = function(priority) {
		/* priority: list of ['pass', 'cut', 'point', 'other'],
		   from highest to lowest */

		/*this.log("priority_drop( " + (function(arr) {
			var text = '';
			for (var i = 0, len = arr.length; i < len; i++ ) {
				text += arr[i] + ', ';
			}
			return text;
		})(priority) + ")");*/
		var cutters = [];
		var points = [];
		var others = [];

		/* fill up those arrays */
		for (var i = 0, len = this.game.cards.length; i < len; i++ ) {
			if (this.game.cards[i].number == 7 || (this.game.cards[i].number == 8 && this.game.players.length == 3)) {
				cutters.push(i);
			}
			else if (this.game.stack.length != 0 && this.game.stack[0].number == this.game.cards[i].number) {
				cutters.push(i);
			}
			else if (this.game.cards[i].number == 10 || this.game.cards[i].number == 11) {
				points.push(i);
			}
			else {
				others.push(i);
			}
		}

		/*for ( var i = 0, len = this.game.cards.length; i < len; i++ ) {
			this.log("card " + i + ": " + this.game.cards[i].number);
		}
		this.log(cutters);
		this.log(points);
		this.log(others);*/

		for (var i = 0, len = priority.length; i < len; i++) {
			if (priority[i] == 'pass') {
				if (this.game.stack.length != 0 && this.game.starter == this.game.player_idx) {
					this.pass();
					return;
				}
			} else if (priority[i] == 'cut') {
				if (cutters.length != 0) {
					this.card(cutters[0]);
					return;
				}
			} else if (priority[i] == 'point') {
				if (points.length != 0) {
					this.card(points[0]);
					return;
				}
			} else if (priority[i] == 'other') {
				if (others.length != 0) {
					this.card(others[0]);
					return;
				}
			}
		}
	};

	AI.prototype.same_team = function(idx1, idx2) {
		if (this.game.players.length == 4) {
			if (idx1 % 2 == idx2 % 2)
				return true;
		} else {
			if (idx1 == idx2)
				return true;
		}

		return false;
	};

	AI.prototype.move = function() {
		/* Got the moves like jagger */
		if (this.game.stack.length == 0) {
			this.priority_drop(['other', 'point', 'cut', 'pass']);
		} else {
			if (!this.same_team(this.game.player_idx, this.game.cut) && this.game.cut != -1) {
				if (this.game.starter == this.game.player_idx) {
					this.priority_drop(['cut', 'pass']);
				} else {
					this.priority_drop(['cut', 'other', 'point', 'pass']);
				}
			} else {
				if (this.game.starter == this.game.player_idx) {
					this.priority_drop(['pass']);
				} else {
					this.priority_drop(['point', 'other', 'cut', 'pass']);
				}
			}
		}
	};

	AI.prototype.init_handlers = function() {
		var socket = this.socket;

		socket.on(constants.S_ERROR, 			AIEventHandlerFactory(socket, onError));
		socket.on(constants.S_UPDATE_STATUS, 	AIEventHandlerFactory(socket, onUpdateStatus));
		socket.on(constants.S_UPDATE_ROOM  , 	AIEventHandlerFactory(socket, onUpdateRoom));
		socket.on(constants.S_UPDATE_USERNAME,	AIEventHandlerFactory(socket, onUpdateUsername));
		socket.on(constants.S_UPDATE_CHAT  ,	AIEventHandlerFactory(socket, onUpdateChat));
		socket.on(constants.S_UPDATE_LIST  ,	AIEventHandlerFactory(socket, onUpdateList));
		socket.on(constants.S_UPDATE_STACK , 	AIEventHandlerFactory(socket, onUpdateStack));
		socket.on(constants.S_UPDATE_POINTS, 	AIEventHandlerFactory(socket, onUpdatePoints));
		socket.on(constants.S_UPDATE_PLAYERS , 	AIEventHandlerFactory(socket, onUpdatePlayers));
		socket.on(constants.S_UPDATE_TURN  , 	AIEventHandlerFactory(socket, onUpdateTurn));
		socket.on(constants.S_UPDATE_CUT   , 	AIEventHandlerFactory(socket, onUpdateCut));
		socket.on(constants.S_UPDATE_STARTER , 	AIEventHandlerFactory(socket, onUpdateStarter));
		socket.on(constants.S_UPDATE_CARDS , 	AIEventHandlerFactory(socket, onUpdateCards));
	};

	var onError = function(ai, error) {
		ai.log(error);
	};

	var onUpdateStatus = function(ai, data) {
		if (data.status == 'created') {
			/* set leave timeout */
			ai.timeout = setTimeout(function(){
				ai.leave();
			}, 60000); // leaves after 60 seconds of game not starting
		} else if (data.status == 'started') {
			/* clear leave timeout */
			clearTimeout(ai.timeout);
		} else if (data.status == 'stopped' || data.status == 'over') {
			/* do nothing. if game is restarted, the bot will play again unless kicked,
			 * else the server will disband the game */
		}
	};

	var onUpdateRoom = function(ai, data) {
		if (data.room == -1) {
			ai.in_game = false;
			clearTimeout(ai.timeout);
		}
		else
			ai.in_game = true;
	};

	var onUpdateUsername = function(ai, data) {

	};

	var onUpdateChat = function(ai, data) {

	};

	var onUpdateList = function(ai, data) {

	};

	var onUpdateStack = function(ai, data) {
		/* update stack */
		if (data.stack)
			ai.game.stack = data.stack;
	};

	var onUpdatePoints = function(ai, data) {

	};

	var onUpdatePlayers = function(ai, data) {
		/* update player index based on players and bot username */
		var players = data.players;
		ai.game.players = data.players;
		for (var i = 0, len = players.length; i < len; i++) {
			if (players[i] == ai.username) {
				ai.game.player_idx = i;
			}
		}
	};

	var onUpdateTurn = function(ai, data) {
			ai.game.turn = data.turn;
			if (ai.game.turn == ai.game.player_idx) {
				setTimeout(function() {
					ai.move();
				}, 1500); /* do move after 1500 ms */
			}
	};

	var onUpdateCut = function(ai, data) {
		ai.game.cut = data.cut;
	};

	var onUpdateStarter = function(ai, data) {
		ai.game.starter = data.starter;
	};

	var onUpdateCards = function(ai, data) {
		if (data.cards)
			ai.game.cards = data.cards;
	};

	var AIFactory = function() {
		var ai = new AI('GameBot' + ai_counter);
		ai_counter++;
		ai_list.push(ai);
	};

	var init = function(number) {
		for ( var i = 0; i < number; i++ )
			AIFactory();
	};

	var delegate_bot = function(room_id) {
		/* search for unused bot */
		var ai_idx = (function() {
				for ( var i = 0; i < number; i++ )
					if ( ai_list[i].in_game == false )
						return i;
				return -1;
		})();

		if (ai_idx == -1)
			return false;

		ai_list[ai_idx].join(room_id);
		return true;
	};

	init(number);

	return delegate_bot;
};
