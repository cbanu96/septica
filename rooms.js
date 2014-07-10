/**
 * rooms.js -	Keeps track of room status, 
 *				game logic, etc.			
 */

var players = require('./players'),
	constants = require('./const.js');

var room_list = [];

/**
 * Module private functions
 */

/**
 * Generates an Object {number: x, type: y} representing a card
 *
 * @param {Integer} 7-14 card
 * @param {Character} 'S' - spades, 'H' - hearts, 'C' - clubs, 'D' - diamonds
 */
var generate_card = function(card_number, card_type) {
	return {
		number: card_number,
		type: card_type
	};
};

/**
 * Generates the deck, given the number of players
 *
 * @param {Integer} # of players
 */
var generate_deck = function(players) {
	var deck = [];

	deck.push(generate_card(7, 'S'));
	deck.push(generate_card(7, 'H'));
	deck.push(generate_card(7, 'C'));
	deck.push(generate_card(7, 'D'));

	if (players == 3) {
		deck.push(generate_card(8, 'S'));
		deck.push(generate_card(8, 'C'));
	} else {
		deck.push(generate_card(8, 'S'));
		deck.push(generate_card(8, 'H'));
		deck.push(generate_card(8, 'C'));
		deck.push(generate_card(8, 'D'));
	}

	for ( var i = 9; i <= 14; i++ ) {
		deck.push(generate_card(i, 'S'));
		deck.push(generate_card(i, 'H'));
		deck.push(generate_card(i, 'C'));
		deck.push(generate_card(i, 'D'));
	}

	return shuffle_array(deck);
};

/**
 * Generic function for shuffling an array
 *
 * @param {Array}
 */
var shuffle_array = function(array) {
	var idx = array.length, tmp, swap_idx;

	while (idx--) {
		swap_idx = (Math.random() * (idx+1)) | 0;

		tmp = array[idx]; array[idx] = array[swap_idx]; array[swap_idx] = tmp;
	}

	return array;
};

/**
 * Room constructor
 *
 * @param {String} room name
 * @param {Player} host player
 * @param {Integer} room id
 * @param {Integer} player limit
 */
var Room = function (room_name, host_player, room_id, player_limit) {
	/* General room information */
	this.room_name = room_name;
	this.room_id = room_id;
	this.ts_created = ((new Date().getTime()) / 1000) | 0;

	/* Player-related room information */
	this.players = [host_player];
	this.host_player = host_player;
	this.host_socket = host_player.get_socket();
	this.host_username = host_player.get_username();
	this.player_limit = player_limit;
	
	/* Game-related room information */
	this.game_type = -1; /* unknown, will be set when game starts */
	this.card_deck = [];
	this.card_stack = [];
	this.turn_starter = -1; /* unknown */
	this.last_cut = -1; /* unknown, chosen on card drops */
	this.player_turn = -1; /* unknown */
	this.player_cards = [];
	this.player_pts = [];
	for ( var i = 0; i < player_limit; i++ ) /* create empty bidimensional array */
		this.player_cards.push([]);

	/** game status:
	 * -> created
	 * -> started
	 * -> stopped
	 * -> over
	 *
	 * normal game workflow: created -> started -> over
	 * player leave or server error workflow: created -> started -> stopped 
	 */

	this.game_status = 'created';

	this.turn_timeout = null;
};

/**
 * Room prototype functions
 */

/**
 * Starts game, prepares card deck, stack, player cards, etc.
 *
 * @param {Socket} socket attempting to start game
 */
Room.prototype.start_game = function(socket) {
	if (socket == this.host_socket) {
		if (!(this.players.length > 1 && this.players.length <= this.player_limit)) {
			this.host_player.send_error("Not enough players to start the game.");
			return;
		}
		this.game_status = 'started'; /* prevent players from joining anymore */
		this.game_type = this.players.length;
		/* generate random card deck */
		this.card_deck = generate_deck(this.game_type);
		/* hand out beginning cards to players and set player points to 0 */
		for ( var i = 0, len = this.game_type; i < len; i++ ) {
			while(this.give_card(this.players[i]));
			this.player_pts.push(0);
		}
		/* randomly choose beginning player */
		this.set_turn((Math.random() * this.game_type) | 0);

		this.send_update(['stack', 'points', 'players', 'cards', 'status', 'turn']);	
	}
};

