/* CoffeeShop2 / server_blank.js
 * blank server file
 * (c) 2013 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var server = require('coffeeshop'),
    dynamic = require('./dynamic');
    
var cs = new CoffeeShop(7777);

cs
    .bind(dynamic)
.listen();