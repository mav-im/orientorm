var Sql = require('../../Sql')
  , utils = require('../../utils')
  , Statement = require('../statements/Statement');

/**
 * Common interface for compiling query
 * @param {QueryBuilder} builder
 *
 * @constructor
 */
function Grammar (builder) {
  this.builder = builder;
  this.components = [];
  this.pCount = null;
};

/**
 * @type {QueryBuilder}
 * @public
 */
Grammar.prototype.builder;

/**
 * @type {Statement}
 * @protected
 */
Grammar.prototype.statement;

/**
 * @type {Array}
 * @protected
 */
Grammar.prototype.components;

/**
 * @type {Number} parameters count
 */
Grammar.prototype.pCount;

/**
 * @param {Statement} query
 * @param {Object} params
 *
 * @return {Sql}
 * @public
 */
Grammar.prototype.compileStatement = function (query, params) {
  query.prepare(this.builder);
  this.statement = query;
  params = params || {};
  this.pCount = null;
  utils.merge(params, query.criteria.params);

  var sql = this.compileComponents(query, params).join(' ');

  var options = query.options ? utils.clone(query.options) : {};
  utils.merge(options, {params: params});

  return new Sql(sql, options);
};

/**
 * Compile the components necessary for a SQL query
 * @param {Statement} query
 * @param {Object} params
 *
 * @return {String[]}
 * @protected
 */
Grammar.prototype.compileComponents = function (query, params) {
  var self = this
    , method
    , sql = this.components.map(function (item) {
      if (query.criteria[item] === undefined) return null;
      method = 'compile' + item.charAt(0).toUpperCase() + item.slice(1);
      if (self[method] && utils.isFunction(self[method])) {
        return self[method](query.criteria[item], params);
      }
    }).filter(function (item) {
      return !!item;
    });

  return sql.length > 1 ? sql : [];
};

/**
 * Get class schema
 *
 * @return {Schema}
 * @protected
 */
Grammar.prototype.getSchema = function () {
  return this.statement.getSchema();
};

/**
 * @param {*} value
 * @param {Object} params
 * @param {Boolean} [one]
 *
 * @return {String|String[]}
 * @public
 */
Grammar.prototype.paramify = function (value, params, one) {
  var self = this
    , isArray = utils.isArray(value)
    , values = (isArray ? value : [value]).map(function (val) {
      return self.paramifyOne(val, params);
    });

  return (one || !isArray) ? values[0] : values;
};

/**
 * @param {*} value
 * @param {Object} params
 *
 * @return {String|null}
 * @protected
 */
Grammar.prototype.paramifyOne = function (value, params) {
  if (value instanceof Statement) {
    var sub = this.builder.compile(value, params);
    return sub.query ? '(' + sub.query + ')' : null;
  }

  if (this.pCount === null) {
    this.pCount = utils.count(params);
  }

  var pName = this.builder.paramPrefix + this.pCount;

  params[pName] = fixValue(value);

  this.pCount++;
  return ":" + pName;
};

function fixValue (value) {
  var fixedV = utils.clone(value);
  if (utils.isArray(fixedV)) {
    return fixedV.map(function (item) {
      return fixValue(item);
    });
  }
  else if (utils.isObject(fixedV)) {
    for (var i in fixedV) {
      if (!fixedV.hasOwnProperty(i)) continue;
      fixedV[i] = fixValue(fixedV[i]);
    }
    return fixedV;
  }
  else if (utils.isDate(fixedV)) {
    return utils.dateToString(fixedV);
  }
  return fixedV;
};

/**
 * Convert value to SQL string
 * @param {*} value
 * @param {Object} params
 *
 * @return {String}
 * @protected
 */
Grammar.prototype.valueToString = function (value, params) {
  return this.builder.valueToString(value, params);
};

/**
 * Cast types
 * @param {*} value
 * @param {String} [path] Path name
 * @param {String} [op]
 *
 * @return {*} Value string for SQL query
 * @protected
 */
Grammar.prototype.cast = function (value, path, op) {
  if (value instanceof Statement) return value;

  var schema = this.getSchema();
  if (!schema) return value;

  // if no path specified we assume developer wants to cast full object
  if (!path) return schema.cast(value);

  var schematype = schema.path(path);
  if (!schematype) return value;

  return schematype.cast(value, path, op);
};

module.exports = Grammar;