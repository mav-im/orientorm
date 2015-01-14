var Doc = require('./Document')
  , Promise = require('bluebird')
  , EventEmitter = require('events').EventEmitter
  , utils = require('../utils');

/**
 * @param {Object} doc
 * @param {Object} [fields]
 * @constructor
 * @extends {Doc}
 */
function Model (doc, fields) {
  Doc.call(this, doc, fields);
};

/**
 * @private
 */
Model.prototype.__proto__ = Doc.prototype;

/**
 * Connection the model uses.
 * @type {Connection}
 * @public
 */
Model.prototype.db;

/**
 * The name of the model
 * @type {String}
 * @public
 */
Model.prototype.modelName;

/**
 * Returns another Model instance.
 *
 * ####Example:
 *
 *     var doc = new Tank;
 *     doc.model('User').findById(id, callback);
 *
 * @param {String} name model name
 *
 * @return {Model}
 * @public
 */
Model.prototype.model = function model (name) {
  return this.db.model(name);
};

/*!
 * Give the constructor the ability to emit events.
 */
for (var i in EventEmitter.prototype) {
  Model[i] = EventEmitter.prototype[i];
}

/**
 *
 * @param {Connection} connection
 * @param {String} name
 * @param {Schema} schema
 *
 * @return {Model}
 * @public
 * @static
 */
Model.compile = function (connection, name, schema) {
  var model = this
    , i;

  var Model = function Model (doc, fields) {
    if (!(this instanceof Model)) {
      return new Model(doc, fields);
    }
    model.call(this, doc, fields);
  };

  Model.modelName = name;
  Model.__proto__ = model;
  Model.prototype.__proto__ = model.prototype;
  Model.model = model.prototype.model;
  Model.db = Model.prototype.db = connection;

  Model.prototype.$__setSchema(schema);

  // apply methods
  for (i in schema.methods)
    Model.prototype[i] = schema.methods[i];

  // apply statics
  for (i in schema.statics)
    Model[i] = schema.statics[i];

  Model.schema = Model.prototype.schema;

  return Model;
};

/**
 * Saves this document.
 *
 * ####Example:
 *
 *     product.sold = Date.now();
 *     product.save()
 *        .then(function (product) {})  // will be called on success save
 *        .catch(function (err) {})     // will be called on error
 *
 * The callback will receive three parameters, `err` if an error occurred, `product` which is the saved `product`, and `numberAffected` which will be 1 when the document was found and updated in the database, otherwise 0.
 *
 * The `fn` callback is optional. If no `fn` is passed and validation fails, the validation error will be emitted on the connection used to create this model.
 *
 *     var db = orientorm.createConnection(..);
 *     var schema = db.schema({$name: 'Product', ..fields..});
 *     var Product = db.model('Product');
 *
 *     db.on('error', handleError);
 *
 * However, if you desire more local error handling you can add an `error` listener to the model and handle errors there instead.
 *
 *     Product.on('error', handleError);
 *
 * @return {Promise}
 * @promise {Model}
 */
Model.prototype.save = function () {
  return Promise.resolve(true);
  var self = this
    , options = {};

  if (this.isNew) {
    // send entire doc
    var obj = this.toObject({depopulate: 1});
    // return new record Id
    options.return = '@rid';
    // return promise with stored record
    return this.db.createCommand()
      .insert(this.schema.getName(), obj, options)
      .one()
      .then(function(result) {
        // we need to add rid to document
        self['@rid'] = result['@rid'];

        self.$__reset();
        self.isNew = false;
        self.emit('isNew', false);
        self.emit('save', self, 1);
        return self;
      });
  }
  else {
    var delta = this.$__delta();

    if (delta && delta.length) {
      var where = this.$__where(delta[0]);
      options.return = ['after', '@this'];
      return this.db.createCommand()
        .update(this.schema.getName(), where, delta[1], options)
        .execute()
        .then(function () {
          self.$__reset();
          self.isNew = false;
          self.emit('isNew', false);
          self.emit('save', self, 1);
          return self;
        });
    }
    else {
      this.$__reset();
      this.emit('isNew', false);
      self.emit('save', self, 0);
      return Promise.resolve(this);
    }
  }
};

