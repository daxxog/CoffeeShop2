/* CoffeeShop2 / server.js
 * example of a running a static / dynamic server
 * (c) 2012 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var CoffeeShop = require('./CoffeeShop2'),
    dynamic = require('./dynamic');
    
var cs = new CoffeeShop(7777);

cs
    .secret('1337')
    .ring()
    .bind(dynamic)
.listen();