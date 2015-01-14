var Grammar = require('./Grammar')
  , mixins = require('./mixins');

/**
 * @constructor
 * @extends {Grammar}
 */
function GrammarInsert (builder) {
  Grammar.call(this, builder);
  this.components = [
    'insert',
    'into',
    'set',
    'from',
    'return'
  ];
};

/**
 * @private
 */
GrammarInsert.prototype.__proto__ = Grammar.prototype;

/**
 * @param {Boolean} insert
 *
 * @return {String} INSERT clause
 * @protected
 */
GrammarInsert.prototype.compileInsert = mixins.word('insert');

/**
 * @param {String[]} target
 *
 * @return {String} INTO clause
 * @protected
 */
GrammarInsert.prototype.compileInto = mixins.target('into', false);

/**
 * @param {Object} items
 *
 * @return {String} SET clause
 * @protected
 */
GrammarInsert.prototype.compileSet = mixins.change('set');

/**
 * @param {Statement[]} from
 *
 * @return {String} FROM clause
 * @protected
 */
GrammarInsert.prototype.compileFrom = mixins.from(false);

/**
 * @param {String} value
 *
 * @return {String} RETURN clause
 * @protected
 */
GrammarInsert.prototype.compileReturn = mixins.return();

module.exports = GrammarInsert;