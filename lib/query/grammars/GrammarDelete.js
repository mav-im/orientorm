var Grammar = require('./Grammar')
  , mixins = require('./mixins');

/**
 * @constructor
 * @extends {Grammar}
 */
function GrammarDelete (builder) {
  Grammar.call(this, builder);
  this.components = [
    'delete',
    'from',
    'lock',
    'return',
    'where',
    'limit',
    'timeout'
  ];
};

/**
 * @private
 */
GrammarDelete.prototype.__proto__ = Grammar.prototype;

/**
 * @param {Boolean} delete
 *
 * @return {String} DELETE clause
 * @protected
 */
GrammarDelete.prototype.compileDelete = mixins.word('delete');

/**
 * @param {*[]} sources List of class names or sub-queries
 * @param {Object} params
 *
 * @return {String} FROM clause
 * @protected
 */
GrammarDelete.prototype.compileFrom = mixins.from();

/**
 * @param {String} value
 *
 * @return {String} LOCK clause
 * @protected
 */
GrammarDelete.prototype.compileLock = mixins.option('lock');

/**
 * @param {String} value
 *
 * @return {String} RETURN clause
 * @protected
 */
GrammarDelete.prototype.compileReturn = mixins.return();

/**
 * @param {*[]} where
 * @param {Object} params
 *
 * @return {String} WHERE clause
 * @protected
 */
GrammarDelete.prototype.compileWhere = mixins.where();

/**
 * @param {Number} value
 *
 * @return {String} LIMIT clause
 * @protected
 */
GrammarDelete.prototype.compileLimit = mixins.option('limit');

/**
 * @param {Number} value
 *
 * @return {String} TIMEOUT clause
 * @protected
 */
GrammarDelete.prototype.compileTimeout = mixins.option('timeout');

module.exports = GrammarDelete;