Room.prototype.set_turn = function(turn) {
	this.player_turn = turn;
	
	if (this.turn_timeout)
		clearTimeout(this.turn_timeout);

	var turn = this.player_turn,
		self = this;

	this.turn_timeout = setTimeout(function() {
		/* drop random card */
		self.drop_card_ai(turn);
	}, constants.TURN_TIME_LIMIT * 1000);
};

Room.prototype.drop_card_ai = function(player_idx) {
	var cards = this.player_cards[player_idx];
	var self = this;
	var player = this.players[player_idx];
	
	if (!cards || !self || !player)
		return;

	var priority_drop = function(priority) {
		/* priority: list of ['pass', 'cut', 'point', 'other'],
		   from highest to lowest */

		var cutters = [];
		var points = [];
		var others = [];

		/* fill up those arrays */
		for (var i = 0, len = cards.length; i < len; i++ ) {
			if (cards[i].number == 7 || (cards[i].number == 8 && self.players.length == 3)) {
				cutters.push(i);
			}
			else if (self.card_stack.length != 0 && self.card_stack[0].number == cards[i].number) {
				cutters.push(i);
			}
			else if (cards[i].number == 10 || cards[i].number == 11) {
				points.push(i);
			}
			else {
				others.push(i);
			}
		}

		for (var i = 0, len = priority.length; i < len; i++) {
			if (priority[i] == 'pass') {
				if (self.card_stack.length != 0 && self.turn_starter == player_idx) {
					self.pass_turn(player);
					return;
				}
			} else if (priority[i] == 'cut') {
				if (cutters.length != 0) {
					self.drop_card(player, cutters[0]);
					return;
				}
			} else if (priority[i] == 'point') {
				if (points.length != 0) {
					self.drop_card(player, points[0]);
					return;
				}
			} else if (priority[i] == 'other') {
				if (others.length != 0) {
					self.drop_card(player, others[0]);
					return;
				}
			}
		}
	};

	var same_team = function(idx1, idx2) {
		if (self.players.length == 4) {
			if (idx1 % 2 == idx2 % 2)
				return true;
		} else {
			if (idx1 == idx2)
				return true;
		}

		return false;
	};

	var move = function() {
		if (self.card_stack.length == 0) {
			priority_drop(['other', 'point', 'cut', 'pass']);
		} else {
			if (!same_team(player_idx, self.last_cut) && self.last_cut != -1) {
				if (self.turn_starter == player_idx) {
					priority_drop(['cut', 'pass']);
				} else {
					priority_drop(['cut', 'other', 'point', 'pass']);
				}
			} else {
				if (self.turn_starter == player_idx) {
					priority_drop(['pass']);
				} else {
					priority_drop(['point', 'other', 'cut', 'pass']);
				}
			}
		}
	};

	move();
};

/**
 * Removes one card from the top of the deck and hands it to a player.
 *
 * @param {Player} Player Object
 */
Room.prototype.give_card = function (player) {
	if (this.card_deck.length === 0) /* no cards left */
		return false;

	var player_idx = this.find_player(player);

	if (this.player_cards[player_idx].length == 4) /* full hand */
		return false;

	this.player_cards[player_idx].push(this.card_deck.pop());

	return true;
};

/**
 * Game action: drops player's card onto the card stack, updates the
 * 				last cut, if appropriate, and updates player turn.
 *
 * @param {Player} player 
 * @param {Integer} card id
 */
Room.prototype.drop_card = function (player, card_id) {
	var player_idx = this.find_player(player);

	if (player_idx != this.player_turn)
		return 0;

	if (player_idx == this.last_cut)
		return -1;

	var card = this.player_cards[player_idx][card_id];

	if (this.card_stack.length !== 0 && player_idx == this.turn_starter) {
		if (this.game_type == 3 && card.number != 8 && card.number != 7 && card.number != this.card_stack[0].number)
			return -2;
		if (this.game_type != 3 && this.card_stack[0].number != card.number && card.number != 7)
			return -2;
	}

	if (this.card_stack.length === 0)
		this.turn_starter = player_idx;

	this.card_stack.push(card); /* drop card */

	/* check for cutting */
	if (this.game_type == 3 && card.number == 8)
		this.last_cut = player_idx;
	if (this.card_stack[0].number == card.number || card.number == 7)
		this.last_cut = player_idx;

	this.player_cards[player_idx].splice(card_id, 1);

	/* update turn */
	var turn = this.player_turn + 1;
	if (turn == this.game_type)
		turn = 0;

	this.set_turn(turn);

	if (this.card_stack.length === 1)
		this.send_update(['starter']);
	this.send_update(['stack', 'cards', 'turn', 'cut']);

	return true;
};

