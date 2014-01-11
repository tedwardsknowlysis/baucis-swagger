// __Dependencies__
var baucis = require('baucis');
var deco = require('deco');
var decorators = deco.require(__dirname, [ 'Controller', 'Release' ]).hash;

baucis.Controller.decorators.push(decorators.Controller);
baucis.Release.decorators.push(decorators.Release);