/**
 * Apply the operation to the delta (update) clause as
 * well as track versioning for our where clause.
 *
 * @param {Doc} self
 * @param {Object} where
 * @param {Object} delta
 * @param {Object} data
 * @param {*} val
 * @param {String} [op]
 */
function operand (self, where, delta, data, val, op) {
  // delta
  op || (op = '$set');
  if (!delta[op]) delta[op] = {};
  delta[op][data.path] = val;
};

/**
 * Compiles an update and where clause for a `val` with _atomics.
 *
 * @param {Doc} self
 * @param {Object} where
 * @param {Object} delta
 * @param {Object} data
 * @param {OrientArray|OrientMap} value
 */
function handleAtomics (self, where, delta, data, value) {
  if (delta.$set && delta.$set[data.path]) {
    // $set has precedence over other atomics
    return;
  }

  if (utils.isFunction(value.$__getAtomics)) {
    value.$__getAtomics().forEach(function (atomic) {
      var op = atomic[0]
        , val = atomic[1];
      operand(self, where, delta, data, val, op);
    })
  }
};

/**
 * Produces a special query document of the modified properties used in updates.
 *
 * @return {Array}
 * @private
 */
Model.prototype.$__delta = function () {
  var dirty = this.$__dirty();
  if (!dirty.length) return [];

  var where = {}
    , delta = {}
    , len = dirty.length
    , d = 0;

  for (; d < len; ++d) {
    var data = dirty[d]
      , value = data.value;

    if (undefined === value) {
      operand(this, where, delta, data, null);
    }
    else if (null === value) {
      operand(this, where, delta, data, null);
    }
    else if (value._path && value._atomics) {
      // arrays and other custom types (support plugins etc)
      handleAtomics(this, where, delta, data, value);
    }
    else {
      value = utils.clone(value, {depopulate: 1});
      operand(this, where, delta, data, value);
    }
  }

  return [where, delta];
};

/**
 * Returns a query object which applies shardkeys if they exist.
 * @param {Object} [where]
 *
 * @return {Object}
 * @private
 */
Model.prototype.$__where = function (where) {
  where || (where = {});
  where['@rid'] = this._doc['@rid'];
  return where;
};

/**
 * Removes this document from the db.
 *
 * @return {Promise}
 * @promise {Model} The removed document
 * @public
 */
Model.prototype.remove = function () {
  var self = this;
  return this.db.createCommand()
    .delete(this.schema.getName(), this.$__where(), {return: 'before'})
    .execute()
    .then(function () {
      self.emit('remove', self);
      return self;
    });
};

/**
 * Finds documents
 *
 * The `conditions` are cast to their respective SchemaTypes before the command is sent.
 *
 * ####Examples:
 *
 *     // named john and at least 18
 *     MyModel.find({ name: 'john' }).where('age', '>=', 18);
 *
 *     // executes immediately, passing results to callback
 *     MyModel.find({ name: 'john' }).where('age', '>=', 18).exec().then(function (docs) {
 *       // your code here
 *     });
 *
 *     // selecting the "name" and "friends" fields, executing immediately
 *     MyModel.find({ name: 'john' }, ['name', 'friends'], true).then(function (docs) {});
 *
 *     // passing options
 *     MyModel.find({ name: 'john' }, null, { skip: 10 }).exec().then(callback);
 *
 *     // passing options and executing immediately
 *     MyModel.find({ name: 'john' }, null, { skip: 10 }, true).then(function (docs) {});
 *
 * @param {Object|*} [conditions]
 * @param {String|String[]|*} [fields] optional fields to select
 * @param {Object|*} [options]
 * @param {Boolean} [exec]

 * @return {Promise|StatementSelect}
 * @promise {Model|Model[]}
 * @public
 * @static
 */
