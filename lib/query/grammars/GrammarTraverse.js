var Grammar = require('./Grammar')
  , mixins = require('./mixins');

/**
 * @constructor
 * @extends {Grammar}
 */
function GrammarTraverse (builder) {
  Grammar.call(this, builder);
  this.components = [
    'traverse',
    'from',
    'let',
    'where',
    'limit',
    'strategy'
  ];
};

/**
 * @private
 */
GrammarTraverse.prototype.__proto__ = Grammar.prototype;

/**
 * @param {*[]} sources List of fields
 * @param {Object} params
 *
 * @return {String} TRAVERSE clause
 * @protected
 */
GrammarTraverse.prototype.compileTraverse = mixins.traverse();

/**
 * @param {*[]} sources List of class names or sub-queries
 * @param {Object} params
 *
 * @return {String} FROM clause
 * @protected
 */
GrammarTraverse.prototype.compileFrom = mixins.from();

/**
 * @param {Object} lets
 * @param {Object} params
 *
 * @return {String} LET clause
 * @protected
 */
GrammarTraverse.prototype.compileLet = mixins.let();

/**
 * @param {*[]} where
 * @param {Object} params
 *
 * @return {String} WHILE clause
 * @protected
 */
GrammarTraverse.prototype.compileWhere = mixins.where('while');

/**
 * @param {Number} value
 *
 * @return {String} LIMIT clause
 * @protected
 */
GrammarTraverse.prototype.compileLimit = mixins.option('limit');

/**
 * @param {String} value
 *
 * @return {String} LOCK clause
 * @protected
 */
GrammarTraverse.prototype.compileStrategy = mixins.option('strategy');

module.exports = GrammarTraverse;