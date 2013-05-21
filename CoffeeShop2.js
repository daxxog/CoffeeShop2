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
        http = require('http'),
        RedisRing = require('redis-ring');
    
    var cs = function() {
        this.app = express();
        this.http = http.createServer(this.app);
        this.io = socket.listen(this.http);
        this.secret = 'secret';
        
        this.listenArgs = arguments;
        this._attach(this.app);
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
        this.secret = (typeof val == 'string') ? val : 'secret';
        
        return this; //chain
    };
    
    cs.prototype.listen = function() {
        this.http.listen.apply(this.http, this.listenArgs);
        
        return this; //chain
    };
    
    cs.prototype._attach = function(app) {
        this.once = app.once = function(fu) { //Returns a function that will run once and only once.
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
    };
    
    return cs;
}));