Model.find = function (conditions, fields, options, exec) {
  if (utils.isBoolean(options)) {
    exec = options;
    options = null;
  }
  else if (utils.isBoolean(fields)) {
    exec = fields;
    fields = null;
    options = null;
  }
  else if (utils.isBoolean(conditions)) {
    exec = conditions;
    conditions = null;
    fields = null;
    options = null;
  }

  var fieldsForQ;
  if (fields) {
    fieldsForQ = utils.isArray(fields) ? fields : [fields];
    fieldsForQ.push('@rid as @rid');
    fieldsForQ = fieldsForQ.map(function (field) {
      if (!utils.isString(field)) return field;
      if (field[0] === '-') return field;
      // select top field (later will be filled with selected)
      return field.split('.')[0];
    });
  }
  var model = this
    , qFields = fieldsToGet(fields);

  options = options || {};
  options.transforms = options.transforms || [];
  options.transforms.unshift(function toDocument (obj) {
    if (obj['@rid'] && obj['rid']) {
      obj['@rid'] = obj['rid'];
      delete obj['rid'];
    }
    var doc = new model(undefined, qFields, true);
    return doc.init(obj);
  });

  var query = this.db.queryBuilder().select(this.modelName, conditions, fieldsForQ, options);
  return exec ? query.exec() : query;
};

function fieldsToGet (fields) {
  var res;
  fields = utils.isArray(fields) ? fields : [fields];
  if (fields && fields.length) {
    fields.forEach(function (key) {
      if (!utils.isString(key) || key == '*') return;
      res = res || {};
      res[key] = 1;
    });
  }
  return res;
};

/**
 * Finds one document.
 *
 * The `conditions` are cast to their respective SchemaTypes before the command is sent.
 *
 * ####Example:
 *
 *     // find one iphone adventures - iphone adventures??
 *     Adventure.findOne({ type: 'iphone' }, true).then(function (adventure) {});
 *
 *     // same as above
 *     Adventure.findOne({ type: 'iphone' }).exec().then(function (adventure) {});
 *
 *     // select only the adventures name
 *     Adventure.findOne({ type: 'iphone' }, 'name', true).then(function (adventure) {});;
 *
 *     // same as above
 *     Adventure.findOne({ type: 'iphone' }, 'name').exec().then(function (adventure) {});
 *
 *     // specify options, in this case lean
 *     Adventure.findOne({ type: 'iphone' }, 'name', { skip: 10 }, true);
 *
 *     // same as above
 *     Adventure.findOne({ type: 'iphone' }, 'name', { skip: 10 }).exec().then(callback);
 *
 *     // chaining findOne queries (same as above)
 *     Adventure.findOne({ type: 'iphone' }).select('name').exec().then(callback);
 *
 * @param {Object|*} [conditions]
 * @param {String|String[]|*} [fields] optional fields to select
 * @param {Object|*} [options] Query options
 * @param {Boolean} [exec] Wether to execute query (true) or return Statement (false - default)
 *
 * @return {Promise|Statement}
 * @promise {Model}
 * @public
 * @static
 */
Model.findOne = function (conditions, fields, options, exec) {
  if (utils.isBoolean(options)) {
    exec = options;
    options = null;
  }
  else if (utils.isBoolean(fields)) {
    exec = fields;
    fields = null;
    options = null;
  }
  else if (utils.isBoolean(conditions)) {
    exec = conditions;
    conditions = null;
    fields = null;
    options = null;
  }

  options = options || {};
  options.command = 'one';

  return this.find(conditions, fields, options, exec);
};

/**
 * Finds a single document by rid.
 *
 * The `rid` is cast based on the Schema before sending the command.
 *
 * ####Example:
 *
 *     // find adventure by rid and execute immediately
 *     Adventure.findByRid(rid, true).then(function (adventure) {});
 *
 *     // same as above
 *     Adventure.findByRid(rid).exec().then(callback);
 *
 *     // select only the adventures name and length
 *     Adventure.findByRid(rid, ['name', 'length'], true).then(function (adventure) {});
 *
 *     // same as above
 *     Adventure.findByRid(rid, ['name', 'length']).exec().then(callback);
 *
 *     // include all properties except for `length`
 *     Adventure.findByRid(rid, '-length').exec().then(function (adventure) {});
 *
 *     // passing options
 *     Adventure.findByRid(rid, 'name', options, true).then(function (doc) {});
 *
 * @param {String|RecordId} rid
 * @param {String|String[]|*} [fields] optional fields to select
 * @param {Object|*} [options] Query options
 * @param {Boolean} [exec] Wether to execute query (true) or return Statement (false - default)
 *
 * @return {Promise|Statement}
 * @promise {Model}
 * @public
 * @static
 */
