var SchemaType = require('../SchemaType')
  , utils = require('../../utils')
  , mixins = require('../mixins')
  , error = require('../../error')
  , CastError = error.CastError;

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 *
 * @constructor
 * @extends {SchemaType}
 */
function TypeString (base, name, options) {
  SchemaType.call(this, base, name, options, 'String');
};

/**
 * @private
 */
TypeString.prototype.__proto__ = SchemaType.prototype;

/**
 * Set minimum length
 * @param {Number} value
 * @param {String} [message] custom error message
 *
 * @return {TypeString}
 * @public
 */
TypeString.prototype.min = function (value, message) {
  if (this.minValidator) {
    this.validators = this.validators.filter(function (v) {
      return v[0] != this.minValidator;
    }, this);

    this.minValidator = false;
  }

  if (null != value) {
    message = message || error.messages.String.min;
    message = message.replace(/{MIN}/, value);
    this.validators.push([this.minValidator = function (v) {
      return v === null || v.length >= value;
    }, message, 'min']);
  }

  this.builtOpts.min = value;
  return this;
};

/**
 * Set maximum length
 * @param {Number} value
 * @param {String} [message] custom error message
 *
 * @return {TypeString}
 * @public
 */
TypeString.prototype.max = function (value, message) {
  if (this.maxValidator) {
    this.validators = this.validators.filter(function (v) {
      return v[0] != this.maxValidator;
    }, this);
    this.maxValidator = false;
  }

  if (null != value) {
    message = message || error.messages.Number.max;
    message = message.replace(/{MAX}/, value);
    this.validators.push([this.maxValidator = function (v) {
      return v === null || v.length <= value;
    }, message, 'max']);
  }

  this.builtOpts.max = value;
  return this;
};

/**
 * Adds an enum validator
 * @param {String|Object} [arg...] enumeration values
 *
 * @return {TypeString}
 * @public
 */
TypeString.prototype.enum = function (arg) {
  if (this.enumValidator) {
    this.validators = this.validators.filter(function (v) {
      return v[0] != this.enumValidator;
    }, this);
    this.enumValidator = false;
    this.builtOpts.enumValues = [];
  }

  if (undefined === arguments[0] || false === arguments[0]) {
    return this;
  }

  this.builtOpts.enumValues = this.builtOpts.enumValues || [];

  var values
    , errorMessage;

  if (utils.isObject(arguments[0])) {
    values = arguments[0].values;
    errorMessage = arguments[0].message;
  } else {
    values = arguments;
    errorMessage = error.messages.String.enum;
  }

  for (var i = 0; i < values.length; i++) {
    if (undefined !== values[i]) {
      this.builtOpts.enumValues.push(this.cast(values[i]));
    }
  }

  this.enumValidator = function (v) {
    return undefined === v || ~this.builtOpts.enumValues.indexOf(v);
  };
  this.validators.push([this.enumValidator, errorMessage, 'enum']);

  return this;
};

/**
 * Sets a regexp validator.
 * Any value that does not pass `regExp`.test(val) will fail validation.
 *
 * ####Example:
 *
 *     var s = db.schema({$name: 'M', name: { $type: String, $match: /^a/ }})
 *     var M = db.model('M')
 *     var m = new M({ name: 'I am invalid' })
 *     m.validate(function (err) {
 *       console.error(String(err)) // "ValidationError: Path `name` is invalid (I am invalid)."
 *       m.name = 'apples'
 *       m.validate(function (err) {
 *         assert.ok(err) // success
 *       })
 *     })
 *
 *     // using a custom error message
 *     var match = [ /\.html$/, "That file doesn't end in .html ({VALUE})" ];
 *     var s = db.schema({$name: 'M', file: { $type: String, $match: match }});
 *     var M = db.model('M');
 *     var m = new M({ file: 'invalid' });
 *     m.validate(function (err) {
 *       console.log(String(err)) // "ValidationError: That file doesn't end in .html (invalid)"
 *     })
 *
 * Empty strings, `undefined`, and `null` values always pass the match validator. If you require these values, enable the `required` validator also.
 *
 *     var s = db.schema({$name: 'M', name: { $type: String, $match: /^a/, $required: true }});
 *
 * @param {String|RegExp} regExp
 * @param {String} [message] custom error message
 *
 * @return {TypeString}
 * @public
 */
TypeString.prototype.match = function (regExp, message) {
  // allow multiple math validators
  message = message || error.messages.String.regexp;

  function matchValidator (v){
    return null != v && '' !== v
      ? regExp.test(v)
      : true
  }
  this.validators.push([matchValidator, message, 'regexp']);

  return this;
};

/**
 * Adds a trim setter.
 *
 * The string value will be trimmed when set.
 *
 * ####Example:
 *
 *     var s = db.schema({$name: 'M', name: { $type: String, $trim: true }})
 *     var M = db.model('M')
 *     var string = ' some name '
 *     console.log(string.length) // 11
 *     var m = new M({ name: string })
 *     console.log(m.name.length) // 9
 *
 * @return {SchemaType}
 * @public
 */
TypeString.prototype.trim = function () {
  return this.set(function (v, self) {
    if (!utils.isString(v)) v = self.cast(v);
    if (v) return v.trim();
    return v;
  });
};

/**
 * Adds a lowercase setter.
 *
 * ####Example:
 *
 *     var s = db.schema({$name: 'M', email: { $type: String, $lowercase: true }});
 *     var M = db.model('M');
 *     var m = new M({ email: 'SomeEmail@example.COM' });
 *     console.log(m.email) // someemail@example.com
 *
 * @return {SchemaType}
 * @public
 */
TypeString.prototype.lowercase = function () {
  return this.set(function (v, self) {
    if (!utils.isString(v)) v = self.cast(v);
    if (v) return v.toLowerCase();
    return v;
  });
};

/**
 * Adds an uppercase setter.
 *
 * ####Example:
 *
 *     var s = db.schema({$name: 'M', caps: { $type: String, $uppercase: true }});
 *     var M = db.model('M', s);
 *     var m = new M({ caps: 'an example' });
 *     console.log(m.caps) // AN EXAMPLE
 *
 * @api public
 * @return {SchemaType} this
 */
TypeString.prototype.uppercase = function () {
  return this.set(function (v, self) {
    if (!utils.isString(v)) v = self.cast(v);
    if (v) return v.toUpperCase();
    return v;
  });
};

/**
 * Set collate option
 * @param {String} collate [default | ci]
 *
 * @return {TypeString}
 * @public
 */
TypeString.prototype.collate = mixins.option('collate', ['default', 'ci']);

/**
 * @param {*} value
 *
 * @return {String}
 * @public
 */
TypeString.prototype.cast = function (value, path) {
  if (value === null || (typeof value === 'undefined')) return null;
  if (value.toString) return value.toString();

  throw new CastError(this.getType(), value, path);
};

/**
 * Check required field
 * @param {*} value
 *
 * @return {Boolean}
 * @protected
 */
TypeString.prototype.checkRequired = function (value) {
  return utils.isString(value) && value.length;
};

/**
 * @type {Object}
 * @protected
 */
TypeString.prototype.$conditionalHandlers = function () {
  var handlers = SchemaType.prototype.$conditionalHandlers.call(this);

  utils.merge(handlers, {
    $lk   : utils.handleSingle,
    $m    : utils.handleRegexp
  });

  return handlers;
};

module.exports = TypeString;