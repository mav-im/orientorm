/**
 * OrientormError constructor
 *
 * @param {String} msg Error message
 * @extends {Error} https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */
function OrientormError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.name = 'OrientormError';
};

/**
 * @private
 */
OrientormError.prototype.__proto__ = Error.prototype;

/**
 * Formats error messages
 * @param {String} msg
 * @param {String} path
 * @param {String} type
 * @param {String} val
 *
 * @return {String}
 * @public
 */
OrientormError.prototype.formatMessage = function (msg, path, type, val) {
  if (!msg) throw new TypeError('message is required');

  return msg.replace(/{PATH}/, path)
    .replace(/{VALUE}/, String(val||''))
    .replace(/{TYPE}/, type || 'declared type');
};

module.exports = OrientormError;