Model.findByRid = function (rid, fields, options, exec) {
  return this.findOne({'@rid': rid}, fields, options, exec);
};

/**
 * Finds a matching document, removes it, passing the found document (if any) to the callback.
 *
 * Executes immediately if `callback` is passed else a StatementSelect object is returned.
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 *
 * ####Examples:
 *
 *     A.findOneAndRemove(conditions, options, true).then(callback); // executes
 *     A.findOneAndRemove(conditions, options);  // return StatementSelect
 *     A.findOneAndRemove(conditions, true).then(callback); // executes
 *     A.findOneAndRemove(conditions) // returns StatementSelect
 *     A.findOneAndRemove()           // returns StatementSelect
 *
 * @param {Object|*} [conditions]
 * @param {Object|*} [options] Query options
 * @param {Boolean} [exec] Wether to execute query (true) or return Statement (false - default)
 *
 * @return {Promise|Statement}
 * @promise {Model}
 * @public
 * @static
 */
Model.findOneAndRemove = function (conditions, options,  exec) {
  if (utils.isBoolean(options)) {
    exec = options;
    options = null;
  }
  else if (utils.isBoolean(conditions)) {
    exec = conditions;
    conditions = null;
    options = null;
  }

  options = options || {};
  // store document removement in transform
  options.transform = function (doc) {
    return doc.remove();
  };

  return this.findOne(conditions, null, options, exec);
};

/**
 * Finds a matching document, removes it, passing the found document (if any) to the callback.
 *
 * Executes immediately if `callback` is passed, else a `StatementSelect` object is returned.
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 *
 * ####Examples:
 *
 *     A.findByRidAndRemove(rid, options, true).then(callback); // executes
 *     A.findByRidAndRemove(rid, options);  // return Query
 *     A.findByRidAndRemove(rid, true).then(callback); // executes
 *     A.findByRidAndRemove(rid); // returns Query
 *
 * @param {String|RecordId} rid
 * @param {Object|*} [options] Query options
 * @param {Boolean} [exec] Wether to execute query (true) or return Statement (false - default)
 *
 * @return {Promise|StatementSelect}
 * @promise {Model}
 * @public
 * @static
 */
Model.findByRidAndRemove = function (rid, options, exec) {
  return this.findOneAndRemove({'@rid': rid}, options, exec);
};

/**
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback.
 * The query executes immediately if `exec` is true else a StatementSelect object is returned.
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 *
 * ####Examples:
 *
 *     A.findOneAndUpdate(conditions, update, options, true).then(callback); // executes
 *     A.findOneAndUpdate(conditions, update, options)  // returns StatementSelect
 *     A.findOneAndUpdate(conditions, update, true).then(callback) // executes and returns Promise
 *     A.findOneAndUpdate(conditions, update)           // returns StatementSelect
 *     A.findOneAndUpdate()                             // returns StatementSelect
 *
 * ####Note:
 *
 * All top level update keys which are not `atomic` operation names are treated as set operations:
 *
 * ####Example:
 *
 *     var query = { name: 'borne' };
 *     Model.findOneAndUpdate(query, { name: 'jason borne' }, options, true).then(callback);
 *
 *     // is sent as
 *     Model.findOneAndUpdate(query, { $set: { name: 'jason borne' }}, options, true).then(callback);
 *
 * This helps prevent accidentally overwriting your document with `{ name: 'jason borne' }`.
 *
 * @param {Object|*} [conditions]
 * @param {Object|*} [update] Update object
 * @param {Object|*} [options] Query options
 * @param {Boolean} [exec] Wether to execute query (true) or return Statement (false - default)
 *
 * @return {Promise|StatementSelect}
 * @promise {Model} new model or old
 * @public
 * @static
 */