/**
 * Game action: if current player began this hand turn, he can choose to pass,
 *				even if he can cut.
 *
 * @param {Player} player 
 */
Room.prototype.pass_turn = function (player) {
	var player_idx = this.find_player(player);

	if (player_idx != this.player_turn)
		return false;

	/* check if player began hand */
	if (this.turn_starter != player_idx)
		return false;

	/* add points */
	var pts = 0;
	for ( var i = 0, len = this.card_stack.length; i < len; i++ ) {
		if (this.card_stack[i].number == 10 || this.card_stack[i].number == 11 /* Ace */) {
			pts++;
		}
	}

	this.player_pts[this.last_cut] += pts; /* last cutter gets the points */
	this.card_stack = []; /* reset the stack */

	/* update points */
	this.send_update(['points', 'stack']);

	/* reset turn */
	this.reset_turn();

	return true;
};

/**
 * Game helper action: resets turn, starter, cutter, cards, etc.
 * Called after pass_turn()
 */
Room.prototype.reset_turn = function () {
	/* if no cards are left in game, stop the game */
	if (this.card_deck.length === 0) {
		var cards_in_game = false;
		for ( var i = 0, len = this.game_type; i < len && !cards_in_game; i++ ) {
			if (this.player_cards[i].length > 0)
				cards_in_game = true;
		}

		if (!cards_in_game) {
			this.stop_game(false); /* no error */

			return;
		}
	}
	this.turn_starter = -1; /* reset starter */
	this.set_turn(this.last_cut); /* last cutter becomes the turn starter */
	this.last_cut = -1;
	for ( var j = 0; j < 4; j++ ) {
		for ( var i = 0, len = this.game_type; i < len; i++ ) {
			if (!this.give_card(this.players[i]))
				break; /* cards are over or player has 4 cards */
		}
	}

	/* update */
	this.send_update(['turn', 'cut', 'cards', 'starter']);
};

/**
 * Gets number of cards in a player's hand
 *
 * @param {Player}
 */
Room.prototype.number_cards = function (player) {
	var player_idx = this.find_player(player);
	if (player_idx != -1)
		return this.player_cards[player_idx].length;
	return 0;
};

/**
 * Returns player id if this player object is in this game room or -1 if not.
 *
 * @param {Player} Player Object
 */
Room.prototype.find_player = function (player) {
	for ( var i = 0, len = this.players.length; i < len; i++ ) {
		if (player == this.players[i])
			return i;
	}

	return -1;
};

/**
 * Returns player id if this socket object is in this game room or -1 if not.*
 *
 * @param {Socket} Socket
 */
Room.prototype.find_socket = function(socket) {
	for ( var i = 0, len = this.players.length; i < len; i++ ) {
		if (socket == this.players[i].get_socket())
			return i;
	}

	return -1;
};

/**
 * Adds player to this room
 *
 * @param {Player} Player Object
 */
Room.prototype.add_player = function (player) {
	var idx = this.find_player(player);
	if (idx != -1)
		return false;

	if (this.game_status == 'started' || this.game_status == 'over' || this.game_status == 'stopped') 
		return false; /* can't add players within a running or ended game */

	if (this.players.length == this.player_limit)
		return false; /* no more open slots */

	if (this.game_status == 'created') {
		this.players.push(player);
	}

	this.send_chat_message('SERVER', player.get_username() + " has joined the room.");
	player.set_current_room(this);
	player.send_update(['status']);
	this.send_update(['players']);

	return true;
};

/**
 * Removes player from this room
 *
 * @param {Player} Player Object
 */
Room.prototype.remove_player = function (player) {
	var idx = this.find_player(player);
	if (idx == -1)
		return false;

	/* clean up arrays */

	if (this.game_status == 'started') 
		return false; /* can't modify players within a running game */

	if (this.game_status == 'created') {
		this.players.splice(idx, 1);

		this.send_update(['players']);
		this.send_chat_message('SERVER', player.get_username() + " has left.");
	}

	if (this.game_status == 'over' || this.game_status == 'stopped') {
		this.players.splice(idx, 1);
		this.player_cards.splice(idx, 1);
		this.player_pts.splice(idx, 1);
	}

	/* unset player room */
	player.unset_current_room();
	this.send_update('players');

	return true;
};

