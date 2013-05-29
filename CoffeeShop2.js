/* CoffeeShop2
 * CoffeeShop full stack.. just got better.
 * (c) 2013 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

/* UMD LOADER: https://github.com/umdjs/umd/blob/master/returnExports.js */
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
  }
}(this, function() {
    var express = require('express'),
        async = require('async'),
        socket = require('socket.io'),
        prosess = require('prosess'),
        cookie  = require('cookie'),
        http = require('http'),
        RedisRing = require('redis-ring'),
        path = require('path'),
        fs = require('fs');
    
    var cs = function() {
        this.app = express();
        this.http = http.createServer(this.app);
        this.io = socket.listen(this.http);
        this.secret('secret');
        
        this.listenArgs = arguments;
        this._attach(this.app);
        this.defaultMode();
    };
    
    cs.prototype.ring = function(ring) {
        this.client = new RedisRing((typeof ring == 'undefined') ? [
            {"127.0.0.1:6379": 1} //default ring
        ] : ring);
        
        return this; //chain
    };
    
    cs.prototype.set = function() {
        this.app.set.apply(this.app, arguments);
        
        return this; //chain
    };
    
    cs.prototype.secret = function(val) {
        this._secret = (typeof val == 'string') ? val : 'secret';
        
        return this; //chain
    };
    
    cs.prototype.finalize = function(next) { //lock in binds
        var that = this;
        
        prosess({ //set up prosess with "this" app
            app: this.app,
            client: this.client,
            secret: this._secret
        });
        
        this.doMode(); //drop into the correct mode (production / dev)
        
        var _after_init = function() {
            that._bind.forEach(function(v, i, a) { //run all the bind functions
                v();
            });
            delete that._bind; //remove all bind functions after we are done running them
            
            that.app.use(that.stack('static'));
            
            if(typeof that.four_o_four == 'string') {
                that.load('404', function(err) {
                    if(!err) {
                        that.app.use(function(req, res) {
                            res.type(path.extname(that.four_o_four)); //send the headers based on the file name
                            res.send(404, that.four_o_four_data); //send a 404 with the data
                        });
                    } else {
                        that.app.use(function(req, res) {
                            that.error(err, 'Error sending 404!');
                            res.send(500); //internal server error
                        });
                    }
                });
            }
            
            next(); //do next function
        };
        
        if(that._init.length === 0) { //empty init stack
            _after_init(); //skip init
        } else {
            async.series(that._init, function(err, results) {
                that.error(err, 'Error in init function'); //handle any errors
                _after_init(); //run whatever we need to run when all the init is done
                delete that._init; //remove all init functions after we are done running them
            });
        }
    };
    
    cs.prototype._listen = function() {
        this.http.listen.apply(this.http, this.listenArgs);
        
        return this; //chain
    };
    
    cs.prototype.listen = function() {
        var that = this;
        
        this.finalize(function() {
            that.http.listen.apply(that.http, that.listenArgs);
        });
        
        return this; //chain
    };
    
    cs.prototype.grab = function(what, pass) { //parser function for the pass array
        switch(what) {
            case 'app':
                return pass[0];
            case 'express':
                return pass[1];
            case 'io':
                return pass[2];
            case 'client':
                return pass[3];
            case 'cb': 
                return pass[4];
            case 'prosess':
                return pass[5];
        }
    };
    
    cs.prototype._init = []; //init binding functions stack
    cs.prototype._bind = []; //binding functions stack
    cs.prototype.bind = function(mixed, data) { //bind a static directory or dynamic server to the app
        var that = this;
        
        if(typeof mixed == 'object') { //if we are binding a dynamic server
            this._bind.push(function() { //push an action to do later
                if(typeof mixed.bind != 'function' && typeof mixed.b == 'function') { //new api to work flawlessly with old API
                    mixed.bind = function(pass, grab, data) {
                        mixed.b(function(what) {
                            return grab(what, pass);
                        }, data);
                    };
                }
                
                mixed.bind([that.app, express, that.io, that.client, null], that.grab, data); //bind the dynamic server
            });
        } else if(typeof mixed == 'function') { //if we are binding an init function
            this._init.push(function(cb) { //push an action to do later
                mixed([that.app, express, that.io, that.client, cb, null], that.grab, data);
            });
        } else if(typeof mixed == 'string') { //if we are binding a static directory
            this._bind.push(function() { //push an action to do later
                var continue_bind = true; //do we want to continue the bind?
            
                if(typeof data == 'string') { //if data is a string
                    switch(data) { //parse the data string
                        case 'npm': //if we are binding to a static local npm module
                            mixed = path.join('./node_modules', mixed, './cs_serve'); //point to the cs_serve directory
                          break;
                        case '404': //if we are binding a 404 page
                            that.four_o_four = mixed; //bind the 404 page
                            continue_bind = false; //don't continue the bind operation
                          break;
                        default:
                          break;
                    }
                }
                
                if(continue_bind === true) {
                    that.stack('static', express.static(mixed));
                }
            });
        } else { //blank / invalid first argument
            that.bind('./static'); //default static directory
        }
        
        return this; //chain
    };
    
    cs.prototype._mwstack = {}; //middleware stack object
    cs.prototype.stack = function(name, mw) { //stack some middleware or return a stacked middleware
        var that = this;
        
        if(typeof that._mwstack != 'object') { //create _mwstack if noexist
            that._mwstack = {};
        }
        
        if(typeof mw == 'function') { //if middleware is a function
            if(typeof that._mwstack[name] == 'undefined') { //if we need to a place to store this middleware
                that._mwstack[name] = []; //make a new stack
            }
            
            that._mwstack[name].push(mw); //push the middleware onto the stack
        } else if(typeof that._mwstack[name] == 'object' && that._mwstack[name] instanceof Array) { //if the stack is an Array 
            return function(req, res, next) { //return a function that runs a stack of middleware
                var _asyncme = []; //stack that holds async functions
                that._mwstack[name].forEach(function(v, i, a) {
                    _asyncme.push(function(cb) { //convert middleware to an async function and push onto the stack
                        v(req, res, function(err) {
                            cb(err);
                        });
                    });
                });
                
                async.series(_asyncme, function(err) { //run stack in a series
                    if(err) {
                        that.error(err, 'Error in middleware stack!');
                    } else if(typeof next == 'function') { //if we can execute next
                        next(); //do next if the series finished without errors
                    }
                });
            };
        }
    };
    
    cs.prototype.once = function(fu) { //Returns a function that will run once and only once.
        var extfu = {};

        extfu = function(fu) { //object that runs a function that returns a function! #codeception
            return (function(extfu) {
                return function() {
                    if(!extfu.ran) { //if the function hasn't run
                        extfu.ran = true; //we ran it
                        return fu(); //run function and return the result
                    }
                };
            })(this);
        };

        extfu.prototype.ran = false; //we didn't run it yet

        return new extfu(fu); //create some #codeception
    };
    
    cs.prototype.load = function(what, cb) { //generic loader / reloader function for caches and stuff
        var that = this;
        
        if(typeof cb != 'function') {
            cb = function() {}; //blank function
        }
        
        switch(what) {
            case '404':
                fs.readFile(that.four_o_four, function(err, data) {
                    that.four_o_four_data = data;
                    cb(err);
                });
              break;
            default: 
              break;
        }
    };
    
    cs.prototype._error = function(err, msg) { //default error handler, change using cs.error or app.error
        console.error([err, msg]);
    };
    cs.prototype.error = function(err, msg) { //bind a function for error handling or call the error handler
        if(typeof err == 'function') { //if we are changing the error handler
            this._error = err; //bind the new error handler
        } else if(err) { //if we have an error
            this._error(err, msg); //call the error handler
        }
        
        return !err; //return true if err isn't undefined, null, false, "", or 0
    };
    
    cs.prototype._sockAuth = function(obj, setID, accept) { //basic defualt unsecure authentication
        setID((new Date()).getTime().toString()); //use the current time as the user ID
        accept(null, true); //accept the socket
    };
    cs.prototype.sockAuth = function(auth, accept, setID) { //_socketAuth function binding
        if(typeof auth == 'function') {
            this._sockAuth = auth;
            this.sock(); //setup the socket auth
        } else {
            this._sockAuth(auth, setID, accept);
        }
    };
    
    cs.prototype.fakeIO = function(_id) { //create a fake io object for id
        var that = this;
        
        return {
            "emit": function(id, data) { // basic io.emit emulation
                that.client.publish('_csse_'+_id, JSON.stringify({ //publish the data using redis Pub/Sub
                    "id": id,
                    "data": data
                }), function(err, data) { //check for errors
                    that.error(err, 'Redis error while sending socket emit.');
                });
            }
        };
    };
    
    cs._sock = false; //flag that tells if we have set up the socket auth
    cs.prototype.sock = function(interval) { //uses cookieParse() and session() with RedisStore
        var that = this;
        
        if(cs._sock === false) { //have we not setup the socket auth?
            cs._sock = true; //say we set it up
            if(typeof interval == 'number') { //if we are setting the interval
                cs.sockInterval = interval; //set it
            }
            
            var parseSessID = function(cookie, hash) { //private function for parsing session IDs into what REDIS stores them as
                var _id = ((typeof cookie[hash] == 'string') ? cookie[hash] : '').toString().split('.');
                var _parse = (_id.length > 0) ? _id[0].replace('s:j:', '') : false;
                
                if(_parse === false) {
                    return false;
                } else {
                    var _continue = true,
                        _parsed;
                    
                    try {
                        _parsed = JSON.parse(_parse).id;
                    } catch(e) {
                        _continue = false;
                    }
                    
                    if(_continue === false) {
                        return false;
                    } else {
                        return hash + '_' + _parsed;
                    }
                }
            };
            
            that.io.set('authorization', function(data, accept) { //socket authorization
                if(data.headers.cookie) { //if we have a cookie
                    data.cookie = cookie.parse(data.headers.cookie); //parse the cookie
                    data.sessionID = parseSessID(data.cookie, 'prosess'); //parse the sessionID
                    
                    if(data.sessionID === false) {
                        accept('ID parse error.', false);
                    } else {
                        that.client.get(data.sessionID, function(err, _data) { //grab the session from redis
                            if(that.error(err, 'Redis error while doing socket authorization.')) { //check for errors
                                var obj = JSON.parse(_data); //parse the redis response into an object
                                
                                that.sockAuth(obj, accept, function(id) { //setId
                                    data.userID = id; //set the userID in the socket
                                });
                            } else {
                                accept('Redis error while doing socket authorization.', false); //check for errors
                            }
                        });
                    }
                } else {
                    accept('No cookie transmitted.', false); //check for errors
                }
            });
            
            that.io.sockets.on('connection', function(socket) { //when a user connects to this server (after authenticating)
                var id = socket.handshake.userID; //grab the userID
                
                var c = that.client.subscribe('_csse_'+id, function(data) {
                    if(data !== null) { //if we have data that is not null
                        var _data = JSON.parse(data); //parse the data
                        socket.emit(_data.id, _data.data); //do a socket emit with the parsed data
                    }
                });

                socket.on('disconnect', function() { //when the user disconnect from this server
                    c.quit(); //kill the redis client
                });
            });
        }
    };
    
    cs.prototype._mode_t_parse = function(_type) {
        var type = (typeof _type == 'boolean') ? type : (type === 'production'),
            typeN = (type === true) ? 1 : 0,
            modeStr = 'mode_' + typeN;
        
        return {
            type: type,
            typeN: typeN,
            modeStr: modeStr
        };
    };
    
    cs.prototype.mode = function(_type, bi) {
        var t = this._mode_t_parse(_type);
        
        if(typeof bi == 'function') {
            this.ev(t.modeStr, bi);
        } else {
            this._mode = t.type;
        }
    };
    
    cs.prototype.doMode = function() {
        this.ev(this._mode_t_parse(this._mode).modeStr);
    };
    
    cs.prototype.defaultMode = function() {
        var that = this;
        
        this._mode = this._mode_t_parse('production').type;
        
        this.mode('production', function() { //socket.io production settings https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
            that.io.enable('browser client minification');  // send minified client
            that.io.enable('browser client etag');          // apply etag caching logic based on version number
            that.io.enable('browser client gzip');          // gzip the file
            that.io.set('log level', 1);                    // reduce logging
            that.io.set('transports', [                     // enable all transports (optional if you want flashsocket)
                'websocket'
              , 'flashsocket'
              , 'htmlfile'
              , 'xhr-polling'
              , 'jsonp-polling'
            ]);
        });
        
        this.mode('production', function() { //express compression
            that.app.use(express.compress());
        });
    };
    
    cs.prototype._attach = function(app) { //attach cs prototypes to "app" object
        var that = this;
        
        ['once', 'error', 'sockAuth', 'fakeIO', {
            "mwstack": 'stack',
            "reload": 'load'
        }].forEach(function(v, i, a) {
            if(typeof v === 'string') {
                app[v] = function() { //call in context of the current CS instance
                    return that[v].apply(that, arguments);
                };
            } else if(typeof v === 'object') {
                for(var key in v) {
                    var val = v[key];
                    
                    app[key] = function() { //call in context of the current CS instance
                        return that[val].apply(that, arguments);
                    };
                }
            }
        });
    };
    
    cs.prototype.ev = function(e, cb) { //run / on event - https://github.com/daxxog/ev/blob/master/ev.js
        var ev = this.ev;
        
        if(typeof ev._ == 'undefined') {
            ev._ = {};
        }
        
        if(typeof e == 'string') {
            if(!Array.isArray(ev._[e])) {
                ev._[e] = [];
            }
            
            if(typeof cb == 'function') { //if we have a function
                return ev._[e].push(cb); //push it on the stack
            } else if(cb === 'k') { //if we want to kill an event now
                ev._[e].forEach(function(v, i, a) { // loop and
                    delete ev._[e][i];              // kill all events
                });
            } else { //execute event
                ev._[e].forEach(function(v, i, a) { // loop and
                    if(typeof v == 'function') { //find functions
                        if(v() === 'k') { //if we should kill this function after running
                            delete ev._[e][i]; //delete the function
                        }
                    }
                });
            }
        }
    };
    
    return cs;
}));