var utils = require('../../utils');

// conditional operators
var operators = {
  $eq:        '=',
  $lk:        'LIKE',
  $lt:        '<',
  $lte:       '<=',
  $gt:        '>',
  $gte:       '>=',
  $ne:        '<>',

  $in:        {type: 'In', op: 'IN'},
  $nin:       {type: 'In', op: 'NOT IN'},
  $btw:       {type: 'Between'},

  $is:        {type: 'Null', op: 'IS'},
  $isnt:      {type: 'Null', op: 'IS NOT'},

  $io:        'INSTANCEOF',
  $m:         'MATCHES'

  //$c:         'CONTAINS'
  //$ca:        'CONTAINSALL',
  //$ck:        'CONTAINSKEY',
  //$cv:        'CONTAINSVALUE',
  //$ct:        'CONTAINSTEXT'
};

// logical operators
var logicOperators = {
  $and:       'AND',
  $or:        'OR'
};

//var operators = {
//  '=': '=',
//
//  'like': 'LIKE',
//  '%': 'LIKE',
//
//  '<': '<',
//  '<=': '<=',
//
//  '>': '>',
//  '>=': '>=',
//
//  '<>': '<>',
//  '!=': '<>',
//
//  'between': {type: 'Between'},
//  'bw': {type: 'Between'},
//  '<->': {type: 'Between'},
//
//  'is': {
//    type: 'Null',
//    operator: 'IS'
//  },
//  'isnt': {
//    type: 'Null',
//    operator: 'IS NOT'
//  },
//
//  'instanceof': 'INSTANCEOF',
//  'io': 'INSTANCEOF',
//  '@': 'INSTANCEOF',
//
//  'in': {type: 'In', operator: 'IN'},
//  'i': {type: 'In', operator: 'IN'},
//  '[]': {type: 'In', operator: 'IN'},
//
//  'notin': {type: 'In', operator: 'NOT IN'},
//  'nin': {type: 'In', operator: 'NOT IN'},
//  'ni': {type: 'In', operator: 'NOT IN'},
//  '![]': {type: 'In', operator: 'NOT IN'},
//
//  'c': 'CONTAINS',
//  'ca': 'CONTAINSALL',
//  'ck': 'CONTAINSKEY',
//  'cv': 'CONTAINSVALUE',
//  'ct': 'CONTAINSTEXT',
//  'm': 'MATCHES'
//};
//
//var logicOperators = {
//  'or': 'OR',
//  'and': 'AND'
//};
//
//exports.operators = operators;
//exports.logicOperators = logicOperators;

/**
 * @param {Function} closure
 * @param {String} logicOperator
 */
function whereNested (closure, logicOperator) {
  var method = this.getType()
    , query = this.newQuery()[method]();

  // call closure with SelectStatement
  closure(query);

  if (query.criteria.where) {
    this.criteria.where.push({
      boolean: logicOperator,
      type: 'Nested',
      query: query
    });
  }
  return this;
};

function subQuery (closure) {
  var query = this.newQuery();
  closure(query);
  return query.statement;
};

/**
 * Adds linear SQL part
 * @param {String} name
 *
 * @return {Function}
 */
exports.option = function (name) {
  var defaultV = arguments[1]
    , available = arguments[2];

  return function (val) {
    if (val === undefined) {
      val = defaultV;
    }
    if (utils.isArray(available) && available.length) {
      val = (available.indexOf(val) >= 0) ? val : defaultV;
    }
    this.criteria[name] = val;
    return this;
  };
};

/**
 * @param {Array} [available]
 * @param {Array} [allowExpression]
 * @return {Function}
 */
exports.returnClause = function (available, allowExpression) {
  var defaultV = utils.isArray(available) ? available[0] : undefined;

  return function (returning, expression) {
    returning = returning.toUpperCase();
    if (returning === undefined) {
      returning = defaultV;
    }
    if (utils.isArray(available) && available.length) {
      returning = (available.indexOf(returning) >= 0) ? returning : defaultV;
    }

    this.criteria.return = {
      option: returning
    };

    if (expression && utils.isArray(allowExpression) && allowExpression.length
      && (allowExpression.indexOf(returning) >= 0)) {
      this.criteria.return.expression = expression;
    }

    return this;
  };
};

/**
 * Adds comma separated SQL parts (for example SELECT name, value, ...)
 * @param {String} name
 * @param {*} [defaults] Default values
 * @param {Boolean} [overrideStrict] Whether to override value by default (keep undefined if not strict rule)
 *
 * @return {Function}
 */
exports.clause = function (name, defaults, overrideStrict) {
  return function (args) {
    var override = (overrideStrict !== undefined) ? overrideStrict : arguments[1];

    if (args === undefined) {
      args = defaults;
    }
    else if (utils.isFunction(args)) {
      args = subQuery.call(this, args);
    }

    if (!utils.isArray(args)) {
      args = [args];
    }

    this.criteria[name] = (override || !this.criteria[name]) ? args : this.criteria[name].concat(args);

    return this;
  };
};

