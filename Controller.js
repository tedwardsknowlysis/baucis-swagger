// This is a Controller mixin to add methods for generating Swagger data.

// __Dependencies__
var mongoose = require('mongoose');

// __Private Members__

// Convert a Mongoose type into a Swagger type
function swaggerTypeFor (type) {
  if (!type) return null;
  if (type === String) return 'string';
  if (type === Number) return 'double';
  if (type === Date) return 'Date';
  if (type === Boolean) return 'boolean';
  if (type === mongoose.Schema.Types.ObjectId) return 'string';
  if (type === mongoose.Schema.Types.Oid) return 'string';
  if (type === mongoose.Schema.Types.Array) return 'Array';
  if (Array.isArray(type) || type.name === "Array") return 'Array';
  if (type === Object) return null;
  if (type instanceof Object) return null;
  if (type === mongoose.Schema.Types.Mixed) return null;
  if (type === mongoose.Schema.Types.Buffer) return null;
  throw new Error('Unrecognized type: ' + type);
}

// Check if the swagger type should be shown in this api...
function swaggerShowTypeFor(type) {
  if (!type) return null;
  if (   type === String
      || type === Number
      || type === Date
      || type === Boolean
      || type === mongoose.Schema.Types.ObjectId
      || type === mongoose.Schema.Types.Oid
      || type === mongoose.Schema.Types.Array)
    return isVisible(type);

  if (Array.isArray(type) || type.name === "Array")
    return isVisible(type[0]);

  if (  type === Object
      ||  type instanceof Object
      ||  type === mongoose.Schema.Types.Mixed
      ||  type === mongoose.Schema.Types.Buffer)
    return isVisible(type);

  return true;
}

// Check if the provided object should be part of the external schema...
function isVisible(object) {
  if (object != undefined && object != null) {
    if (object.visible != undefined) {
      return object.visible;
    }
  }
  return true;
}

