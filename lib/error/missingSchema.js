var OrientormError = require('./base');

/**
 * MissingSchema Error constructor.
 * @extends {OrientormError}
 */
function MissingSchemaError (name) {
  var msg = 'Schema hasn\'t been registered for model "' + name + '".\n'
    + 'Use connection.model(name, schema)';
  OrientormError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'MissingSchemaError';
};

/**
 * @private
 */
MissingSchemaError.prototype.__proto__ = OrientormError.prototype;

module.exports = MissingSchemaError;