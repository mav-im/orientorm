var TypeLinkList = require('./LinkList');

/**
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options
 *
 * @constructor
 * @extends {TypeLinkList}
 */
function TypeLinkSet (base, name, options) {
  TypeLinkList.call(this, base, name, options, 'set');
  this.options.type = 'LinkSet';
};

/**
 * @private
 */
TypeLinkSet.prototype.__proto__ = TypeLinkList.prototype;

module.exports = TypeLinkSet;