/**
 * @param {String} name
 * @param {Boolean} [overrideStrict] Whether to override value by default (keep undefined if not strict rule)
 *
 * @return {Function}
 */
exports.objectClause = function (name, overrideStrict) {
  return function (vName) {
    var items = {}
      , self = this
      , override = arguments[2];

    if (utils.isString(vName)) {
      items[vName] = arguments[1];
    }
    else {
      items = vName;
      override = arguments[1];
    }

    override = (overrideStrict !== undefined) ? overrideStrict : override;

    Object.keys(items).forEach(function (key) {
      // if value is function we assume sub-query needed
      if (utils.isFunction(items[key])) {
        items[key] = subQuery.call(self, items[key]);
      }
    });

    this.criteria[name] = (override || !this.criteria[name]) ? items : utils.mergeObjects(this.criteria[name], items);
    return this;
  };
};

/**
 * @param {String} name
 * @param {Boolean} [overrideStrict] Whether to override value by default (keep undefined if not strict rule)
 *
 * @return {Function}
 */
exports.changeClause = function (name, overrideStrict) {
  return function (vName) {
    var items = {}
      , self = this
      , override = arguments[2];

    if (utils.isString(vName)) {
      items[vName] = arguments[1];
    }
    else {
      items = vName;
      override = arguments[1];
    }

    override = (overrideStrict !== undefined) ? overrideStrict : override;

    Object.keys(items).forEach(function (key) {
      // if value is function we assume sub-query needed
      if (utils.isFunction(items[key])) {
        items[key] = subQuery.call(self, items[key]);
      }
    });

    if (override || !this.criteria[name]) {
      this.criteria[name] = [items];
    }
    else {
      this.criteria[name].push(items);
    }

    return this;
  };
};

///**
// * @param {String} logicOperator (and|or), AND by defaut
// * @return {Function}
// */
//exports.whereClause = function (logicOperator) {
//  logicOperator = (logicOperator && logicOperators[logicOperator]) ? logicOperators[logicOperator] : 'AND';
//
//  return function (property, operator, value) {
//    if (!property) return this;
//    var type = 'Basic';
//
//    // If the property is an object, we will assume it is an list of key-value pairs
//    // and can add them each as a where clause. We will maintain the boolean we
//    // received when the method was called and pass it into the nested where.
//    if (utils.isObject(property)) {
//      return whereNested.call(this, function (statement) {
//        Object.keys(property).forEach(function(key) {
//          statement.where(key, '=', property[key]);
//        });
//      }, logicOperator);
//    }
//
//    // If the property is actually a callback, we will assume the developer
//    // wants to begin a nested where statement which is wrapped in parenthesis.
//    if (utils.isFunction(property)) {
//      return whereNested.call(this, property, logicOperator);
//    }
//
//    // Here we will make some assumptions about the operator. If only 2 values are
//    // passed to the method, we will assume that the operator is an equals sign
//    // and keep going. Otherwise, we'll require the operator to be passed in.
//    if (arguments.length == 2) {
//      value = operator;
//      operator = '=';
//    }
//    else if (invalidOperator(operator)) {
//      throw new Error("Invalid operator in where clause.")
//    }
//
//    // If the value is "null", we will just assume the developer wants to add a
//    // where null clause to the query. So, we will allow a short-cut here to
//    // that method for convenience so the developer doesn't have to check.
//    if (value === null) {
//      operator = (operator === '!=') ? 'isnt' : 'is';
//    }
//
//    operator = operators[operator];
//    if (utils.isObject(operator)) {
//      type = operator.type;
//      operator = operator.operator || null;
//    }
//
//    // if value is function, we will assume the developer wants
//    // to begin a subquery which is wrapped in parenthesis.
//    // Supported only IN | NOT IN
//    if (utils.isFunction(value)) {
//      if (type === 'In') {
//        value = subQuery.call(this, value);
//      }
//      else {
//        throw new Error ("Sub-query as value available for IN | NOT IN operators only!");
//      }
//    }
//
//    this.criteria.where.push({
//      boolean: logicOperator,
//      type: type,
//      path: property,
//      op: operator,
//      value: value
//    });
//
//    return this;
//  };
//};

