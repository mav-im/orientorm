var utils = require('../utils')
  , Statement = require('./statements/Statement')
  , grammars = require('./grammars')
  , Query = require('../query');

/**
 * @param {String} connection
 * @constructor
 */
function QueryBuilder (connection) {
  this.connectionName = connection;
};

/**
 * @type {String}
 * @private
 */
QueryBuilder.prototype.connectionName;

/**
 * @type {String}
 * @public
 */
QueryBuilder.prototype.separator = " ";

/**
 * Query parameter prefix for auto params
 * @type {String}
 * @protected
 */
QueryBuilder.prototype.paramPrefix = "qp";

/**
 * Typecast based on value (without schema)
 * @param {*} value
 * @param {Object} params
 *
 * @return {String} Value string for SQL query
 * @protected
 */
QueryBuilder.prototype.valueToString = function (value, params) {
  var self = this;
  if (utils.isNumber(value) || utils.isBoolean(value)) {
    return value;
  }
  else if (utils.isString(value)) {
    return '"' + value + '"';
  }
  else if (value instanceof Statement) {
    var sub = this.builder.compile(value, params);
    return sub.query ? '(' + sub.query + ')' : null;
  }
  else if (value instanceof Date) {
    return '"' + utils.dateToString(value) + '"';
  }
  else if (utils.isObject(value)) {
    return '{' + Object.keys(value).map(function (key) {
      var subValue = self.valueToString(value[key], params);
      if (subValue === undefined) return null;
      return '"' + key + '"' + ': ' + subValue;
    }).filter(function (item) {
      return item;
    }).join(', ') + '}';
  }
  else if (utils.isArray(value)) {
    return '[' + value.map(function (item) {
      return self.valueToString(item, params);
    }).join(', ') + ']';
  }
  return value;
};

/**
 * @param {Statement} query
 * @param {Object} [params]
 *
 * @return {Sql}
 * @public
 */
QueryBuilder.prototype.compile = function (query, params) {
  return this.newGrammar(query.getType()).compileStatement(query, params);
};

/**
 * @param {String} type
 *
 * @return {Grammar}
 * @public
 */
QueryBuilder.prototype.newGrammar = function (type) {
  return new grammars[type](this);
};

/**
 * @param {String} className
 * @param {Object} [options]
 * @param {Object} [paths]
 * @param {Object} [indexes]
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.createClass = function (className, options, paths, indexes) {
  var sql = []
    , temp = "CREATE CLASS " + className;

  options = options || {};

  if (options.superClass) {
    temp += " EXTENDS " + options.superClass;
  }

  if (options.abstract) {
    temp += " ABSTRACT";
  }
  else if (options.cluster) {
    temp += " CLUSTER " + options.cluster;
  }
  sql.push(temp);

  var alters
    , skip = ['name', 'superClass', 'abstract', 'cluster'];

  Object.keys(options).forEach(function(key) {
    if (skip.indexOf(key) >= 0) return;
    alters = alters || {};
    alters[key] = options[key];
  });

  if (alters) {
    sql = sql.concat(this.alterClass(className, alters));
  }

  var self = this;
  // add paths
  if (utils.isObject(paths)) {
    Object.keys(paths).forEach(function (pName) {
      sql = sql.concat(self.createProperty(className, pName, paths[pName]));
    });
  }

  // add indexes
  if (utils.isObject(indexes)) {
    Object.keys(indexes).forEach(function (iName) {
      var ind = indexes[iName];
      if (!ind.type) return;
      sql = sql.concat(self.createIndex(iName, ind.type, className, ind.paths, ind.metadata));
    });
  }

  return sql;
};

/**
 * @param {String} className
 * @param {String|Object} attribute
 * @param {*} [value]
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.alterClass = function (className, attribute, value) {
  var options = {}
    , sql = [];
  if (utils.isString(attribute)) {
    options[attribute] = value;
  }
  else if (utils.isObject(attribute)) {
    options = attribute;
  }
  else return sql;

  Object.keys(options).forEach(function(key) {
    var attribute = key.toUpperCase();

    if (attribute === 'CUSTOM') {
      if (utils.isObject(options[key])) {
        Object.keys(options[key]).forEach(function(subKey) {
          sql.push("ALTER CLASS " + className + " " + attribute + " " + subKey + " = " + options[key][subKey])
        });
      }
    }
    else {
      sql.push("ALTER CLASS " + className + " " + attribute + " " + options[key]);
    }
  });

  return sql;
};

/**
 * @param {String} className
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.dropClass = function (className) {
  return ["DROP CLASS " + className];
};

/**
 * @param {String} className
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.truncateClass = function (className) {
  return ["TRUNCATE CLASS " + className];
};

/**
 * @param {String} className
 * @param {String} pName
 * @param {String|Object} options
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.createProperty = function (className, pName, options) {
  var sql = []
    , temp = "CREATE PROPERTY " + className + "." + pName + " ";

  if (utils.isString(options)) {
    temp += options.toUpperCase(); // Type
    sql.push(temp);
  }
  else if (utils.isObject(options)) {
    // add create
    temp += options.type.toUpperCase();
    if (options.linkedClass) {
      temp += " " + options.linkedClass;
    }
    else if (options.linkedType) {
      temp += " " + options.linkedType.toUpperCase();
    }
    sql.push(temp);

    var alters
      , skip = ['name', 'type', 'linkedClass', 'linkedType'];
    Object.keys(options).forEach(function(key) {
      if (skip.indexOf(key) >= 0) return;
      alters = alters || {};
      alters[key] = options[key];
    });

    if (alters) {
      sql = sql.concat(this.alterProperty(className, pName, alters));
    }
  }

  return sql;
};

/**
 *
 * @param {String} className
 * @param {String} pName
 * @param {String|Object} attribute
 * @param {*} [value]
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.alterProperty = function (className, pName, attribute, value) {
  var options = {}
    , sql = [];
  if (utils.isString(attribute)) {
    options[attribute] = value;
  }
  else if (utils.isObject(attribute)) {
    options = attribute;
  }
  else return sql;

  Object.keys(options).forEach(function(key) {
    var attribute = key.toUpperCase();

    if (attribute === 'CUSTOM') {
      if (utils.isObject(options[key])) {
        Object.keys(options[key]).forEach(function(subKey) {
          sql.push("ALTER PROPERTY " + className + "." + pName + " " + attribute + " " + subKey + " = " + options[key][subKey])
        });
      }
    }
    else {
      var val = (attribute === 'TYPE' || attribute === 'LINKEDTYPE') ? options[key].toUpperCase() : options[key];
      sql.push("ALTER PROPERTY " + className + "." + pName + " " + attribute + " " + val);
    }
  });

  return sql;
};

/**
 * @param {String} className
 * @param {String} pName
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.dropProperty = function (className, pName) {
  return ["DROP PROPERTY " + className + "." + pName];
};

/**
 * @param {String} iName
 * @param {String} type
 * @param {String} [className]
 * @param {Array|String} [paths]
 * @param {Object} [metadata]
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.createIndex = function (iName, type, className, paths, metadata) {
  iName = (className && paths && paths.length) ? (className + "." + iName + " ON " + className + " ") : (iName + " ");
  if (paths && (utils.isString(paths) || utils.isArray(paths)) && paths.length) {
    iName += "(" + paths + ") ";
  }

  var sql = "CREATE INDEX " + iName + type.toUpperCase()
    , temp = [];

  if (metadata && utils.isObject(metadata)) {
    Object.keys(metadata).forEach(function (key) {
      temp.push(key + " : " + metadata[key])
    });
  }

  if (temp.length) {
    sql += " METADATA {" + temp.join(', ') + "}";
  }

  return [sql];
};

/**
 * @param {String} iName
 * @param {String} [className]
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.dropIndex = function (iName, className) {
  iName = className ? className + "." + iName : iName;
  return ["DROP INDEX " + iName];
};

/**
 * @param {String} iName
 * @param {String} [className]
 *
 * @return {Array}
 * @public
 */
