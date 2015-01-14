var mixins = require('./mixins')
  , utils = require('../utils')
  , error = require('../error')
  , CastError = error.CastError
  , ValidatorError = error.ValidatorError;

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 * @param {String} type
 *
 * @constructor
 */
function SchemaType (base, name, options, type) {
  this.base = base;
  this.options = this.options || {};
  this.builtOpts = this.builtOpts || {};

  this.validators = [];
  this.setters = [];
  this.getters = [];

  this.options.name = name;
  this.options.type = type;
  this.parseOptions(options);
};

/**
 * @type {DbSchema}
 * @protected
 */
SchemaType.prototype.base;

/**
 * @type {Object}
 * @protected
 */
SchemaType.prototype.options;

/**
 * @type {Object}
 * @protected
 */
SchemaType.prototype.builtOpts;

/**
 * An array with validators
 * @type {Array}
 * @protected
 */
SchemaType.prototype.validators;

/**
 * An array with setters
 * @type {Array}
 * @protected
 */
SchemaType.prototype.setters;

/**
 * An array with getters
 * @type {Array}
 * @protected
 */
SchemaType.prototype.getters;

/**
 * Prepare options
 * @param {Object} options
 *
 * @return {SchemaType}
 * @protected
 */
SchemaType.prototype.parseOptions = function (options) {
  for (var i in options) {
    if (i.substr(0, 1) !== '$') continue;
    var method = i.substr(1);
    if (this[method] && utils.isFunction(this[method])) {

      var opts = utils.isArray(options[i])
        ? options[i]
        : [options[i]];

      this[method].apply(this, opts);
    }
  }
  return this;
};

/**
 * @return {String}
 * @public
 */
SchemaType.prototype.getPath = function (prefix) {
  var name = this.getName();
  if (prefix) {
    return name ? prefix + '.' + name : prefix
  }
  return name;
};

/**
 * Adds a setter to this schema path.
 * @param {Function} fn

 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.set = function (fn) {
  if (!utils.isFunction(fn))
    throw new TypeError('A setter must be a function.');
  this.setters.push(fn);
  return this;
};

/**
 * Adds a getter to this schema path
 * @param {Function} fn
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.get = function (fn) {
  if (!utils.isFunction(fn))
    throw new TypeError('A getter must be a function.');
  this.getters.push(fn);
  return this;
};

/**
 * Adds validator(s) for this document path.
 * Validators always receive the value to validate as their first argument and must return `Boolean`. Returning `false` means validation failed.
 * The error message argument is optional. If not passed, the default generic error message template will be used.
 *
 * @param {Function|Object[]} obj validator or an array of objects {validator: fn, msg: 'error message'}
 * @param {String} [message] Error message
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.validate = function (obj, message) {
  if (utils.isFunction(obj) || utils.isRegExp(obj)) {
    message = message || error.messages.general.default;
    this.validators.push([obj, message, 'user defined']);
    return this;
  }
  else if (utils.isArray(obj)) {
    var self = this;
    obj.forEach(function (arg) {
      if (!utils.isObject(arg))
        throw new Error('Invalid validator. Received (' + typeof arg + ').');
      self.validate(arg.validator, arg.msg);
    });
    return this;
  }

  throw new Error('Invalid validator. Received (' + typeof obj + ').');
};

/**
 * Performs a validation of `value` using the validators declared for this Schema Property.
 * @param {*} value
 * @param {String} path
 * @param {Function} fn callback
 * @param {Object} scope
 *
 * @public
 */
SchemaType.prototype.doValidate = function (value, path, fn, scope) {
  var err = null
    , count = this.validators.length;

  if (!count) return fn(null);

  this.validators.forEach(function (v) {
    if (utils.isRegExp(v[0])) {
      validate(v[0].test(value), v[1], v[2], value);
    }
    else {
      validate(v[0].call(scope, value), v[1], v[2], value);
    }
  });

  return fn(err);

  function validate (ok, message, type, val) {
    if (err) return;
    if (ok !== undefined && !ok) {
      err = new ValidatorError(path, message, type, val);
    }
  }
};

/**
 * Set mandatory
 * @param {Boolean|String} required
 * @param {String} [message] Custom error message
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.required = function (required, message) {
  if (required === false) {
    this.validators = this.validators.filter(function (v) {
      return v[0] != this.requiredValidator;
    }, this);

    this.builtOpts.mandatory = false;
    return this;
  }

  var self = this
    , path = this.getName();

  this.builtOpts.mandatory = true;
  this.requiredValidator = function (v) {
    // in here, `this` refers to the validating document.
    // no validation when this path wasn't selected in the query.
    if ('isSelected' in this &&
      !this.isSelected(path) &&
      !this.isModified(path)) return true;
    return self.checkRequired(v, this);
  };

  if (utils.isString(required)) {
    message = required;
  }

  message = message || error.messages.general.required;
  this.validators.push([this.requiredValidator, message, 'required']);

  return this;
};

/**
 * @param {String} name
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.name = mixins.option('name');

/**
 * @param {Object} custom
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.custom = mixins.option('custom');

/**
 * @return {String}
 * @public
 */
