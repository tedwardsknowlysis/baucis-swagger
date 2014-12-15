/* 
 server.js
 mongodb-rest

 Created by Tom de Grunt on 2010-10-03.
 Copyright (c) 2010 Tom de Grunt.
 This file is part of mongodb-rest.
 */

//var fs = require("fs");
//var  util = require('util');
var express = require('express');
var baucis = require('baucis');
var Swagger = require('baucis-swagger');
var router = express.Router();
var path = require('path');
var config = require('config');
var mongoose = require('mongoose');
var mongodb = config.Main.mongourl;
var log = require('./logger');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

mongoose.connect(mongodb);

var app = express();

//app.use(logger('dev'));
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use(require('body-parser')());

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Token');

  if (req.method === 'OPTIONS') {
//        console.log('!OPTIONS');
    var headers = {};
    // IE8 does not allow domains to be specified, just the *
    // headers["Access-Control-Allow-Origin"] = req.headers.origin;
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Token";
    res.writeHead(200, headers);
    res.end();
  } else {
    next();
  }
});

//if (config.accessControl){
//	var accesscontrol = require('./lib/accesscontrol');
//	app.use(accesscontrol.handle);
//}

//Setup Models
var appointment         = require('./models/appointment');
var user                =   require('./models/user');
var adherence           =   require('./models/adherence');
var regimen             =   require('./models/regimen');
var prescription        =   require('./models/prescription');
var regimenPrescription =   require('./models/regimenPrescription');
var level               =   require('./models/level');
var levelType           =   require('./models/levelType');
var diagnosis           =   require('./models/diagnosis');
var provider            =   require('./models/provider');
var medDetail           =   require('./models/meddetail');
var reminder            =   require('./models/reminder');

var simpleAuth = require('./lib/simpleAuth');

if(config.Main.sessionTimeOut){
  simpleAuth.setTimeOut(config.Main.sessionTimeOut)
}

//require('./lib/rest')(app, config);
var dbroute = require("./routes/db");

var swagger = new Swagger(baucis);

baucis.rest(appointment.model);
var userController = baucis.rest(user.model);
baucis.rest(adherence.model);
baucis.rest(regimen.model);
baucis.rest(prescription.model);
baucis.rest(regimenPrescription.model);
baucis.rest(level.model);
baucis.rest(levelType.model);
baucis.rest(diagnosis.model);
baucis.rest(provider.model);
baucis.rest(medDetail.model);
baucis.rest(reminder.model);

swagger.finalize(app, '/swapi');
app.use('/swapi', baucis());

app.use('/db', dbroute);
//app.use('/api', simpleAuth.ensureAuthentication);
app.use('/appointments',require("./routes/appointments"));
app.use('/api/appointments',require("./routes/appointments"));
app.use('/api/regimens',require("./routes/regimens"));
app.use('/users',require("./routes/users"));
app.use('/api/users',require("./routes/users"));
app.use('/providers',require("./routes/providers"));
app.use('/api/providers',require("./routes/providers"));
app.use('/diagnoses',require("./routes/diagnoses"));
app.use('/api/diagnoses',require("./routes/diagnoses"));
app.use('/meddetails',require("./routes/meddetails"));
app.use('/api/meddetails',require("./routes/meddetails"));
app.use('/api/prescriptions',require("./routes/prescriptions"));
app.use('/api/regimenPrescriptions',require("./routes/regimenPrescriptions"));
app.use('/api/adherences',require("./routes/adherences"));
app.use('/levelTypes',require("./routes/levelTypes"));
app.use('/api/levelTypes',require("./routes/levelTypes"));
app.use('/api/levels',require("./routes/levels"));
app.use('/api/reminders',require("./routes/reminders"));

app.use('/schema',require("./routes/schema"));
app.use('/senchaschema',require("./routes/senchaschema"));
//used to initialize the db..etc
app.use('/debug',require("./routes/debug"));
app.use('/', require("./routes/general"));

app.post('/authorize',simpleAuth.authenticate);


//This route is only setup to test the authentication piece
app.get('/api/test', function(req, res){
  res.json({ 'somedata' : 'Matt', content: 'My Content'});
});

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

router.get('/schema/:modelName', function(req, res, next) {
  var modelName = req.param('modelName')
  var modelInfo = {
    model: mongoose.model(modelName).modelName,
    schema: mongoose.model(modelName).schema
  };
  res.send(JSON.stringify(modelInfo));
});

/// error handlers

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {}
  });
});


if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });

  });
}

module.exports = app;