QueryBuilder.prototype.rebuildIndex = function (iName, className) {
  var sql = "REBUILD INDEX ";
  iName = iName ? (className ? className + "." + iName : iName) : null;
  if (iName) {
    sql += iName;
  };
  return [sql];
};

/**
 * Builds Insert query
 * @param {String|Schema} cName
 * @param {Object} obj
 * @param {Object} [options]
 *
 * @return {Statement}
 * @public
 */
QueryBuilder.prototype.insert = function (cName, obj, options) {
  return this.newQuery().insert()
    .into(utils.isString(cName) ? cName : cName.getName())
    .set(obj).setOptions(options);
};

/**
 * Builds Update query
 * @param {String|Schema} cName
 * @param {Object} conditions
 * @param {Object} update
 * @param {Object} [options]
 *
 * @return {Statement}
 * @public
 */
QueryBuilder.prototype.update = function (cName, conditions, update, options) {
  var conds = conditions ? utils.clone(conditions) : {}
    , target = utils.isString(cName) ? cName : cName.getName();

  if (conds['@rid']) {
    target = conds['@rid'];
    delete conds['@rid'];
  }

  var query = this.newQuery().update(target).where(conds)
    , key, op, delta;

  delta = utils.deltaUpdate(update);

  for (key in delta) {
    if (!delta.hasOwnProperty(key)) continue;
    op = key.substr(1);
    if (!utils.isFunction(query[op])) continue;
    query[op](delta[key]);
  }
  return query.setOptions(options).setSchema(cName);
};

/**
 * Builds Delete query
 * @param {String|Schema} cName
 * @param {Object} conditions
 * @param {Object} [options]
 *
 * @return {Statement}
 * @public
 */
QueryBuilder.prototype.delete = function (cName, conditions, options) {
  return this.newQuery().delete()
    .from(utils.isString(cName) ? cName : cName.getName())
    .where(conditions).setOptions(options).setSchema(cName);
};

/**
 * Builds Select query
 * @param {String|Schema} cName
 * @param {Object} [conditions]
 * @param {String|String[]} [fields]
 * @param {Object} [options]
 *
 * @return {Statement}
 * @public
 */
QueryBuilder.prototype.select = function (cName, conditions, fields, options) {
  var target = utils.isString(cName) ? cName : cName.getName()
    , conds = conditions ? utils.clone(conditions) : {};

  if (conds['@rid']) {
    target = conds['@rid'];
    delete conds['@rid'];
  }

  return this.newQuery().select(fields).from(target).where(conds).setOptions(options).setSchema(cName);
};

/**
 * Create new query
 *
 * @return {Query}
 * @public
 */
QueryBuilder.prototype.newQuery = function () {
  return (new Query()).db(this.connectionName);
};

module.exports = QueryBuilder;