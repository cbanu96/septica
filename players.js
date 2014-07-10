/**
 * players.js -- Contains player data, player lookup, handling code for player login, logout, etc.
 */

var _ = require('underscore'),
	constants = require('./const.js');

var player_list = [];

/* Player class implementation */

/**
 * Player constructor
 *
 * @param {String} player username
 * @param {Socket} player socket
 * @param {Integer} player id
 */
var Player = function(username, socket, player_id, is_bot) {
	this.username = username;
	this.socket = socket;
	this.player_id = player_id;
	this.is_bot = is_bot;
	this.ts_created = ((new Date().getTime()) / 1000) | 0; /* seconds since epoch */
	this.current_room = null; /* No room yet */
	this.requests_counter = 0;
	this.reset_interval = null;

	var self = this;
	this.reset_interval = setInterval(function() {
		self.reset_requests();
	}, 5000);
};

/**
 * Reset requests counter
 */
Player.prototype.reset_requests = function() {
	this.requests_counter = 0;
};

/**
 * Increment requests counter
 */
Player.prototype.increment_requests = function() {
	this.requests_counter++;
};

/**
 * Check if requests limit is reached
 */
Player.prototype.request_limit_reached = function() {
	if (this.requests_counter >= constants.REQUESTS_LIMIT) {
		return true;
	}
	return false;
};

/**
 * Emit event on targeted player
 */
Player.prototype.emit = function() {
	var socket = this.socket;
	socket.emit.apply(socket, arguments);
};

/**
 * Send error to player
 *
 * @param {String} error message
 */
Player.prototype.send_error = function(error_message) {
	this.emit(constants.S_ERROR, error_message);
};

/**
 * Send an update to player
 *
 * @param {Array} choose from ['room', ...].
 */
Player.prototype.send_update = function(what) {
	var room = this.get_current_room();
	if (what.indexOf('room') != -1) {
		if (room) {
			this.emit(constants.S_UPDATE_ROOM, {
				'room': room.room_id,
				'room_name': room.room_name,
				'room_host': room.host_username
			});
		} else this.emit(constants.S_UPDATE_ROOM, {'room': -1});
	}

	if (what.indexOf('username') != -1)
		this.emit(constants.S_UPDATE_USERNAME, {'username': this.get_username()});

	if (what.indexOf('status') != -1) {
		if (room) {
			this.emit(constants.S_UPDATE_STATUS, {'status': room.game_status});
		}
	}
};

/**
 * Getter functions
 */
Player.prototype.get_username = function() {
	return this.username;
};

Player.prototype.get_socket = function() {
	return this.socket;
};

Player.prototype.get_id = function() {
	return this.player_id;
};

Player.prototype.get_ts_created = function () {
	return this.ts_created;
};

Player.prototype.get_current_room = function () {
	return this.current_room;
};

/**
 * Setter functions
 */

/**
 * @param {Room} room
 */
Player.prototype.set_current_room = function(room) {
	this.current_room = room;
	this.send_update(['room']);
};

Player.prototype.unset_current_room = function() {
	this.current_room = null;
	this.send_update(['room']);
};

/**
 * Send chat message to room
 *
 * @param {String} message
 */
Player.prototype.send_chat_message = function(msg) {
	if (this.get_current_room() == null) {
		return;
	}
	
	var room = this.get_current_room();
	room.send_chat_message(this.get_username(), msg);
};

/**
 * Create player, return player index
 *
 * @param {String} player username
 * @param {Socket} player socket
 * @param {Boolean} is this player a bot?
 */
exports.create = function(username, socket, is_bot) {
	var idx = player_list.length;
	var player = new Player(username, socket, idx, is_bot);
	player_list.push(player);

	return idx;
};

/**
 * Checks for existing username, returns player id.
 *
 * @param {String} player username
 */
exports.lookup = function(username) {
	for ( var i = 0, len = player_list.length; i < len; i++ ) {
		if (player_list[i]) {
			if (player_list[i].username == username) {
				return i;
			}
		}
	}
	return -1;
};

/**
 * Checks for existing socket, returns player id.
 *
 * @param {Socket} player socket
 */
exports.lookup_by_socket = function(socket) {
	for ( var i = 0, len = player_list.length; i < len; i++ ) {
		if (player_list[i]) {
			if (player_list[i].socket == socket) {
				return i;
			}
		}
	}
	return -1;
};

/**
 * Obtains Player object from player id
 *
 * @param {Integer} player id
 */
exports.object_at = function(id) {
	if (player_list[id])
		return player_list[id];
	else
		return null;
};

/**
 * Deletes player at id
 *
 * @param {Integer} Player object
 */
exports.delete = function(id) {
	if (id != -1 && player_list[id]) {
		clearInterval(player_list[id].reset_interval);
		delete player_list[id];
	}
};

/**
 * Gets all players not in game and not bots.
 */
exports.list_inactive = function() {
	var list = [];
	for ( var i = 0, len = player_list.length; i < len; i++ ) {
		if (player_list[i]) {
			if (!player_list[i].is_bot && (player_list[i].get_current_room() == null || player_list[i].get_current_room().game_status == 'over' || player_list[i].get_current_room().game_status == 'stopped')) {
				list.push(player_list[i]);
			}
		}
	}

	return list;
};