SchemaType.prototype.getName = mixins.getOption('name');

/**
 * Check required field
 * @param {*} value
 * @param {Object} scope
 *
 * @return {Boolean}
 * @protected
 */
SchemaType.prototype.checkRequired = function (value, scope) {
  throw new Error("Unsupported Operation");
};

/**
 * Applies setters
 * @param {*} value
 * @param {Object} scope
 * @param {String} [path]
 *
 * @public
 */
SchemaType.prototype.applySetters = function (value, path, scope, init, priorVal) {
  //var v = value
  //  , len = this.setters.length
  //
  //if (len) {
  //  while (len--) {
  //    v = this.setters[len].call(scope, v, this);
  //  }
  //}
  //return (null === v || undefined === v) ? v : this.cast(v, path, scope, init, priorVal);

  var v = value
    , setters = this.setters
    , len = setters.length

  if (!len) {
    if (null === v || undefined === v) return v;
    return this.cast(v, path, scope, init, priorVal);
  }

  while (len--) {
    v = setters[len].call(scope, v, this);
  }

  if (null === v || undefined === v) return v;

  // do not cast until all setters are applied #665
  v = this.cast(v, path, scope, init, priorVal);

  return v;
};

/**
 * Applies getters to a value
 * @param {Object} value
 * @param {Object} scope
 *
 * @public
 */
SchemaType.prototype.applyGetters = function (value, scope) {
  var v = value
    , len = this.getters.length;

  if (len) {
    while (len--) {
      v = this.getters[len].call(scope, v, this);
    }
  }
  return v;
};

/**
 * Set read only
 * @param {Boolean} bool
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.readOnly = mixins.option('readOnly');

/**
 * Set not null
 * @param {Boolean|String} notNull
 * @param {String} [message] custom error message
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.notNull = function (notNull, message) {
  if (notNull === false) {
    this.validators = this.validators.filter(function (v) {
      return v[0] != this.notNullValidator;
    }, this);

    this.builtOpts.notNull = false;
    return this;
  }

  this.builtOpts.notNull = true;
  this.notNullValidator = function (v) {
    return (null !== v);
  };

  if (utils.isString(notNull)) {
    message = notNull;
  }

  message = message || error.messages.general.notNull;
  this.validators.push([this.notNullValidator, message, 'not null']);

  return this;
}

/**
 * @return {String}
 * @public
 */
SchemaType.prototype.getType = mixins.getOption('type');

/**
 * Prepare object with full schema description
 *
 * @return {Object}
 * @public
 */
SchemaType.prototype.getStructure = function () {
  return this.options;
};

/**
 * Sets a default value for this Schema Property.
 * @param {Function|*} val
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.default = function (val) {
  this.defaultValue = val;
  return this;
};

/**
 * Get default value
 *
 * @return {*}
 * @public
 */
SchemaType.prototype.getDefault = function (scope, init, path) {
  var ret = (utils.isFunction(this.defaultValue))
    ? this.defaultValue.call(scope)
    : this.defaultValue;

  return (null === ret || undefined === ret) ? ret : this.cast(ret, path, scope, init);
};

/**
 * Get required option
 * @return {Boolean}
 * @public
 */
SchemaType.prototype.isRequired = function () {
  return !!this.builtOpts.mandatory;
};

/**
 * Apply function to all paths
 * @param {Function} fn
 * @param {String} [path]
 *
 * @return {SchemaType}
 * @public
 */
SchemaType.prototype.iterate = function (fn, path) {
  fn(path, this);
  return this;
};

/**
 * Get path dependencies on classes
 * @return {String[]}
 * @protected
 */
SchemaType.prototype.dependencies = function () {
  return [];
};

/**
 * Build document tree
 * @return {*}
 * @public
 */
SchemaType.prototype.buildTree = function () {
  return this.getType();
};

/**
 * @type {Object}
 * @protected
 */
SchemaType.prototype.$conditionalHandlers = function () {
  return {
    $eq   : utils.handleSingle,
    $lt   : utils.handleSingle,
    $lte  : utils.handleSingle,
    $gt   : utils.handleSingle,
    $gte  : utils.handleSingle,
    $ne   : utils.handleSingle,

    $is   : utils.handleSingle,
    $isnt : utils.handleSingle,

    $in   : utils.handleArray,
    $nin  : utils.handleArray,
    $btw  : utils.handleArray
  };
};

/**
 * Casts contents for queries
 *
 * @param {String|*} $conditional
 * @param {*} [val]
 * @param {String} [path]
 *
 * @return
 * @public
 */
SchemaType.prototype.castForQuery = function ($conditional, val, path) {
  var handler;
  if (arguments.length === 3) {
    handler = this.$conditionalHandlers()[$conditional];
    if (!handler)
      throw new Error("Can't use `" + $conditional + "` with " + this.getType() + ".");

    return handler.call(this, val, path);
  }

  // $conditional is value, val is path
  return this.cast($conditional, val);
};

module.exports = SchemaType;