// A method for capitalizing the first letter of a string
function capitalize (s) {
  if (!s) return s;
  if (s.length === 1) return s.toUpperCase();
  return s[0].toUpperCase() + s.substring(1);
}

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  var controller = this;

  // __Private Instance Members__

  // A method used to generate a Swagger model definition for a controller
  function generateModelDefinition () {
    var definition = {};
    var schema = controller.model().schema;

    definition.id = capitalize(controller.model().singular());
    definition.properties = {};

    Object.keys(schema.paths).forEach(function (name) {
      var property = {};
      var path = schema.paths[name];
      var select = controller.select();
      var type = swaggerTypeFor(path.options.type);
      var mode = (select && select.match(/(?:^|\s)[-]/g)) ? 'exclusive' : 'inclusive';
      var exclusiveNamePattern = new RegExp('\\B-' + name + '\\b', 'gi');
      var inclusiveNamePattern = new RegExp('(?:\\B[+]|\\b)' + name + '\\b', 'gi');

      // Keep deselected paths private
      if (path.selected === false) return;

      // TODO is _id always included unless explicitly excluded?

      // If it's excluded, skip this one.
      if (select && mode === 'exclusive' && select.match(exclusiveNamePattern)) return;
      // If the mode is inclusive but the name is not present, skip this one.
      if (select && mode === 'inclusive' && name !== '_id' && !select.match(inclusiveNamePattern)) return;

      // Configure the property
      property.required = path.options.required || false; // TODO _id is required for PUT
      property.type = type;

      // Set enum values if applicable
      if (path.enumValues && path.enumValues.length > 0) {
        property.allowableValues = { valueType: 'LIST', values: path.enumValues };
      }

      // Set allowable values range if min or max is present
      if (!isNaN(path.options.min) || !isNaN(path.options.max)) {
        property.allowableValues = { valueType: 'RANGE' };
      }

      if (!isNaN(path.options.min)) {
        property.allowableValues.min = path.options.min;
      }

      if (!isNaN(path.options.max)) {
        property.allowableValues.max = path.options.max;
      }

      if (!property.type) {
        console.log('Warning: That field type is not yet supported in baucis Swagger definitions, using "string."');
        console.log('Path name: %s.%s', definition.id, name);
        console.log('Mongoose type: %s', path.options.type);
        property.type = 'string';
      }

      if (swaggerShowTypeFor(path.options.type)) {
        definition.properties[name] = property;
      }
    });

    Object.keys(schema.virtuals).forEach(function (name) {
      var property = {};
      var path = schema.virtuals[name];
      var select = controller.select();
      var type = "string"; // Virtual types have no declared types 
      var mode = (select && select.match(/(?:^|\s)[-]/g)) ? 'exclusive' : 'inclusive';
      var exclusiveNamePattern = new RegExp('\\B-' + name + '\\b', 'gi');
      var inclusiveNamePattern = new RegExp('(?:\\B[+]|\\b)' + name + '\\b', 'gi');

      // Keep deselected paths private
      if (path.selected === false) return;

      // TODO is _id always included unless explicitly excluded?

      // If it's excluded, skip this one.
      if (select && mode === 'exclusive' && select.match(exclusiveNamePattern)) return;
      // If the mode is inclusive but the name is not present, skip this one.
      if (select && mode === 'inclusive' && name !== '_id' && !select.match(inclusiveNamePattern)) return;

      // Configure the property
      property.required = path.options.required || false; // TODO _id is required for PUT
      property.type = type;

      // Set enum values if applicable
      if (path.enumValues && path.enumValues.length > 0) {
        property.allowableValues = { valueType: 'LIST', values: path.enumValues };
      }

      // Set allowable values range if min or max is present
      if (!isNaN(path.options.min) || !isNaN(path.options.max)) {
        property.allowableValues = { valueType: 'RANGE' };
      }

      if (!isNaN(path.options.min)) {
        property.allowableValues.min = path.options.min;
      }

      if (!isNaN(path.options.max)) {
        property.allowableValues.max = path.options.max;
      }

      if (!property.type) {
        console.log('Warning: That field type is not yet supported in baucis Swagger definitions, using "string."');
        console.log('Path name: %s.%s', definition.id, name);
        console.log('Mongoose type: %s', path.options.type);
        property.type = 'string';
      }

      definition.properties[name] = property;
    });

    return definition;
  };

  // Generate parameter list for operations
  function generateParameters (verb, plural, subPath) {
    var parameters = [];

	 if (subPath) {
		parameters.push({
        paramType: 'path',
        name: controller.model().singular() + 'Id',
        description: 'The ID of a ' + controller.model().singular(),
        dataType: 'string',
        required: true,
        allowMultiple: false
      });
	 }

    // Parameters available for singular routes
    if (!plural) {
      parameters.push({
        paramType: 'path',
        name: 'id',
        description: 'The ID of a ' + controller.model().singular(),
        dataType: 'string',
        required: true,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'header',
        name: 'X-Baucis-Update-Operator',
        description: '**BYPASSES VALIDATION** May be used with PUT to update the document using $push, $pull, or $set.',
        dataType: 'string',
        required: false,
        allowMultiple: false
      });
    }

    // Parameters available for plural routes
    if (plural) {
      parameters.push({
        paramType: 'query',
        name: 'skip',
        description: 'How many documents to skip.',
        dataType: 'int',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'limit',
        description: 'The maximum number of documents to send.',
        dataType: 'int',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'count',
        description: 'Set to true to return count instead of documents.',
        dataType: 'boolean',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'conditions',
        description: 'Set the conditions used to find or remove the document(s).',
        dataType: 'string',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'sort',
        description: 'Set the fields by which to sort.',
        dataType: 'string',
        required: false,
        allowMultiple: false
      });
    }

    // Parameters available for singular and plural routes
    parameters.push({
      paramType: 'query',
      name: 'select',
      description: 'Select which paths will be returned by the query.',
      dataType: 'string',
      required: false,
      allowMultiple: false
    });

    parameters.push({
      paramType: 'query',
      name: 'populate',
      description: 'Specify which paths to populate.',
      dataType: 'string',
      required: false,
      allowMultiple: false
    });

    if (verb === 'post') {
      // TODO post body can be single or array
      parameters.push({
        paramType: 'body',
        name: 'document',
        description: 'Create a document by sending the paths to be updated in the request body.',
        dataType: capitalize(controller.model().singular()),
        required: true,
        allowMultiple: false
      });
    }

    if (verb === 'put') {
      parameters.push({
        paramType: 'body',
        name: 'document',
        description: 'Update a document by sending the paths to be updated in the request body.',
        dataType: capitalize(controller.model().singular()),
        required: true,
        allowMultiple: false
      });
    }

    return parameters;
  }

  function generateErrorResponses (plural) {
    var errorResponses = [];

    // TODO other errors (400, 403, etc. )

    // Error rosponses for singular operations
    if (!plural) {
      errorResponses.push({
        code: 404,
        reason: 'No ' + controller.model().singular() + ' was found with that ID.'
      });
    }

    // Error rosponses for plural operations
    if (plural) {
      errorResponses.push({
        code: 404,
        reason: 'No ' + controller.model().plural() + ' matched that query.'
      });
    }

    // Error rosponses for both singular and plural operations
    // None.

    return errorResponses;
  }

  // Generate a list of a controller's operations
  function generateOperations (c, plural, subPath) {
	 var model = c.model();
    var operations = [];

    c.methods().forEach(function (verb) {
      var operation = {};
      var titlePlural = capitalize(model.plural());
      var titleSingular = capitalize(model.singular());

      // Don't do head, post/put for single/plural
      if (verb === 'head') return;
      if (verb === 'post' && !plural) return;
      if (verb === 'put' && plural) return;

      // Use the full word
      if (verb === 'del') verb = 'delete';

      operation.httpMethod = verb.toUpperCase();

      if (subPath) {
			if (plural) {
				operation.nickname = verb + titlePlural + 'By' + model.singular();
			} else {
				operation.nickname = verb + titleSingular + 'ByIdBy' + model.singular();
			}
		} else {
			if (plural) {
				operation.nickname = verb + titlePlural;
			} else {
				operation.nickname = verb + titleSingular + 'ById';
			}
		}

      operation.responseClass = titleSingular; // TODO sometimes an array!

      if (plural) operation.summary = capitalize(verb) + ' some ' + model.plural();
      else operation.summary = capitalize(verb) + ' a ' + model.singular() + ' by its unique ID';

      operation.parameters = generateParameters(verb, plural, subPath);
      operation.errorResponses = generateErrorResponses(plural, subPath);

      operations.push(operation);
    });

    return operations;
  }

	  // __Build the Definition__
  controller.generateSwagger = function () {
		controller.swagger = { apis: [], models: {} };

		controller.swagger.addPath = function(subcontrollers) {
			subcontrollers.forEach(function(subcontroller){
				var model = subcontroller.model();
				controller.swagger.apis.push({
					path: '/' + controller.model().plural() + "/{" + controller.model().singular() + "Id}/" + model.plural(),
					description: "Operations about " + model.plural() + " of a " + controller.model().singular(),
					operations: generateOperations(subcontroller, true, true)
				});
				controller.swagger.apis.push({
					path: '/' + controller.model().plural() + "/{" + controller.model().singular() + "Id}/" + model.plural() + "/{Id}",
					description: "Operations about " + model.plural() + " of a " + controller.model().singular(),
					operations: generateOperations(subcontroller, false, true)
				});
			});
		};	 

		controller.finalize = function () {
			var modelName = capitalize(controller.model().singular());
			//
			// Model
			controller.swagger.models[modelName] = generateModelDefinition();

			// Instance route
			controller.swagger.apis.unshift({
				path: '/' + controller.model().plural() + '/{id}',
				description: 'Operations about a given ' + controller.model().singular(),
				operations: generateOperations(controller, false)
			});

			// Collection route
			controller.swagger.apis.unshift({
				path: '/' + controller.model().plural(),
				description: 'Operations about ' + controller.model().plural(),
				operations: generateOperations(controller, true)
			});
			
			return controller;
		};

		return controller;
	};

  return controller.generateSwagger();
};