Model.findOneAndUpdate = function (conditions, update, options, exec) {
  if (utils.isBoolean(options)) {
    exec = options;
    options = null;
  }
  else if (arguments.length === 1) {
    if (utils.isBoolean(conditions)) {
      var msg = 'Model.findOneAndUpdate(): First argument must not be a boolean.\n\n'
        + '  ' + this.modelName + '.findOneAndUpdate(conditions, update, options, exec)\n'
        + '  ' + this.modelName + '.findOneAndUpdate(conditions, update, exec)\n'
        + '  ' + this.modelName + '.findOneAndUpdate(conditions, update)\n'
        + '  ' + this.modelName + '.findOneAndUpdate(update)\n'
        + '  ' + this.modelName + '.findOneAndUpdate()\n';
      throw new TypeError(msg)
    }
    update = conditions;
    conditions = null;
    options = null;
    exec = false;
  }

  var fields;
  options = options || {};
  if (options.fields) {
    fields = options.fields;
    delete options.fields;
  }

  // store document removement in transform
  options.transform = deltaApply(utils.deltaUpdate(update));

  return this.findOne(conditions, fields, options, exec);
};

/**
 * Applies delta to document
 * @param delta
 * @return {Function}
 */
function deltaApply (delta) {
  return function applyUpdates (doc) {
    var op, key, method;
    for (op in delta) {
      if (!delta.hasOwnProperty(op)) continue;

      method = op.substr(1);
      for (key in delta[op]) {
        if (!delta[op].hasOwnProperty(key)) continue;

        if (op === '$set') {
          doc[key] = delta[op][key]
        }
        else if (doc[key][method] && utils.isFunction(doc[key][method])) {
          doc[key][method](delta[op][key]);
        }
      }
    }
    return doc.save();
  }
};

/**
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback.
 * The query executes immediately if `exec` is true else a StatementSelect object is returned.
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 *
 * ####Examples:
 *
 *     A.findByIdAndUpdate(id, update, options, callback) // executes
 *     A.findByIdAndUpdate(id, update, options)  // returns Query
 *     A.findByIdAndUpdate(id, update, callback) // executes
 *     A.findByIdAndUpdate(id, update)           // returns Query
 *     A.findByIdAndUpdate()                     // returns Query
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes      immediately if `callback` is passed else a Query object is returned.
 *
 * ####Note:
 *
 * All top level update keys which are not `atomic` operation names are treated as set operations:
 *
 * ####Example:
 *
 *     Model.findByRidAndUpdate(rid, { name: 'jason borne' }, options, true).then(callback);
 *
 *     // is sent as
 *     Model.findByRidAndUpdate(rid, { $set: { name: 'jason borne' }}, options, true).then(callback);
 *
 * This helps prevent accidentally overwriting your document with `{ name: 'jason borne' }`.
 *
 * @param {String|RecordId} rid an ObjectId or string that can be cast to one.
 * @param {Object|*} [update]
 * @param {Object|*} [options]
 * @param {Boolean} [exec]
 *
 * @return {Promise|StatementSelect}
 * @promise {Model}
 * @public
 * @static
 */
Model.findByRidAndUpdate = function (rid, update, options, exec) {
  return this.findOneAndUpdate({'@rid': rid}, update, options, exec);
};

/**
 * Updates documents in the database without returning them.
 *
 * ####Examples:
 *
 *     MyModel.update({ age: { $gt: 18 } }, { oldEnough: true }, true).then(callback);
 *     MyModel.update({ name: 'Tobi' }, { ferret: true }, { limit: 2 }, true).then(function (numberAffected) {
 *       console.log('The number of updated documents was %d', numberAffected);
  *     }).catch(handleError);
 *
 * ####Valid options:
 *
 *  - `limit` (number) number of documents should be updated (0 means all appropriate)
 *
 * All `update` values are cast to their appropriate SchemaTypes before being sent.
 * All top level keys which are not `atomic` operation names are treated as set operations:
 *
 * ####Example:
 *
 *     var query = { name: 'borne' };
 *     Model.update(query, { name: 'jason borne' }, options, true).then(callback).catch(errorHandler);
 *
 *     // is sent as
 *     Model.update(query, { $set: { name: 'jason borne' }}, options, true).then(callback).catch(errorHandler);
 *
 * ####Note:
 *
 * Although values are casted to their appropriate types when using update, the following are *not* applied:
 *
 * - defaults
 * - setters
 * - validators
 * - middleware
 *
 * If you need those features, use the traditional approach of first retrieving the document.
 *
 *     Model.findOne({ name: 'borne' }, function (err, doc) {
 *       if (err) ..
 *       doc.name = 'jason borne';
 *       doc.save(callback);
 *     });
 *
 * @param {Object} conditions
 * @param {Object} doc
 * @param {Object|Boolean} [options]
 * @param {Boolean} [exec]
 *
 * @return {Promise|StatementUpdate}
 * @promise {Number} Number of affected records
 * @public
 * @static
 */
