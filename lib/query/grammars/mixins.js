var utils = require('../../utils')
  , Sql = require('../../Sql')
  , RecordId = require('../../RecordId')
  , Statement = require('../statements/Statement');

/**
 * @param {*[]} sources
 * @param {Object} params
 *
 * @return {String[]}
 */
function prepareSources (sources, params) {
  var self = this;
  return sources.map(function(item) {
    if (item instanceof Statement) {
      var sub = self.builder.compile(item, params);
      return sub.query ? '(' + sub.query + ')' : null;
    }
    else if (utils.isString(item)) {
      return applyParams.call(this, item, params);
    }
  }).filter(function(item) {
    return !!item;
  });
};

/**
 * @param {String} expression
 * @param {Object} params
 *
 * @return {String} expression with replaced params
 */
function applyParams (expression, params) {
  params = params || {};
  var matches = expression.match(/:[A-Za-z]+\w*/g);
  if (matches) {
    matches.forEach(function(match) {
      var key = match.substr(1);
      if (params[key]) {
        expression = expression.replace(match, utils.isString(params[key]) ? "'" + params[key] + "'" : params[key]);
      }
    });
  }

  return expression;
};

/**
 * @param {String} name
 *
 * @return {Function} Compile function for option
 */
exports.option = function (name) {
  name = name.toUpperCase();
  return function (val) {
    return name + ' ' + val;
  };
};

exports.return = function () {
  return function (clause, params) {
    return 'RETURN ' + clause.option + (clause.expression ? ' ' + clause.expression : '');
  };
};

/**
 * @param {String} name
 *
 * @return {Function}
 */
exports.word = function (name) {
  name = name.toUpperCase();
  return function (val) {
    return val ? name : '';
  };
};

/**
 * @param name
 * @param {Boolean} [rid] Allow rids (default true)
 * @return {Function}
 */
exports.target = function (name, rid) {
  name = name.toUpperCase();
  rid = (rid === undefined) ? true : !!rid;
  return function (targets) {
    if (!targets || !targets.length) return '';
    if (rid && targets.length > 1 && RecordId.isValid(targets)) {
      return name + ' [' + targets.join(', ') + ']';
    }
    return name + ' ' + targets[0];
  };
};

exports.select = function () {
  return function (projections, params) {
    return 'SELECT ' + projections.map(function(p) {
      // check for alias
      var alias;
      if (utils.isObject(p) && !(p instanceof Sql)) {
        alias = Object.keys(p).filter(function (field) {
          return !!field;
        })[0];
        p = p[alias];
      }

      if (p instanceof Sql) {
        // add params from sql to current query params
        utils.mergeObjects(params, p.options.params);
        return applyParams.call(this, (alias ? p.query + ' AS ' + alias : p.query), params);
      }
      else if (utils.isString(p)) {
        return applyParams.call(this, (alias ? p + ' AS ' + alias : p), params);
      }
    }).filter(function(p) {
      // filter empty projections
      return !!p;
    }).join(', ');
  };
};

exports.traverse = function () {
  return function (fields, params) {
//    var self = this;
    return 'TRAVERSE ' + fields.filter(function(p) {
      // filter empty projections
      return !!p;
    }).join(', ');
  };
};

/**
 * @param {Boolean} [rid] Supported Record Id as source? (default = true)
 * @return {Function}
 */
exports.from = function (rid) {
  rid = (rid === undefined) ? true : rid;

  return function (sources, params) {
    if (!sources || !sources.length) return '';

    var from = 'FROM '
      , preparedSources = prepareSources.call(this, sources, params);

    if (rid && RecordId.isValid(preparedSources)) {
      if (preparedSources.length > 1) {
        from += '[' + preparedSources.join(', ') + ']';
      }
      else {
        from += preparedSources[0];
      }
    }
    else {
      // multiple from not supported,
      // see https://github.com/orientechnologies/orientdb/wiki/SQL#select-from-multiple-target
      // from += preparedSources.join(', ');
      from += preparedSources[0];
    }
    return from;
  };
};

exports.let = function () {
  return function (lets, params) {
    if (!utils.count(lets)) return '';

    var self = this
      , value;

    return Object.keys(lets).map(function (vName) {
      if (lets[vName] instanceof Statement) {
        value = self.builder.compile(lets[vName], params);
        return value.query ? 'LET $' + vName + ' = (' + value.query + ')' : null;
      }
      else {
        return 'LET $' + vName + ' = ' + lets[vName];
      }
    }).filter(function (item) {
      return !!item;
    }).join(', ');
  };
};

exports.content = function (name) {
  return function (items, params) {
    if (!items.length) return '';

    var value = {};

    items.forEach(function (item) {
      if (!utils.count(item)) return;
      utils.mergeObjects(value, item);
    });

    return name.toUpperCase() + ' ' + this.valueToString(this.cast(value), params);
  };
};

exports.change = function (name) {
  return function (items, params) {
    if (!items.length) return '';

    var self = this
      , value;

    return name.toUpperCase() + ' ' + items.map(function (subitems) {
      return Object.keys(subitems).map(function (path) {
        value = self.cast(subitems[path], path);
        if (utils.isOrientObject(value)) {
          value = value.toObject({depopulate: 1});
        }
        value = self.valueToString(value, params);
        return (value !== undefined) ? path + ' = ' + value : null;
      }).filter(function (item) {
        return item;
      }).join(', ');
    }).join(', ');
  };
};

