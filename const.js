/**
 * const.js -- application constants
 * will share this code between client and server.
 */
(function(e) {
  e.C_GAME_CREATE   = "onGameCreate";
  e.C_GAME_JOIN   = "onGameJoin";
  e.C_GAME_LEAVE    = "onGameLeave";
  e.C_GAME_START    = "onGameStart";
  e.C_GAME_CARD   = "onGameCard";
  e.C_GAME_PASS   = "onGamePass";
  e.C_GAME_ORDER    = "onGameOrder";
  e.C_GAME_KICK   = "onGameKick";
  e.C_GAME_ADD    = "onGameAdd";
  e.C_GAME_RESTART  = "onGameRestart";
  e.C_CHAT_SEND   = "onChatSend";
  e.S_ERROR     = "onGameError";
  e.S_UPDATE_STATUS   = "onUpdateStatus";
  e.S_UPDATE_ROOM   = "onUpdateRoom";
  e.S_UPDATE_USERNAME = "onUpdateUsername";
  e.S_UPDATE_CHAT   = "onUpdateChat";
  e.S_UPDATE_LIST   = "onUpdateList";
  e.S_UPDATE_STACK  = "onUpdateStack";
  e.S_UPDATE_POINTS = "onUpdatePoints";
  e.S_UPDATE_PLAYERS  = "onUpdatePlayers";
  e.S_UPDATE_TURN   = "onUpdateTurn";
  e.S_UPDATE_CUT    = "onUpdateCut";
  e.S_UPDATE_STARTER  = "onUpdateStarter";
  e.S_UPDATE_CARDS  = "onUpdateCards";
  e.REQUESTS_LIMIT  = 15;
  e.TURN_TIME_LIMIT = 30;

  e.WSADDRESS     = "";
  e.VERSION       = "0.2";
})(typeof exports !== 'undefined' ? exports : this['gconst'] = this['gconst'] || {});
