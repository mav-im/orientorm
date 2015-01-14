var TypeEmbeddedList = require('./EmbeddedList');

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 *
 * @constructor
 * @extends {TypeEmbeddedList}
 */
function TypeEmbeddedSet (base, name, options) {
  TypeEmbeddedList.call(this, base, name, options, 'set');
  this.options.type = 'EmbeddedSet';
};

/**
 * @private
 */
TypeEmbeddedSet.prototype.__proto__ = TypeEmbeddedList.prototype;

module.exports = TypeEmbeddedSet;