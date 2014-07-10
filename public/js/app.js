angular.module('septicaApp', []).
  // services
  factory('socket', function ($rootScope) {
    var socket = {};
    return {
      connect: function (url, opts) {
        socket = io.connect(url, opts);
      },

      on: function (eventName, callback) {
        socket.on && socket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },

      emit: function (eventName) {
        socket.emit && socket.emit.apply(socket, arguments);
      },

      disconnect: function () {
        socket.disconnect && socket.disconnect();
      }
    };
  }).
  factory('gameService', ['socket', function(socket) {
    return {
      connecting: false,

      connect: function(username) {
        if (!this.connecting) {
          this.connecting = true;
          socket.connect(gconst.WSADDRESS, {'reconnect': false, 'force new connection': true, 'query': "username=" + username});
          this.handle_exposed();
          this.handle_global();
        }
      },

      handle_exposed: function() {
        var self = this;

        socket.on('error', function(err) {
          this.connecting = false;
          if (err === 'handshake unauthorized')
            self.onError('Server did not authorize your login. Check FAQ. ');
          else
            self.onError('An unexpected error occured: ' + err);
        });

        socket.on('connect', function() {
          self.onConnect();
        });

        socket.on('disconnect', function() {
          self.onDisconnect();
        });
      },

      setOnConnect: function(fn) { var self = this; var oldFn = this.onConnect; this.onConnect = function() { if (oldFn) oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnDisconnect: function(fn) { var self = this; var oldFn = this.onDisconnect; this.onDisconnect = function() { if (oldFn) oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnError: function(fn) { var self = this; var oldFn = this.onError; this.onError = function() { if (oldFn) oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateStatus: function(fn) { var self = this; var oldFn = this.onUpdateStatus; this.onUpdateStatus = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateRoom: function(fn) { var self = this; var oldFn = this.onUpdateRoom; this.onUpdateRoom = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateUsername: function(fn) { var self = this; var oldFn = this.onUpdateUsername; this.onUpdateUsername = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateChat: function(fn) { var self = this; var oldFn = this.onUpdateChat; this.onUpdateChat = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateList: function(fn) { var self = this; var oldFn = this.onUpdateList; this.onUpdateList = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateStack: function(fn) { var self = this; var oldFn = this.onUpdateStack; this.onUpdateStack = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdatePoints: function(fn) { var self = this; var oldFn = this.onUpdatePoints; this.onUpdatePoints = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdatePlayers: function(fn) { var self = this; var oldFn = this.onUpdatePlayers; this.onUpdatePlayers = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateTurn: function(fn) { var self = this; var oldFn = this.onUpdateTurn; this.onUpdateTurn = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateCut: function(fn) { var self = this; var oldFn = this.onUpdateCut; this.onUpdateCut = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateStarter: function(fn) { var self = this; var oldFn = this.onUpdateStarter; this.onUpdateStarter = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },
      setOnUpdateCards: function(fn) { var self = this; var oldFn = this.onUpdateCards; this.onUpdateCards = function() { oldFn.apply(self, arguments); fn.apply(self, arguments); }; },

      onConnect: function(){},
      onDisconnect: function(){},
      onError: function(){},
      onUpdateStatus: function(){},
      onUpdateRoom: function(){},
      onUpdateUsername: function(){},
      onUpdateChat: function(){},
      onUpdateList: function(){},
      onUpdateStack: function(){},
      onUpdatePoints: function(){},
      onUpdatePlayers: function(){},
      onUpdateTurn: function(){},
      onUpdateCut: function(){},
      onUpdateStarter: function(){},
      onUpdateCards: function(){},

      handle_global: function() {
        var self = this;
        socket.on(gconst.S_ERROR, function() { self.onError.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_STATUS, function() { self.onUpdateStatus.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_ROOM  , function() { self.onUpdateRoom.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_USERNAME, function() { self.onUpdateUsername.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_CHAT  , function() { self.onUpdateChat.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_LIST  , function() { self.onUpdateList.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_STACK , function() { self.onUpdateStack.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_POINTS, function() { self.onUpdatePoints.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_PLAYERS , function() { self.onUpdatePlayers.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_TURN  , function() { self.onUpdateTurn.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_CUT   , function() { self.onUpdateCut.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_STARTER , function() { self.onUpdateStarter.apply(self, arguments); });
        socket.on(gconst.S_UPDATE_CARDS , function() { self.onUpdateCards.apply(self, arguments); });
      },

      create: function(name, players) {
        socket.emit(gconst.C_GAME_CREATE, name, players);
      },

      join: function(gameId) {
        socket.emit(gconst.C_GAME_JOIN, gameId);
      },

      leave: function() {
        socket.emit(gconst.C_GAME_LEAVE);
      },

      add: function() {
        socket.emit(gconst.C_GAME_ADD);
      },

      kick: function(playerIdx) {
        socket.emit(gconst.C_GAME_KICK, playerIdx);
      },

      start: function() {
        socket.emit(gconst.C_GAME_START);
      },

      restart: function() {
        socket.emit(gconst.C_GAME_RESTART);
      },

      dropCard: function(cardId) {
        socket.emit(gconst.C_GAME_CARD, cardId);
      },

      passTurn: function() {
        socket.emit(gconst.C_GAME_PASS);
      },

      orderPlayers: function(perm) {
        socket.emit(gconst.C_GAME_ORDER, perm);
      },

      sendChat: function(message) {
        socket.emit(gconst.C_CHAT_SEND, message);
      },

      'socket': socket
    };
  }]).
  factory('localStorageService', function($rootScope) {
    var obj = {};

    obj.get = function(){};
    obj.set = function(){};

    if (!Modernizr.localstorage) {
      $rootScope.localStorageEnabled = false;

      // fallback to cookies? is it worth it?
    } else {
      $rootScope.localStorageEnabled = true;

      obj.get = function(key, success, error) {
        var value = localStorage[key];

        if (!value) {
          error();
          return;
        }

        try {
          var valObj = JSON.parse(value);
          success(valObj);
        } catch (err) {
          console.log("Couldn't parse localStorage JSON.");
          error();
        }
      };

      obj.set = function(key, object) {
        localStorage[key] = JSON.stringify(object);
      };
    }

    return obj;
  }).
  factory('audioService', function($rootScope) {
    var obj = {};

    obj.play = function() {};
    obj.repeat = function() {};
    obj.stop = function() {};

    if (!Modernizr.audio) {
      $rootScope.audioEnabled = false;
    } else {
      $rootScope.audioEnabled = true;

      var Sound = function(name) {
        this.stop = false;
        this.audio = document.getElementById(name + '-audio');
        var self = this;
        this.audio.addEventListener('ended', function() {
          if (!self.stop) {
            self.audio.currentTime = 0;
            setTimeout(function() {
              self.audio.play();
            }, 500);
          };
        });
      };

      var sounds = {
        notify: new Sound('notify'),
        card: new Sound('card'),
        tick: new Sound('tick'),
      };

      obj.play = function(name) {
        sounds[name] && (sounds[name].stop = true) && sounds[name].audio.play();
      };

      obj.repeat = function(name) {
        if (sounds[name]) {
          sounds[name].stop = false;
          sounds[name].audio.play();
        }
      };

      obj.stop = function(name) {
        sounds[name] && (sounds[name].stop = true);
      };
    }

    return obj;
  }).
  factory('windowActiveService', function() {
    var active = true;

    angular.element(window).on('focus', function() {
      active = true;
    });

    angular.element(window).on('blur', function() {
      active = false;
    });

    return {
      isActive: function() {
        return active;
      }
    };
  }).
  // directives
  directive('player', function() {
    return {
      restrict: 'E',
      scope: {
        ngModel: '=', // two way binding
        kick: '&', // one way binding
        moveUp: '&', // one way binding
        moveDown: '&', // one way binding
        index: '@', // text binding
        type: '@', // text binding
        hostNick: '=', // two way binding
        userName: '=', // two way binding
        settingsObject: '=', // two way binding
        playerTurn: '@', // text binding
        playerStarter: '@',
        playerCutter: '@',
        teams: '@',
      },
      require: ['^ngModel'],
      templateUrl: 'templates/player.html'
    };
  }).
  directive('cardList', function() {
    return {
      restrict: 'E',
      scope: {
        ngModel: '=', // two way
        random: '@', // text [ yes or no ]
        clickable: '@', // text [ yes or no ]
        hover: '@', // text [ highlight or disperse ]
        action: '&', // one way binding [ function on click ]
      },
      require: ['^ngModel'],
      templateUrl: 'templates/cardList.html',
    }
  }).
  directive('card', function() {
    return {
      restrict: 'E',
      scope: {
        ngModel: '=', // two way
        action: '&', // [ function with parameter, given an index ]
        hover: '@', // text
        clickable: '@', // text
        random: '@', // text
        index: '@', // text
      },
      require: ['^ngModel'],
      link: function (scope, element, attrs) {
        if (scope.action && scope.clickable == 'yes') {
          var actionHandler = scope.action();
          $(element).click(function() {
            actionHandler(scope.index);
          });
        }
      },
      templateUrl: 'templates/card.html',
    }
  }).
  // autoscroll
  directive('scrollableContainer', function() {
    return {
      restrict: 'A', // attr
      link: function (scope, element, attrs) {
        var scrollToTop = false;

        scope.$on("scrollableRendered", function() {
          var $el = angular.element(element);
          $el.stop();
          if (scrollToTop)
            $el.scrollTop(0);

          $el.animate({'scrollTop': $el[0].scrollHeight}, 400);

          scrollToTop = false;
        });

        scope.$on('scrollableCleared', function() {
          scrollToTop = true;
        });
      }
    }
  }).
  directive('scrollableItem', function() {
    return {
      restrict: 'A', // attr
      link: function (scope, element, attrs) {
        if (scope.$last)
          scope.$emit("scrollableRendered");
      }
    }
  }).
  // scrollbar
  directive('perfectScroll', function($parse) {
    return {
      restrict: 'E',
      transclude: true,
      template:  '<div><div ng-transclude></div></div>',
      replace: true,
      link: function($scope, $elem, $attr) {
          $elem.perfectScrollbar({
          wheelSpeed: $parse($attr.wheelSpeed)() || 50,
          wheelPropagation: $parse($attr.wheelPropagation)() || false,
          minScrollbarLength: $parse($attr.minScrollbarLength)() || false,
        });

        if ($attr.refreshOnChange) {
          $scope.$watchCollection($attr.refreshOnChange, function(newNames, oldNames) {
            // I'm not crazy about setting timeouts but it sounds like thie is unavoidable per
            // http://stackoverflow.com/questions/11125078/is-there-a-post-render-callback-for-angular-js-directive
            setTimeout(function() { $elem.perfectScrollbar('update'); }, 10);
          });
        }
      }
    };
  }).
  // controllers
  controller('MainCtrl', function($scope, $timeout, $animate, gameService, localStorageService, audioService, windowActiveService) {

    var defaultSettings = { // default settings
      general: {
        theme: 0, // default
      },

      audio: {
        isEnabled: $scope.audioEnabled,
        isChatEnabled: true,
        isTurnEnabled: true,
        isCountdownEnabled: false,
        isGameFXEnabled: false,
      },

      gameplay: {
        showLastCutter: true,
        showTurnStarter: true,
        highlightTurn: true,
        highlightPlayer: true
      },

      chat: {
        showTimestamp: true,
        showServerMessages: true,
        clearInterval: 0, // never
      },
    };

    $scope.settings = defaultSettings; // if localstorage isn't enabled.

    // try loading anything from localStorage
    localStorageService.get('settings', function(settings) {
      $scope.settings = settings;
    }, function() {
      localStorageService.set('settings', defaultSettings);
      $scope.settings = defaultSettings;
    });

    // watch settings for changes
    $scope.$watch('settings', function(newValue) {
      localStorageService.set('settings', newValue);
    }, true);

    $scope.main = {
      unload: function(e) {
        var msg = "Leaving this page will result in you losing your session.";

        (e || window.event).returnValue = msg;
        return msg;
      },

      utility: {
        fadeOut: function(element, callback) {
          $animate.removeClass(element, 'in', function() {
            $timeout(function() {
              $animate.removeClass(element, 'active', function() {
                callback && callback();
              });
            }, 150);
          });
        },

        fadeIn: function(element, callback) {
          $animate.addClass(element, 'active', function() {
            $animate.addClass(element, 'in', function() {
              callback && callback();
            });
          });
        },
      },

      tabs: {
        // valid: ['login', 'list', 'create', 'room', 'zone']
        previous: null,
        current: 'login',
        set: function(tab) {
          this.previous = this.current;
          this.current = tab;
          if (this.previous)
            var $prev = angular.element("#game-" + this.previous);
          else
            var $prev = null;
          var $current = angular.element("#game-" + this.current);

          if ($prev) {
            $scope.main.utility.fadeOut($prev, function() {
              $scope.main.utility.fadeIn($current);
            });
          } else {
            $scope.main.utility.fadeIn($current);
          }
        },
      },
      error: {
        $container: angular.element("#error-container"),
        message: '',
        hideTimeout: null,
        shown: false,

        show: function(msg) {
          var self = this;

          self.message = msg;
          $scope.main.utility.fadeIn(self.$container, function() {
            self.shown = true;
            if (self.hideTimeout)
              $timeout.cancel(self.hideTimeout);

            self.hideTimeout = $timeout(function() {
              self.hide();
            }, 2500);
          });
        },

        hide: function() {
          var self = this;

          if (self.hideTimeout)
            $timeout.cancel(self.hideTimeout);

          $scope.main.utility.fadeOut(self.$container, function() {
            self.shown = false;
          });
        }
      },
      data: {},
    };

    // handle exposed socket events

    gameService.setOnError(function(msg) {
      $scope.main.error.show(msg);
    });

    gameService.setOnConnect(function() {
      $scope.main.tabs.set('list');
      window.addEventListener('beforeunload', $scope.main.unload);
    });

    gameService.setOnDisconnect(function() {
      $scope.main.data.username = '';
      $scope.main.error.show('You have been disconnected.');
      $scope.main.tabs.set('login');
      window.removeEventListener('beforeunload', $scope.main.unload);
    });

    // handle game specific events

    gameService.setOnUpdateUsername(function(data) {
      if (data.username)
        $scope.main.data.username = data.username;
    });

    gameService.setOnUpdateRoom(function(data) {
      if (data.room == -1) {
        $scope.main.tabs.set('list');
      }
    });

    gameService.setOnUpdateStatus(function(data) {
      if (data.status == "started") {
        $scope.main.tabs.set('zone');
      } else if (data.status == "created") {
        $scope.main.tabs.set('room');
      } else if (data.status == "stopped") {
        $scope.main.tabs.set('list');
      } else if (data.status == "over") {
        $scope.main.tabs.set('stats');
      }
    });
  }).
  controller('GameLoginCtrl', function($scope, gameService) {

    var $submit = angular.element('#gameLoginSubmit');

    $scope.nickname = '';

    $scope.login = function(form) {
      if (form.$valid) {
        $submit.button('loading');
        gameService.connect($scope.nickname);
      }
    };

    gameService.setOnDisconnect(function() {
      $submit.button('reset');
    });

    gameService.setOnError(function() {
      $submit.button('reset');
    });
  }).
  controller('RoomListCtrl', function($scope, gameService) {
    $scope.rooms = [];

    $scope.isEmpty = function() {
      if ($scope.rooms.length === 0)
        return true;
      return false;
    };

    $scope.goCreate = function() {
      $scope.main.tabs.set('create');
    };

    $scope.joinRoom = function(idx) {
      gameService.join($scope.rooms[idx].id);
    };

    gameService.setOnUpdateList(function(data) {
      $scope.rooms = data.list;
    });
  }).
  controller('GameCreateCtrl', function($scope, gameService) {

    var $submit = angular.element("#gameCreateSubmit");

    $scope.roomName = '';
    $scope.roomLimit = 4;

    gameService.setOnUpdateUsername(function(data) {
      $scope.roomName = data.username;
    });

    $scope.doCreate = function(form) {
      if (form.$valid) {
        var name = $scope.roomName;
        var limit = $scope.roomLimit;

        $submit.button('loading');
        gameService.create(name, limit);
      }
    }

    $scope.cancelCreate = function() {
      $scope.main.tabs.set('list');
    };

    gameService.setOnError(function() {
      $submit.button('reset');
    })

    gameService.setOnDisconnect(function() {
      $submit.button('reset');
    })
  }).
  controller('GameRoomCtrl', function($scope, gameService) {
    // add game service update username on scope
    // will two-way bind these to the directive.
    $scope.userName = ''; 
    $scope.hostName = '';
    $scope.roomName = '';
    $scope.players = [];

    var $start = angular.element('#gameRoomStart');

    gameService.setOnUpdateUsername(function(data) {
      $scope.userName = data.username;
    });

    gameService.setOnUpdateRoom(function(data) {
      if (data.room != -1) {
        $scope.hostName = data.room_host;
        $scope.roomName = data.room_name;
      }
    });

    gameService.setOnUpdatePlayers(function(data) {
      $scope.players = [];
      for (var i = 0, len = data.players.length; i < len; i++) {
        $scope.players.push({'name': data.players[i], 'points': 0});
      }
    });

    $scope.kickPlayer = function(index) {
      // call game service kick
      gameService.kick(index);
    };

    $scope.move = function(index, offset) {
      var perm = [];
      for ( var i = 0, len = $scope.players.length; i < len; i++ )
        perm.push(i);

      // swap
      if (index + offset < $scope.players.length && index + offset >= 0) {
        var tmp = perm[index + offset];
        perm[index + offset] = perm[index];
        perm[index] = tmp;

        gameService.orderPlayers(perm);
      }
    };

    $scope.leave = function() {
      gameService.leave();
    };

    $scope.addBot = function() {
      gameService.add();
    };

    $scope.start = function() {
      $start.button('loading');
      gameService.start();
    };

    gameService.setOnDisconnect(function() {
      $start.button('reset');
    });

    gameService.setOnError(function() {
      $start.button('reset');
    });

    gameService.setOnUpdateRoom(function(data) {
      if (data.room != -1) {
        $start.button('reset');
      }
    });
  }).
  controller('GameZoneCtrl', function($scope, $interval, gameService, audioService, windowActiveService) {
    $scope.timer = {
      seconds_left: -1,
      interval: null,

      start: function(s) {
        $interval.cancel(this.interval);
        var self = this;

        this.seconds_left = s;
        this.interval = $interval(function() {
          self.seconds_left--;
          if (self.seconds_left == 10 && $scope.settings.audio.isEnabled && $scope.settings.audio.isCountdownEnabled)
            audioService.repeat('tick');
          if (self.seconds_left <= 0)
            self.stop();
        }, 1000);
      },

      stop: function() {
        $interval.cancel(this.interval);
        this.seconds_left = -1;
        audioService.stop('tick');
      },
    };

    $scope.roomName = '';
    $scope.player_idx = -1;
    $scope.players = [];
    $scope.cards = [];
    $scope.stack = [];
    $scope.cut = -1;
    $scope.starter = -1;
    $scope.turn = -1;

    /* required UI things */
    $scope.getPassTurnLabel = function() {
      if ($scope.turn == $scope.cut)
        return 'Take';
      else
        return 'Pass';
    };

    $scope.isPassTurnHidden = function() {
      return !(($scope.player_idx == $scope.turn) && ($scope.turn == $scope.starter) && ($scope.stack.length != -1) && ($scope.player_idx != -1) && ($scope.turn != -1));
    };
    // player_idx === turn && stack.length !== 0

    $scope.dropCard = function(index) {
      gameService.dropCard(index);
    };

    $scope.passTurn = function() {
      gameService.passTurn();
    };

    /* game service register events */

    gameService.setOnUpdateRoom(function(data) {
      if (data.room != -1)
        $scope.roomName = data.room_name;
    });

    gameService.setOnUpdatePlayers(function(data) {
      $scope.players = [];
      for (var i = 0, len = data.players.length; i < len; i++) {
        if (data.players[i] == $scope.main.data.username) {
          $scope.player_idx = i;
        }
        $scope.players.push({'name': data.players[i], 'points': 0});
      }
    });

    gameService.setOnUpdatePoints(function(data) {
      for (var i = 0, len = data.points.length; i < len; i++) {
        $scope.players[i].points = data.points[i];
      }
    });

    gameService.setOnUpdateCards(function(data) {
      $scope.cards = data.cards;
    });

    gameService.setOnUpdateStarter(function(data){
      $scope.starter = data.starter;
    });

    gameService.setOnUpdateTurn(function(data){
      $scope.turn = data.turn;
      if ($scope.turn == $scope.player_idx) {
        if ($scope.settings.audio.isEnabled && $scope.settings.audio.isTurnEnabled && (!windowActiveService.isActive() || $scope.main.tabs.current != 'zone'))
          audioService.play('notify');
        $scope.timer.start(gconst.TURN_TIME_LIMIT);
      } else {
        $scope.timer.stop();
      }
    });

    gameService.setOnUpdateStack(function(data){
      $scope.stack = data.stack;
      if ($scope.settings.audio.isEnabled && $scope.settings.audio.isGameFXEnabled && windowActiveService.isActive() && $scope.main.tabs.current == 'zone') {
        audioService.play('card');
      }
    });

    gameService.setOnUpdateCut(function(data){
      $scope.cut = data.cut;
    });

    gameService.setOnUpdateStatus(function(data) {
      if (data.status == 'over') {
        $scope.timer.stop();
      }
    });
  }).
  controller('GameStatsCtrl', function($scope, $interval, gameService) {
    $scope.userName = ''; 
    $scope.hostName = '';
    $scope.roomName = '';
    $scope.players = [];
    $scope.preventUpdates = false;

    var $restart = angular.element('#gameStatsRestart'),
        $disband = angular.element('#gameStatsDisband'),
        $leave   = angular.element('#gameStatsLeave');

    /* disband timer */
    $scope.timer = {
      seconds_left: -1,
      interval: null,

      start: function(s) {
        $interval.cancel(this.interval);
        var self = this;

        this.seconds_left = s;
        this.interval = $interval(function() {
          self.seconds_left--;
          if (self.seconds_left <= 0)
            self.stop();
        }, 1000);
      },

      stop: function() {
        $interval.cancel(this.interval);
        this.seconds_left = -1;
      },
    };

    gameService.setOnUpdateUsername(function(data) {
      $scope.userName = data.username;
    });

    gameService.setOnUpdateRoom(function(data) {
      console.log('HERE1');
      if (data.room != -1) {
        $scope.hostName = data.room_host;
        $scope.roomName = data.room_name;
      }
    });

    gameService.setOnUpdatePlayers(function(data) {
      if (!$scope.preventUpdates) {
        $scope.players = [];
        for (var i = 0, len = data.players.length; i < len; i++) {
          $scope.players.push({'name': data.players[i], 'points': 0});
        }
      }
    });

    gameService.setOnUpdatePoints(function(data) {
      if (!$scope.preventUpdates) {
        for (var i = 0, len = data.points.length; i < len; i++) {
          $scope.players[i].points = data.points[i];
        }
      }
    });

    gameService.setOnUpdateStatus(function(data) {
      console.log('HERE2');
      if (data.status == 'over') {
        $scope.timer.start(30);
        $scope.preventUpdates = true;
      } else $scope.preventUpdates = false;
    });

    // restart / disband

    $scope.restart = function() {
      $restart.button('loading');
      gameService.restart();
    };

    $scope.leave = function() {
      gameService.leave();
    };

    var resetButtons = function() {
      $restart.button('reset');
    };

    gameService.setOnDisconnect(function() {
      resetButtons();
    });

    gameService.setOnError(function() {
      resetButtons();
    });

    gameService.setOnUpdateStatus(function(data) {
      console.log('here2');
      if (data.status == 'created') {
        resetButtons();
      }
    });

    gameService.setOnUpdateRoom(function(data) {
      console.log("here1");
      if (data.room == -1) {
        resetButtons();
      }
    });
  }).
  controller('ChatCtrl', function($scope, $interval, gameService, audioService, windowActiveService, dateFilter) {
    $scope.messages = [];
    $scope.inputMessage = '';

    $scope.chatShown = false;
    $scope.chatActive = false;

    $scope.newMessagesCount = 0;

    $scope.hideChat = function() {
      $scope.chatShown = false;
    };

    $scope.showChat = function() {
      $scope.$emit('scrollableCleared');
      $scope.chatShown = true;
      $scope.newMessagesCount = 0;
      $scope.$emit('scrollableRendered');
    };

    $scope.sendMessage = function() {
      gameService.sendChat($scope.inputMessage);
      $scope.inputMessage = '';
    };

    var clearMessagesInterval;

    var clearMessages = function() {
      $scope.$emit('scrollableCleared');
      $scope.messages = [];
      $scope.messages.push({
        timestamp: dateFilter(new Date(), 'h:mm:ss a'),
        sender: 'SERVER',
        content: 'Cleared your chat history.'
      });
    };

    $scope.$watch('settings.chat.clearInterval', function(newVal) {
      if (newVal == 0)
        $interval.cancel(clearMessagesInterval);
      else {
        var timeInterval = 5 * newVal;
        if (newVal == 4)
          timeInterval = 30;
        timeInterval *= 60 * 1000; // 60 seconds * 1000 ms

        clearMessagesInterval = $interval(function() {
          clearMessages();
        }, timeInterval);
      }
    });

    gameService.setOnUpdateChat(function(data) {
      $scope.messages.push({
        timestamp: dateFilter(new Date(), 'h:mm:ss a'),
        sender: data.chat.sender,
        content: data.chat.message
      });

      if (!$scope.chatShown) {
        $scope.newMessagesCount++;
      }
    });

    gameService.setOnUpdateRoom(function(data) {
      if (data.room == -1) {
        clearMessages();
        $scope.chatActive = false;
      } else {
        $scope.chatActive = true;
      }
    });
  }).
  controller('SettingsCtrl', function($scope) {
    $scope.themes = [
      {label: "Default", value: 0}
    ];

    $scope.clearChatOptions = [
      {label: 'never', value: 0},
      {label: 'every 5 minutes', value: 1},
      {label: 'every 10 minutes', value: 2},
      {label: 'every 15 minutes', value: 3},
      {label: 'every 30 minutes', value: 4}
    ];

    $scope.$watch('theme', function(newVal){
      $scope.settings.general.theme = newVal.value;
    });

    $scope.$watch('clearChatOption', function(newVal){
      $scope.settings.chat.clearInterval = newVal.value;
    });

    $scope.theme = $scope.themes[$scope.settings.general.theme];

    $scope.clearChatOption = $scope.clearChatOptions[$scope.settings.chat.clearInterval];
  }).
  controller('FAQCtrl', function($scope) {
    $scope.questions = [];

    var addQuestion = function (q, a) {
      $scope.questions.push({question: q, answer: a});
    };

    // initialize questions
    addQuestion('"Server did not authorize your login" message shows up every time I try to connect.',
                'Make sure you have cookies enabled and try refreshing the page.');
    addQuestion('"An unexpected error occured" message shows up every time I try to connect.',
                'Our game servers are experiencing technical problems or are under maintenance.');
    addQuestion('I cannot access Settings page. Help!',
                'Your browser does not support HTML5 Local Storage, which we use to store your preferences for future visits. Please upgrade your browser.');
    
  }).
  controller('RulesCtrl', function($scope) {
    
  }).
  controller('AboutCtrl', function($scope) {
    var age;
    var today = new Date();
    var dob = new Date(1996, 2, 3);

    age = today.getYear() - dob.getYear();

    if ( today.getMonth() < dob.getMonth() || (today.getMonth() == dob.getMonth() && today.getDate() < dob.getDate() ) )
      age--;

    $scope.age = age;
  });