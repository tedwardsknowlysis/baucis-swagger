var express = require("express");
var url = require("url");
var deco = require("deco");

var Swagger = function(baucis) {
	this.__baucis = baucis;
	var decorators = deco.require(__dirname, ["Controller"]).hash;
	baucis.Controller.decorators(decorators.Controller);
};

// Figure out the basePath for Swagger API definition
function getBase (request, extra) {
  var parts = request.originalUrl.split('/');
  // Remove extra path parts.
  parts.splice(-extra, extra);
  return request.protocol + '://' + request.headers.host + parts.join('/');
}

// A method for generating a Swagger resource listing
function generateResourceListing (options) {
  var plurals = options.controllers.map(function (controller) {
    return controller.model().plural();
  });
  var listing = {
    apiVersion: options.version,
    swaggerVersion: '1.1',
    basePath: options.basePath,
    apis: plurals.map(function (plural) {
      return { path: '/api-docs/' + plural, description: 'Operations about ' + plural + '.' };
    })
  };

  return listing;
}

Swagger.prototype.finalize = function() {
	var controllers = this.__baucis.controllers(); 

	var app = express.Router();	

	controllers.forEach(function(controller) {
		// Add routes for the controller's Swagger API definitions.
		var route = controller.model().modelName;
	 
		controller.finalize();

		app.use('/' + route, function (request, response, next) {
			response.set('X-Powered-By', 'Baucis');
			response.json(deco.merge(controller.swagger, {
				apiVersion: controller.versions(),
				swaggerVersion: '1.1',
				basePath: getBase(request, 2),
				resourcePath: route
			}));
		});
	});

	// Activate Swagger resource listing.
	app.use("/", function (request, response, next) {
		response.set('X-Powered-By', 'Baucis');
		response.json(generateResourceListing({
			version: "0.0.1",
			controllers: controllers,
			basePath: getBase(request, 1)
		}));
	});

	return app;
};

module.exports = Swagger;