Room.prototype.kick_player = function (idx) {
	if (!this.players[idx])
		return true;

	if (this.players[idx] == this.host_player)
		return false; /* can't kick host */

	var player = this.players[idx];

	this.players.splice(idx, 1);

	this.send_update(['players']);
	this.send_chat_message('SERVER', player.get_username() + " has left.");

	/* unset player room */
	player.unset_current_room();
	player.send_error("You have been kicked by the host.");
	this.send_update('players');

	return true;
};

/**
 * Sets the order of the players, given an array based on the previous order
 *
 * @param {Array} a permutation of [0, 1, 2, 3]
 */
Room.prototype.set_order = function(perm) {
	var temp_players_array = [];
	if (this.players.length != perm.length)
		return false;

	for ( var i = 0, len = perm.length; i < len; i++ ) {
		if (perm[i] != 0 && perm[i] != 1 && perm[i] != 2 && perm[i] != 3)
			return false; /* invalid permutation */
		temp_players_array.push(this.players[perm[i]]);
	}

	this.players = temp_players_array;

	delete temp_players_array;

	/* send update */
	this.send_update('players');
	return true;
};

/**
 * Disbands room, kicking all players and sending them updates.
 */
Room.prototype.disband = function(no_send_err) {
	for ( var i = 0, len = this.players.length; i < len; i++ ) {
		if (this.players[i]) {
			this.players[i].unset_current_room();
			if (!no_send_err)
				this.players[i].send_error("Your game was disbanded.");

			delete this.players[i];
		}
	}
};

/**
 * Sets game status to stopped if err, or to over if !err
 *
 * @param {Error} err
 */
Room.prototype.stop_game = function(err) {
	clearInterval(this.turn_timeout);

	this.game_status = 'over';

	if(err) {
		this.game_status = 'stopped';
	} else {
		this.send_chat_message('SERVER', "Game over.");
	}

	this.send_update(['status']);

	var room = this,
		room_id = this.room_id;

	setTimeout(function() {
		clean_up_fn(room, room_id);
	}, 30000);
	/* in 30 seconds, either players will have left, or they will have been forced to leave */
};

/**
 * Restarts game, same players.
 */
Room.prototype.restart_game = function() {
	if (this.game_status != 'over')
		return;

	this.game_status = 'created';
	
	/* Game-related room information */
	this.game_type = -1; /* unknown, will be set when game starts */
	this.card_deck = [];
	this.card_stack = [];
	this.turn_starter = -1; /* unknown */
	this.last_cut = -1; /* unknown, chosen on card drops */
	this.player_turn = -1; /* unknown */
	this.player_cards = [];
	this.player_pts = [];
	for ( var i = 0; i < this.player_limit; i++ ) /* create empty bidimensional array */
		this.player_cards.push([]);

	this.send_update(['status', 'players']);

	players.list_inactive().forEach(function(player) {
		update_list(player);
	});
};

/**
 * Deletes room and its players' rooms,
 * preventing circular reference. ++GC!
 *
 * @param {Room} rooms
 * @param {Integer} room id, to make sure the player hasn't joined another room meanwhile
 */
var clean_up_fn = function(room, room_id) {
	if (room.game_status != 'over' && room.game_status != 'stopped')
		return;
	/* check if it's the same room */
	if (room.room_id != room_id)
		return;
	/* first, disband the room */
	room.disband(true);

	var room_idx = exports.lookup_by_host_socket(room.host_socket);
	exports.delete(room_idx);

	players.list_inactive().forEach(function(player) {
		update_list(player);
	});
};

/**
 * Gets all the usernames in the room
 */
Room.prototype.get_player_usernames = function() {
	var list = [];
	for ( var i = 0, len = this.players.length; i < len; i++ ) {
		list.push(this.players[i].get_username());
	}

	return list;
};

/**
 * Send room update event to clients
 *
 * @param {Array} Array containing keywords: 'stack', 'points', 'players', 'cards', 'status', 'turn', 'cut'
 */
