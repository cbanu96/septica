/**
 * game.js -- Incoming event handlers and outgoing events.
 */

module.exports = function(io, ai) {
	var _ = require('underscore'),
		players = require('./players.js'),
		rooms = require('./rooms.js'),
		session = require('./session.js'),
		constants = require('./const.js');

	var eventHandlerFactory = function(socket, callback) {
		var self = this;
		var fn = function () {
			var args = _.toArray(arguments);
			args.unshift(socket);

			callback.apply(self, args);
		};

		return fn;
	};

	var socketToPlayer = function(socket, callback) {
		var player_idx = players.lookup_by_socket(socket);
		var player = players.object_at(player_idx);

		if (!player) {
			/* no player found with this socket... */
			socket.disconnect();
			return;
		}

		if (player.request_limit_reached()) {
			player.send_error("Request limit reached, wait a few seconds.");
			return;
		}

		player.increment_requests();

		if (!socket.is_bot) {
			/* refresh session last used timestamp */
			session.lookupBySID(socket.handshake.sid).update();
		}

		callback(null, player);
	};

	var socketToRoom = function(socket, callback) {
		socketToPlayer(socket, function(err, player) {
			var player_room = player.get_current_room();
			if (!player_room) {
				callback(true, player, null);
			} else {
				callback(null, player, player_room);
			}
		});
	};

	var onGameOrder = function(socket, array) {
		socketToRoom(socket, function(err, player, room) {
			if (err) {
				player.send_error("You have not joined a game.");
				return;
			}

			if (room.game_status != 'created') {
				player.send_error("You can't modify the order after the game has started.");
				return;
			}

			if (room.host_player != player) {
				player.send_error("Only the host can modify player order.");
				return;
			}

			if (!room.set_order(array)) {
				player.send_error("Invalid player order.");
				return;
			}
		});
	};

	var onGameCreate = function(socket, game_name, player_limit) {
		socketToRoom(socket, function(err, player, room) {
			if (!err) {
				player.send_error("You are already hosting a game...");
				return;
			}

			if (!rooms.valid_name(game_name)) {
				player.send_error("Invalid title for the game.");
				return;
			}

			player_limit = parseInt(player_limit);
			if (!player_limit || player_limit < 2 || player_limit > 4) {
				player.send_error("Invalid player limit: values 2, 3, or 4 permitted");
				return;
			}

			var game_idx = rooms.create(game_name, player, player_limit);
			players.list_inactive().forEach(function(player) {
				rooms.update_list(player);
			});
		});
	};

	var onGameJoin = function(socket, game_id) {
		socketToRoom(socket, function(err, player, room) {
			if (!err) {
				player.send_error("You are already hosting a game...");
				return;
			}

			var game_room = rooms.object_at(game_id);
			if (!game_room) {
				player.send_error("Game not found.");
				return;
			}

			var result = game_room.add_player(player);
			if (!result) {
				player.send_error("That game is full or has already started.");
				return;
			}

			players.list_inactive().forEach(function(player) {
				rooms.update_list(player);
			});
		});
	};

	var onGameLeave = function(socket) {
		socketToRoom(socket, function(err, player, room) {
			if (room) {
				if (room.host_player == player) {
					room.stop_game(true); /* host leaving... stop it, stop it with fire! */
					room.disband();
				} else if (room.game_status != 'started') {
					room.remove_player(player);
				}

				players.list_inactive().forEach(function(player) {
					rooms.update_list(player);
				});
			}
		});
	};

	var onDisconnect = function(socket) {
		socketToRoom(socket, function(err, player, room) {
			if (room) {
				if (room.host_player == player || room.game_status == 'started') {
					room.stop_game(true); /* player leaving... stop it, stop it with fire! */
					room.remove_player(player);
					room.disband();
				} else {
					room.remove_player(player);
				}

				players.list_inactive().forEach(function(player) {
					rooms.update_list(player);
				});
			}

			players.delete(players.lookup_by_socket(socket));
		});
	};

	var onGameStart = function(socket) {
		socketToRoom(socket, function(err, player, room) {
			if (err) {
				player.send_error("You have not joined a game.");
				return;
			}

			if (room.game_status != 'created') {
				player.send_error("The game has already started.");
				return;
			}

			if (room.host_player != player) {
				player.send_error("Only the host can start the game.");
				return;
			}

			room.start_game(player.get_socket());

			players.list_inactive().forEach(function(player) {
				rooms.update_list(player);
			});
		});
	};

	var onGameCard = function(socket, card_id) {
		socketToRoom(socket, function(err, player, room) {
			if (err) {
				player.send_error("You have not joined a game.");
				return;
			}

			if (room.game_status != 'started') {
				player.send_error("The game hasn't started yet.");
				return;
			}

			card_id = parseInt(card_id);
			if (isNaN(card_id) ||
				card_id < 0	||
				card_id >= room.number_cards(player)) {
				player.send_error("Invalid card id.");
				return;
			}

			var result = room.drop_card(player, card_id);
			if (result === 0) {
				player.send_error("Not your turn.");
				return;
			}

			if (result === -1) {
				player.send_error("Nobody cut you, you must take the cards on the table.");
				return;
			}

			if (result === -2) {
				player.send_error("You can't cut with that card.");
				return;
			}
		});
	};

	var onGamePass = function(socket) {
		socketToRoom(socket, function(err, player, room) {
			if (err) {
				player.send_error("You have not joined a game.");
				return;
			}

			if (room.game_status != 'started') {
				player.send_error("The game hasn't started yet.");
				return;
			}

			if (!room.pass_turn(player)) {
				player.send_error("Not your turn.");
				return;
			}
		});
	};

	var onChatSend = function(socket, message) {
		socketToRoom(socket, function(err, player, room) {
			if (err) {
				player.send_error("You can't chat when not in a room.");
				return;
			}

			player.send_chat_message(message);
		});
	};

	var onGameAdd = function(socket) {
		socketToRoom(socket, function(err, player, room) {
			if (err) {
				player.send_error("You're not in a room.");
				return;
			}

			if (player != room.host_player) {
				player.send_error("You aren't the host of this room.");
				return;
			}

			var id = room.room_id;

			if (!ai(id)) {
				player.send_error("No free bots.");
				return;
			}
		});
	};

	var onGameKick = function(socket, player_id) {
		socketToRoom(socket, function(err, player, room) {
			if (err) {
				player.send_error("You're not in a room.");
				return;
			}

			if (player != room.host_player) {
				player.send_error("You're not the host.");
				return;
			}

			if (room.game_status != 'created') {
				player.send_error("You can't kick a player out of a started game.");
				return;
			}

			if (!room.kick_player(player_id)) {
				player.send_error("You can't kick yourself, use disband.");
				return;
			}

			players.list_inactive().forEach(function(player) {
				rooms.update_list(player);
			});
		});
	};

	var onGameRestart = function(socket) {
		socketToRoom(socket, function(err, player, room) {
			if (err) {
				player.send_error("You're not in a room.");
				return;
			}

			if (player != room.host_player) {
				player.send_error("You're not the host.");
				return;
			}

			if (room.game_status != 'over') {
				player.send_error("You can only restart a finished game.");
				return;
			}

			room.restart_game();
		});
	};

	var onConnect = function(socket) {
		socket.is_bot = false;
		if (socket.handshake.query.hasOwnProperty('s_ai_key') && socket.handshake.query.s_ai_key) {
			socket.is_bot = true;
		}

		/* update socket */
		if (!socket.is_bot) {
			/* check if this session already has another socket */
			var sess = session.lookupBySID(socket.handshake.sid);
			var oldSocket = sess.get('socket');

			if (oldSocket) {
				oldSocket.disconnect(); // emit the disconnect event to the user
			}

			/* update socket */
			sess.set('socket', socket);
		}

		/* create player */
		var player_idx = players.create(socket.handshake.query.username, socket, socket.is_bot);
		var player = players.object_at(player_idx);
		player.send_update(['username']);

		/* handler initialization:
		 *
		 * socket.on('...', callback);
		 */
		/* game organization handlers */
		socket.on(constants.C_GAME_CREATE,	eventHandlerFactory(socket, onGameCreate));
		socket.on(constants.C_GAME_JOIN,	eventHandlerFactory(socket, onGameJoin));
		socket.on(constants.C_GAME_LEAVE,	eventHandlerFactory(socket, onGameLeave));
		socket.on(constants.C_GAME_ADD,		eventHandlerFactory(socket, onGameAdd));
		socket.on(constants.C_GAME_KICK,	eventHandlerFactory(socket, onGameKick));

		/* game play handlers */
		socket.on(constants.C_GAME_START,	eventHandlerFactory(socket, onGameStart));
		socket.on(constants.C_GAME_RESTART,	eventHandlerFactory(socket, onGameRestart));
		socket.on(constants.C_GAME_CARD,	eventHandlerFactory(socket, onGameCard));
		socket.on(constants.C_GAME_PASS,	eventHandlerFactory(socket, onGamePass));
		socket.on(constants.C_GAME_ORDER,	eventHandlerFactory(socket, onGameOrder));

		/* chat handler */
		socket.on(constants.C_CHAT_SEND,	eventHandlerFactory(socket, onChatSend));

		/* connection handling */
		socket.on('disconnect',	eventHandlerFactory(socket, onDisconnect));

		/* send game list to player */
		rooms.update_list(socket);
	};

	return onConnect;
};