exports.remove = function () {
  return function (items, params) {
    if (!items.length) return '';

    var self = this
      , value;

    return 'REMOVE ' + items.map(function (subitems) {
      return Object.keys(subitems).map(function (path) {
        if (utils.isArray(subitems[path]) && subitems[path][0] && utils.isObject(subitems[path][0])) {
          return subitems[path].map(function (subval) {
            // TODO: where to make cast??
            value = self.valueToString(subval, params);
            return (value !== undefined) ? path + ' = ' + value : null;
          }).filter(function (item) {
            return item;
          }).join(', ');
        }
        else {
          value = self.valueToString(self.cast(subitems[path], path, 'remove'), params);
          return (value !== undefined) ? path + ' = ' + value : null;
        }
      }).filter(function (item) {
        return item;
      }).join(', ');
    }).join(', ');
  };
};

exports.put = function () {
  return function (items, params) {
    if (!items.length) return '';
    var self = this
      , value;

    //return 'PUT ' + items.map(function(subitems) {
    //  return Object.keys(subitems).map(function (path) {
    //    value = self.cast(subitems[path], path);
    //    if (utils.isOrientObject(value)) {
    //      value = value.toObject({depopulate: 1});
    //    }
    //    return value ? Object.keys(value).map(function(key) {
    //      return path + ' = "' + key + '", ' + self.valueToString(value[key])
    //    }).join(', ') : null;
    //  }).filter(function (item) {
    //    return item;
    //  }).join(', ');
    //}).join(', ');

    // because of the bug in SQL parser we should use SET as follows:
    //    SET fieldName.key = value
    // see https://github.com/orientechnologies/orientdb/issues/2642
    // see https://github.com/orientechnologies/orientdb/issues/2665
    return 'SET ' + items.map(function(subitems) {
        return Object.keys(subitems).map(function (path) {
          value = self.cast(subitems[path], path);
          if (utils.isOrientObject(value)) {
            value = value.toObject({depopulate: 1});
          }
          return value ? Object.keys(value).map(function(key) {
            return path + '.' + key + ' = ' + self.valueToString(value[key])
          }).join(', ') : null;
        }).filter(function (item) {
          return item;
        }).join(', ');
      }).join(', ');
  };
};

exports.update = function () {
  return function (sources, params) {
    if (!sources || !sources.length) return '';

    var result = 'UPDATE ';

    if (RecordId.isValid(sources)) {
      if (sources.length > 1) {
        result += '[' + sources.join(', ') + ']';
      }
      else {
        result += sources[0];
      }
    }
    else {
      result += sources[0];
    }
    return result;
  };
};

exports.where = function (type) {
  type = type || 'where';
  return function (where, params) {
    if (!where.length) return '';

    var self = this
      , method, part
      , i = -1;

    var sql = where.map(function (clause) {
      method = 'where' + clause.type;
      if (exports[method] && utils.isFunction(exports[method])) {
        part = exports[method].call(self, clause, params);
        i++;
        return part ? (i ? clause.boolean + ' ' + part : part) : null;
      }
    }).filter(function (item) {
      return !!item;
    });

    return (sql.length > 0) ? type.toUpperCase() + ' ' + sql.join(' ') : '';
  };
};

/**
 * Compile basic where condition with operator
 * @param clause
 * @param params
 * @return {String}
 */
exports.whereBasic = function (clause, params) {
  var value = this.paramify(castForQuery(this, clause), params);

  if (utils.isArray(value) && value.length > 1) {
    value = '[' + value.join(', ') + ']';
  }
  return value ? (clause.path + " " + clause.op + " " + value) : '';
};

function castForQuery (self, clause) {
  var schema = self.getSchema();
  if (!schema) return clause.value;

  var schematype = schema.path(clause.path);
  return schematype ? schematype.castForQuery(clause.condOp, clause.value, clause.path) : clause.value;
};

/**
 * Compile null where condition with operator (IS | IS NOT)
 * @param clause
 * @return {String}
 */
exports.whereNull = function (clause) {
  return clause.path + " " + clause.op + " NULL";
};

/**
 * Compile IN where condition with operator (IN | NOT IN)
 * @param clause
 * @param params
 * @return {String}
 */
exports.whereIn = function (clause, params) {
  var value = this.paramify(castForQuery(this, clause), params);
  if (!value) return '';

  // probably we have an sql statement string with parenthesis
  return clause.path + " " + clause.op + " " + (utils.isArray(value) ? "[" + value.join(", ") + "]" : value);
};

/**
 * Compile basic where condition with operator
 * @param clause
 * @param params
 * @return {String}
 */
exports.whereBetween = function (clause, params) {
  var value = this.paramify(castForQuery(this, clause), params);
  if (!value || value.length !== 2) return '';
  return clause.path + " BETWEEN " + value[0] + " AND " + value[1];
};

/**
 * Add nested where with parenthesis
 * @param clause
 * @param params
 * @return {String}
 */
exports.whereNested = function (clause, params) {
  var criteria = clause.query.criteria
    , subWhere;

  // add params from sub-where
  utils.mergeObjects(params, criteria.params);

  subWhere = this.compileWhere(criteria.where, params);
  return subWhere ? '(' + subWhere.substr(6) + ')' : '';
};

/**
 *
 * @param clause
 * @return {String}
 */
exports.whereRaw = function (clause) {
  return clause.sql;
};