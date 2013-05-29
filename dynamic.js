/* CoffeeShop2 / dynamic.js
 * example of a dynamic server [serve up that express-o in your coffeeshop.js]
 * (c) 2012 David (daXXog) Volm ><> + + + <><
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
    var dynamic = {};
    
    dynamic.b = function(grab, data) {
        var app = grab('app');
        
        app.get('/expresso', function(req, res) {
            req.prosess.skill = 'Hello World!';
            req.prosess.user = 'daxxog';
            
            var io = app.fakeIO(req.prosess.user); //create some fake io for the user
            io.emit('alert', 'ProSess + socket.io skill: ' + req.prosess.skill); //emit a message using fake io
            res.send('<script type="text/javascript" src="./socket.io/socket.io.js"></script><script type="text/javascript">var socket = io.connect("http://"+window.location.host);socket.on("alert", function(msg) {alert(msg);});</script>' + req.prosess.skill); //send another message using res
        });
        
        app.sockAuth(function(prosess, setID, accept) { //insecure socket authentication
            setID(prosess.user); //set the id from the session
            accept(null, true); //accept the socket
        });
    };
    
    return dynamic;
}));