exports.whereClause = function whereClause (logicOperator) {
  logicOperator = (logicOperator && logicOperators[logicOperator]) ? logicOperators[logicOperator] : 'AND';

  return function () {
    if (!arguments.length || !arguments[0]) return this;
    var type = 'Basic'
      , path = arguments[0]
      , operator = arguments[1]
      , value = arguments[2]
      , cond = false
      , logic = false
      , method
      , self = this
      , methodWhere = (logicOperator === 'AND') ? 'where' : logicOperator.toLowerCase() + 'Where';

    // If the path is actually a callback, we will assume the developer
    // wants to begin a nested where statement which is wrapped in parenthesis.
    if (utils.isFunction(path)) {
      return whereNested.call(this, path, logicOperator);
    }

    if (utils.isObject(path)) {
      for (var key in path) {
        if (!path.hasOwnProperty(key)) continue;
        if (logicOperators[key]) {
          method = logicOperators[key].toLowerCase();
          if (utils.isFunction(this[method])) {
            this[method](path[key]);
          }
        }
        else {
          this[methodWhere](key, path[key]);
        }
      }
      return this;
    }

    if (!utils.isString(path)) return this;

    // probably we have conditions here
    if (utils.isObject(operator)) {
      for (var i in operator) {
        if (operators[i]) {
          cond = true;
          break;
        }

        if (logicOperators[i]) {
          logic = i;
          method = logicOperators[i].toLowerCase();
          break;
        }
      }

      // we have conditions already
      if (cond) {
        Object.keys(operator).forEach(function(key) {
          self[methodWhere](path, key, operator[key]);
        });
        return this;
      }

      // we have logic condition with OR | AND
      if (logic !== false) {
        return this[method](path, operator[logic]);
      }
    }

    // Here we will make some assumptions about the operator. If only 2 values are
    // passed to the method, we will assume that the operator is an equals sign
    // and keep going. Otherwise, we'll require the operator to be passed in.
    if (arguments.length === 2) {
      value = operator;
      operator = '$eq';
    }
    else if (invalidOperator(operator)) {
      throw new Error("Invalid operator in where clause.")
    }

    // If the value is "null", we will just assume the developer wants to add a
    // where null clause to the query. So, we will allow a short-cut here to
    // that method for convenience so the developer doesn't have to check.
    if (value === null) {
      operator = (operator === '$ne') ? '$isnt' : '$is';
    }

    var op = operators[operator];
    if (utils.isObject(op)) {
      type = op.type;
      op = op.op || null;
    }

    // if value is function, we will assume the developer wants
    // to begin a subquery which is wrapped in parenthesis.
    // Supported only IN | NOT IN
    if (utils.isFunction(value)) {
      if (type === 'In') {
        value = subQuery.call(this, value);
      }
      else {
        throw new Error("Subquery as value available for `IN` or `NOT IN` operators only!");
      }
    }

    this.criteria.where.push({
      boolean: logicOperator,
      type: type,
      path: path,
      op: op,
      value: value,
      condOp: operator
    });
    return this;
  };
};

exports.logicWhereClause = function (logicOperator) {
  logicOperator = (logicOperator && logicOperators[logicOperator]) ? logicOperators[logicOperator] : 'AND';

  return function () {
    if (!arguments.length || !arguments[0]) return this;
    var path, condition;
    if (arguments.length === 1) {
      condition = arguments[0];
    }
    else {
      path = arguments[0];
      condition = arguments[1];
    }

    var methodWhere = (logicOperator === 'AND') ? 'where' : logicOperator.toLowerCase() + 'Where'
      , method = logicOperator.toLowerCase();

    if (utils.isObject(condition)) {
      // we are here in case of condition like this:
      // {
      //    age: [{$gte: 18}, {$lt: 22}]
      // }
      path = Object.keys(condition)[0];
      if (this[method]) {
        return this[method](path, condition[path]);
      }
    }

    if (!utils.isArray(condition)) return this;

    if (path) {
      // here we have argument with path
      // and conditions like this:
      // [
      //    {$gte: 18},
      //    {$lt: 22}
      // ]
      return whereNested.call(this, function (statement) {
        condition.forEach(function (cond) {
          statement[methodWhere](path, cond);
        });
      }, 'AND');
    }
    else {
      // here we have something like this:
      // [
      //    {age: {$gte: 18}},
      //    {age: {$lt: 22}}
      // ]
      // Where paths are inside conditions
      return whereNested.call(this, function (statement) {
        condition.forEach(function (cond) {
          statement[methodWhere](cond);
        });
      }, 'AND');
    }
  };
};

/**
 * Check invalid operator
 * @param {String} operator
 * @return {boolean}
 */
function invalidOperator (operator) {
  return !(operators[operator]);
};

/**
 * @param {String} logicOperator ($and|$or), AND by defaut
 * @return {Function}
 */
exports.whereRawClause = function (logicOperator) {
  logicOperator = (logicOperator && logicOperators[logicOperator]) ? logicOperators[logicOperator] : 'AND';

  return function (sql, params) {
    this.criteria.where.push({
      boolean: logicOperator,
      type: 'Raw',
      sql: sql
    });

    return this.params(params);
  };
};