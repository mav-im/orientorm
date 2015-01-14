var Grammar = require('./Grammar')
  , mixins = require('./mixins');

/**
 * @constructor
 * @extends {Grammar}
 */
function GrammarSelect (builder) {
  Grammar.call(this, builder);
  this.components = [
    'select',
    'from',
    'let',
    'where',
    'group',
    'order',
    'skip',
    'limit',
    'fetchPlan',
    'timeout',
    'lock',
    'parallel'
  ];
};

/**
 * @private
 */
GrammarSelect.prototype.__proto__ = Grammar.prototype;

/**
 * Compile SELECT part of query
 * @param {Array} projections
 * @param {Object} params
 *
 * @return {String} SELECT clause
 * @protected
 */
GrammarSelect.prototype.compileSelect = mixins.select();

/**
 * @param {*[]} sources List of class names or sub-queries
 * @param {Object} params
 *
 * @return {String} FROM clause
 * @protected
 */
GrammarSelect.prototype.compileFrom = mixins.from();

/**
 * @param {Object} lets
 * @param {Object} params
 *
 * @return {String} LET clause
 * @protected
 */
GrammarSelect.prototype.compileLet = mixins.let();

/**
 * @param {*[]} where
 * @param {Object} params
 *
 * @return {String} WHERE clause
 * @protected
 */
GrammarSelect.prototype.compileWhere = mixins.where();

/**
 * @param {String[]} group
 *
 * @return {String} GROUP clause
 * @protected
 */
GrammarSelect.prototype.compileGroup = function (group) {
  // currently only one group by field supported,
  // see https://github.com/orientechnologies/orientdb/wiki/SQL-Query#syntax
  // return 'GROUP BY ' + group.join(', ');
  return 'GROUP BY ' + group[0];
};

/**
 * @param {*[]} order
 *
 * @return {string} ORDER clause
 * @protected
 */
GrammarSelect.prototype.compileOrder = function (order) {
  return 'ORDER BY ' + order.map(function (item) {
    return item.property + ' ' + item.direction;
  }).join(', ');
};

/**
 * @param {Number} value
 *
 * @return {String} SKIP clause
 * @protected
 */
GrammarSelect.prototype.compileSkip = mixins.option('skip');

/**
 * @param {Number} value
 *
 * @return {String} LIMIT clause
 * @protected
 */
GrammarSelect.prototype.compileLimit = mixins.option('limit');

/**
 * @param {Object[]} fetchPlan
 * @param {Object} params
 *
 * @return {String} FETCHPLAN clause
 * @protected
 */
GrammarSelect.prototype.compileFetchPlan = function (fetchPlan, params) {
  if (!fetchPlan.length) return '';
  return 'FETCHPLAN ' + fetchPlan.map(function(item) {
    return Object.keys(item).map(function(key) {
      return key + ':' + item[key];
    }).join(' ');
  }).join(' ');
};

/**
 * @param {Number} value
 *
 * @return {String} TIMEOUT clause
 * @protected
 */
GrammarSelect.prototype.compileTimeout = mixins.option('timeout');

/**
 * @param {String} value
 *
 * @return {String} LOCK clause
 * @protected
 */
GrammarSelect.prototype.compileLock = mixins.option('lock');

/**
 * @param {Boolean} value
 *
 * @return {String} PARALLEL clause
 * @protected
 */
GrammarSelect.prototype.compileParallel = mixins.word('parallel');


module.exports = GrammarSelect;