Room.prototype.send_update = function(what) {
	for ( var i = 0, len = this.players.length; i < len; i++ ) {
		if (what.indexOf('stack') != -1) {
			this.players[i].emit(constants.S_UPDATE_STACK, {'stack': this.card_stack});
		}

		if (what.indexOf('points') != -1) {
			this.players[i].emit(constants.S_UPDATE_POINTS, {'points': this.player_pts});
		}

		if (what.indexOf('status') != -1) {
			this.players[i].emit(constants.S_UPDATE_STATUS, {'status': this.game_status});
		}

		if (what.indexOf('players') != -1) {
			var players = [];

			for ( var j = 0, len = this.players.length; j < len; j++ )
				players.push(this.players[j].get_username());

			this.players[i].emit(constants.S_UPDATE_PLAYERS, {'players': players});
		}

		if (what.indexOf('turn') != -1) {
			this.players[i].emit(constants.S_UPDATE_TURN, {'turn': this.player_turn});
		}

		if (what.indexOf('cut') != -1) {
			this.players[i].emit(constants.S_UPDATE_CUT, {'cut': this.last_cut});
		}

		if (what.indexOf('starter') != -1) {
			this.players[i].emit(constants.S_UPDATE_STARTER, {'starter': this.turn_starter});
		}

		if (what.indexOf('cards') != -1) {
			this.players[i].emit(constants.S_UPDATE_CARDS, {'cards': this.player_cards[i]});
		}
	}	
};

/**
 * Send chat message to clients
 *
 * @param {String} sender
 * @param {String} message
 */
Room.prototype.send_chat_message = function(sender, message) {
	message = message.trim(' ');
	if (message.length === 0)
		return;
	
	for ( var i = 0, len = this.players.length; i < len; i++ ) {
		if (this.players[i]) {
			this.players[i].emit(constants.S_UPDATE_CHAT, {
				'chat': {
					'sender': sender,
					'message': message
				}
			});
		}
	}
};

/**
 * Module exports
 */

/**
 * Creates a room and returns its id
 *
 * @param {String} room name
 * @param {Player} host player
 * @param {Integer} player limit
 */
exports.create = function(room_name, host_player, player_limit) {
	var idx = room_list.length;
	var room = new Room(room_name, host_player, idx, player_limit);
	host_player.set_current_room(room);
	room_list.push(room);
	room.send_update(['status']);
	room.send_update(['players']);
	room.send_chat_message('SERVER', "Game created.");

	return idx;
};

/**
 * Searches by host socket, returns game id.
 *
 * @param {Socket} player socket
 */
exports.lookup_by_host_socket = function(socket) {
	for ( var i = 0, len = room_list.length; i < len; i++ ) {
		if (room_list[i]) {
			if (room_list[i].host_socket == socket) {
				return i;
			}
		}
	}
	return -1;
};


/**
 * Searches by player socket, returns game id.
 *
 * @param {Socket} player socket
 */
exports.lookup_by_socket = function(socket) {
	for (var i = 0, len = room_list.length; i < len; i++) {
		if (room_list[i]) {
			if (room_list[i].find_socket(socket) != -1)
				return i;
		}
	}

	return -1;
};

/**
 * Obtains Room object from room id
 *
 * @param {Integer} player id
 */
exports.object_at = function(id) {
	if (room_list[id])
		return room_list[id];
	else
		return null;
};

/**
 * Deletes room at id
 *
 * @param {Integer} room id
 */
exports.delete = function(id) {
	if (id != -1 && room_list[id]) {
		/* delete this room */
		delete room_list[id];
	}
};

/**
 * Updates game list, given sockets.
 *
 * @param {Socket} socket(s)
 */
var update_list = exports.update_list = function(socket) {
	var list = [];

	for ( var i = 0, len = room_list.length; i < len; i++ ) {
		if (room_list[i]) {
			if (room_list[i].game_status == 'created') {
				dict = {
					'id': room_list[i].room_id,
					'name': room_list[i].room_name,
					'players': room_list[i].get_player_usernames(),
					'count': room_list[i].players.length,
					'max': room_list[i].player_limit,
					'host': room_list[i].host_username
				};
				
				list.push(dict);
			}
		}
	}

	socket.emit(constants.S_UPDATE_LIST, {
		'list': list
	});
};

/**
 * Checks for validity of room name
 *
 * @param {String} room name
 */
exports.valid_name = function (name) {
	if (typeof name != 'string' && !(name instanceof String))
		return false;

	var name_regex = /^[a-zA-Z0-9 ]+$/;
	var ok = name.match(name_regex);

	if (ok && name.length >= 4 && name.length <= 16)
		return true;
	
	return false;
};