Model.update = function (conditions, doc, options, exec) {
  if (utils.isBoolean(options)) {
    exec = options;
    options = null;
  }

  options = options || {};
  if (!options.return) {
    options.return = 'count';
  }

  options.prepareResult = function (result) {
    return parseInt(result[0]);
  };

  var query = this.db.queryBuilder().update(this.modelName, conditions, doc, options);

  return exec ? query.exec() : query;
};

/**
 * Counts number of matching documents in a database collection.
 *
 * ####Example:
 *
 *     Adventure.count({ type: 'jungle' }, true).then(function (count) {
 *       console.log('there are %d jungle adventures', count);
 *     }).catch(errorCallback);
 *
 * @param {Object|*} [conditions]
 * @param {Object|*} [options] Query options
 * @param {Boolean} [exec]
 *
 * @return {Promise|StatementSelect}
 * @promise {Number}
 * @public
 * @static
 */
Model.count = function (conditions, options, exec) {
  if (utils.isBoolean(options)) {
    exec = options;
    options = null;
  }
  else if (utils.isBoolean(conditions)) {
    exec = conditions;
    options = null;
    conditions = null;
  }

  options = options || {};
  options.command = 'count';

  var query = this.db.queryBuilder().select(this.modelName, conditions, 'COUNT(*)', options);

  return exec ? query.exec() : query;
};

/**
 * Shortcut for creating a new Document that is automatically saved to the db if valid.
 * ####Example:
 *
 *     // pass individual docs
 *     Candy.create({ type: 'jelly bean' }, { type: 'snickers' }).then(function (docs) {
 *
 *     }).catch(function (err) {});
 *
 *     // the same with spread
 *     Candy.create({ type: 'jelly bean' }, { type: 'snickers' }).spread(function (jellybean, snickers) {
 *
 *     }).catch(function (err) {});
 *
 *     // pass an array
 *     var array = [{ type: 'jelly bean' }, { type: 'snickers' }];
 *     Candy.create(array).then(function (docs) {
 *
 *     }).catch(function(err) {});
 *
 *     // the same with spread
 *     Candy.create(array).spread(function (jellybean, snickers) {
 *
 *     }).catch(function(err) {});
 *
 * @param {Array|Object} doc
 * @param {Boolean|Object} [...]
 *
 * @return {Promise}
 * @promise {Model[]}
 * @public
 * @static
 */
Model.create = function (doc) {
  var args = utils.isArray(doc) ? doc : utils.args(arguments, 0)
    , self = this
    , docs = []
    , len = args.length;

  if (!len) return Promise.resolve(docs);

  return create();

  function create (i) {
    i = i || 0;
    if (i === len) return docs;
    if (!utils.isObject(args[i])) return create(i+1);

    var doc = new self(args[i]);
    return doc.save().then(function (nDoc) {
      docs[i] = nDoc;
      return create(i+1);
    });
  }
};

/**
 * Removes documents from the class.
 *
 * ####Example:
 *
 *     Comment.remove({ title: 'baby born from alien father' }, true).then(function (count) {
 *
 *     }).catch(errorHadler);
 *
 * ####Note:
 *
 * This method sends a remove command directly to OrientDB, no Orientorm documents are involved, so no Model middleware executed, but casting will be done for conditions.
 *
 * @param {Object|Boolean} conditions
 * @param {Boolean} [exec]
 * @return {Promise|StatementDelete}
 * @public
 * @static
 */
Model.remove = function (conditions, exec) {
  if (utils.isBoolean(conditions)) {
    exec = conditions;
    conditions = null;
  }

  var query = this.db.queryBuilder().delete(this.modelName, conditions, {command: 'count', return: 'count'});
  return exec ? query.exec() : query;
};

module.exports = Model;