var Grammar = require('./Grammar')
  , mixins = require('./mixins');

/**
 * @constructor
 * @extends {Grammar}
 */
function GrammarUpdate (builder) {
  Grammar.call(this, builder);
  this.components = [
    'update',
    'set',
    'increment',
    'add',
    'remove',
    'put',
    'content',
    'merge',
    'upsert',
    'return',
    'where',
    'lock',
    'limit',
    'timeout'
  ];
};

/**
 * @private
 */
GrammarUpdate.prototype.__proto__ = Grammar.prototype;

/**
 * @param {*[]} sources List
 * @param {Object} params
 *
 * @return {String} UPDATE clause
 * @protected
 */
GrammarUpdate.prototype.compileUpdate = mixins.update();

/**
 * @param {Object} items
 *
 * @return {String} SET clause
 * @protected
 */
GrammarUpdate.prototype.compileSet = mixins.change('set');

/**
 * @param {Object} items
 *
 * @return {String} INCREMENT clause
 * @protected
 */
GrammarUpdate.prototype.compileIncrement = mixins.change('increment');

/**
 * @param {Object} items
 *
 * @return {String} Add clause
 * @protected
 */
GrammarUpdate.prototype.compileAdd = mixins.change('add');

/**
 * @param {Object} items
 *
 * @return {String} REMOVE clause
 * @protected
 */
GrammarUpdate.prototype.compileRemove = mixins.remove();

/**
 * @param {Object} items
 *
 * @return {String} REMOVE clause
 * @protected
 */
GrammarUpdate.prototype.compilePut = mixins.put();

/**
 * @param {Object} items
 *
 * @return {String} CONTENT clause
 * @protected
 */
GrammarUpdate.prototype.compileContent = mixins.content('content');

/**
 * @param {Object} items
 *
 * @return {String} MERGE clause
 * @protected
 */
GrammarUpdate.prototype.compileMerge = mixins.content('merge');

/**
 * @param {Boolean} delete
 *
 * @return {String} UPSERT clause
 * @protected
 */
GrammarUpdate.prototype.compileUpsert = mixins.word('upsert');

/**
 * @param {String} value
 *
 * @return {String} RETURN clause
 * @protected
 */
GrammarUpdate.prototype.compileReturn = mixins.return();

/**
 * @param {*[]} where
 * @param {Object} params
 *
 * @return {String} WHERE clause
 * @protected
 */
GrammarUpdate.prototype.compileWhere = mixins.where();

/**
 * @param {String} value
 *
 * @return {String} LOCK clause
 * @protected
 */
GrammarUpdate.prototype.compileLock = mixins.option('lock');

/**
 * @param {Number} value
 *
 * @return {String} LIMIT clause
 * @protected
 */
GrammarUpdate.prototype.compileLimit = mixins.option('limit');

/**
 * @param {Number} value
 *
 * @return {String} TIMEOUT clause
 * @protected
 */
GrammarUpdate.prototype.compileTimeout = mixins.option('timeout');

module.exports = GrammarUpdate;