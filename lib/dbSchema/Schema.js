var EventEmitter = require('events').EventEmitter
  , SchemaType = require('./SchemaType')
  , Types = require('./types')
  , Containers = require('./containers')
  , utils = require('../utils')
  , mixins = require('./mixins')
  , VirtualType = require('./VirtualType')
  , error = require('../error')
  , CastError = error.CastError
  , Promise = require('bluebird')
  , connections = require('../ConnectionCache');

/**
 * @param {DbSchema} base
 * @param {Object} schema Class schema
 *
 * @constructor
 * @extends {EventEmitter}
 */
function Schema (base, schema) {
  this.base = base;
  this.options = this.options || {};
  this.builtOpts = this.builtOpts || {};
  this.mixed = this.base.buildComponent(null, 'Any', true);

  this.paths = {};
  this.virtuals = {};
  this._indexes = {};
  this.superClass = null;

  this.callQueue = [];
  this.methods = {};
  this.statics = {};

  this._installed = false;

  this.parseOptions(schema);
  this.builtOpts = this.defaultOptions(this.builtOpts);

  this.add({'@rid': 'String'});
};

/**
 * @private
 */
Schema.prototype.__proto__ = EventEmitter.prototype;

/**
 * @type {DbSchema}
 * @public
 */
Schema.prototype.base;

/**
 * @type {Object}
 * @protected
 */
Schema.prototype.options;

/**
 * @type {Object}
 * @protected
 */
Schema.prototype.builtOpts;

/**
 * @type {Schema}
 * @private
 */
Schema.prototype.superClass;

/**
 * @type {Object}
 * @protected
 */
Schema.prototype.paths;

/**
 * Returns default options for this schema, merged with `options`.
 * @param {Object} options
 *
 * @return {Object}
 * @private
 */
Schema.prototype.defaultOptions = function (options) {
  options = options || {};
  options = utils.options({
    strict: true,
    minimize: true
  }, options);

  return options;
};

/**
 * @param {Boolean} abstract
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.abstract = mixins.option('abstract');

/**
 * @param {String} name
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.name = mixins.option('name');

/**
 * @param {Object} custom
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.custom = mixins.option('custom');

/**
 * @return {String}
 * @public
 */
Schema.prototype.getName = mixins.getOption('name');

/**
 * @param {String|Schema|null} superClass
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.extends = function (superClass) {
  var cName = null;
  if (superClass !== null) {
    cName = utils.isString(superClass) ? superClass : superClass.getName();
  }

  if (cName === this.getName()) {
    throw new Error("Schema.extends(): Class can not extend itself.");
  }

  if (cName === null) {
    delete this.options.superClass;
    this.superClass = null;
    return this;
  }

  this.options.superClass = cName;
  return this;
};

/**
 * @param {Number|Number[]} clusterId
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.cluster = function (clusterId) {
  if (clusterId) {
    this.options.cluster = utils.isArray(clusterId) ? clusterId : [clusterId];
  }
  return this;
};

/**
 * @param {Number} oversize
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.oversize = mixins.option('oversize');

/**
 * @param {Boolean|String} strict
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.strict = function (strict) {
  this.builtOpts.strict = strict;
  return this;
};

/**
 * @param {String} strategy [default | round-robin | balanced]
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.clusterSelection = mixins.option(
  'clusterSelection',
  ['round-robin', 'default', 'balanced']
);

/**
 * Prepare options
 * @param {Object} options
 *
 * @return {Schema}
 * @protected
 */
Schema.prototype.parseOptions = function (options) {
  var paths = {}
    , indexes
    , method;

  options = options || {};
  for (var i in options) {
    // this is path
    if (i.substr(0, 1) !== '$') {
      paths[i] = options[i];
      continue;
    }
    else if (i === '$indexes') {
      indexes = options.$indexes;
    }
    else if (i === '$virtual') {
      this.builtOpts.virtual = true;
      continue;
    }

    method = i.substr(1);
    if (this[method] && utils.isFunction(this[method])) {
      var opts = utils.isArray(options[i])
        ? options[i]
        : [options[i]];

      this[method].apply(this, opts);
    }
  }

  this.add(paths);
  this.index(indexes);
  return this;
};

/**
 * Gets schema paths.
 *
 * @param {String} path
 * @param {Object|Boolean} [obj]
 * @param {Boolean} [strict] true by default
 *
 * @return {SchemaType|Schema|undefined}
 * @public
 */
Schema.prototype.path = function (path, obj, strict) {
  if (utils.isBoolean(obj)) {
    strict = obj;
    obj = undefined;
  }

  // required to return schema path
  if (obj === undefined) {
    // set to true by default if not defined
    strict = strict !== false;
    var field;
    if (/\./.test(path)) {
      // sub-paths in path
      // so we need to go deeper ;) and check all sub-paths
      field = utils.getSubPath(this, path, strict);
    }
    else {
      var superClass = this.getSuperClass()

      // search in super class
      if (superClass) {
        field = superClass.path(path, true);
      }
    }

    // found in subpaths or in superclass
    if (field) return field;
    // built-in
    else if (this.paths[path]) return this.paths[path];

    return strict ? undefined : this.mixed;
  }

  // Set schema path

  // here we have sub-path
  if (/\./.test(path)) {
    utils.setSubPath(this, path, obj);
  }
  // we allow overwrite
  //else if (this.path(path, true)) {
  //  throw new Error('Cannot overwrite path `' + path +  '` in class `'+ this.getName() +'`');
  //}
  else {
    this.paths[path] = this.base.buildComponent(path, obj, false);
  }
  return this;
};

/**
 * Add component or components
 * @param {String|Object} name
 * @param {SchemaType|Object} [obj] Prepared component or options
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.add = function (name, obj) {
  if (!name) return this;

  var paths = {};

  if (utils.isObject(name)) {
    paths = name;
  }
  else {
    paths[name] = obj;
  }

  for (var pName in paths) {
    if (!paths.hasOwnProperty(pName)) continue;
    // add check if this pName is registered already in the class
    if (['@rid'].indexOf(pName) < 0 && this.path(pName, true)) {
      throw new Error('Schema.add(): Can not add path `' + pName + '`, it is registered already.');
    }

    this.paths[pName] = this.base.buildComponent(pName, paths[pName], false);
  }

  return this;
};

/**
 * Get indexes
 * @return {Object}
 * @public
 */
Schema.prototype.indexes = function () {
  var superClass = this.getSuperClass()
    , indexes = {};
  if (superClass) {
    indexes = utils.clone(superClass.indexes());
  }
  return utils.mergeObjects(indexes, this._indexes);
};

/**
 * @return {Schema}
 * @public
 */
Schema.prototype.getSuperClass = function () {
  if (!this.superClass && this.options.superClass) {
    this.superClass = this.base.getClass(this.options.superClass);
  }
  return this.superClass;
};

/**
 * @return {Boolean}
 * @public
 */
Schema.prototype.isAbstract = function () {
  return !!this.options.abstract && !this.isVirtual();
};

/**
 * @return {Boolean}
 * @public
 */
Schema.prototype.isVirtual = function () {
  return !!this.builtOpts.virtual;
};

/**
 * Define index or multiple indexes
 * @param {String|Object} name
 * @param {Object|SchemaIndex} [options]
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.index = function (name, options) {
  if (this.isVirtual()) return this;
  if (!name) return this;

  var indexes = {};

  if (utils.isObject(name)) {
    indexes = name;
  }
  else {
    indexes[name] = options;
  }

  for (var iName in indexes) {
    if (!indexes.hasOwnProperty(iName)) continue;
    if (this.getIndex(iName)) {
      throw new Error('Schema.addIndex(): Can not add index "' + iName + '", it is registered already.')
    }
    else {
      this._indexes[iName] = this.base.buildIndex(iName, indexes[iName], this.getName());
    }
  }

  return this;
};

/**
 * Get index
 * @param {String} iName
 *
 * @return {SchemaIndex|null}
 * @public
 */
Schema.prototype.getIndex = function (iName) {
  var superClass = this.getSuperClass()
    , index = null;

  if (superClass) {
    index = superClass.getIndex(iName);
  }

  return index ? index : this._indexes[iName];
};

/**
 * Check whether schema contains rid
 * @param {RecordId} rid
 *
 * @return {Boolean}
 * @public
 */
Schema.prototype.hasRid = function (rid) {
  if (this.isVirtual()) return true;

  if (!this.options.cluster || !this.options.cluster.length) {
    // base is not initialized here, so cluster information is not available
    if (!this.base.initialized) return true;

    throw new Error("Schema.hasRid(): Schema `" + this.getName() + "` is not instanciated in DB, use Schema.init() method to instanciate it first");
  }
  return this.options.cluster.indexOf(rid.cluster) !== -1;
};

/**
 * Iterates the schemas paths similar to Array#forEach.
 *
 * The callback is passed the pathname and schemaType as arguments on each iteration.
 *
 * @param {Function} fn callback function
 * @param {String} [path]
 *
 * @return {Schema} this
 * @public
 */
Schema.prototype.eachPath = function (fn, path) {
  if (this.getSuperClass()) {
    this.getSuperClass().eachPath(fn, path);
  }

  var keys = Object.keys(this.paths)
    , len = keys.length;

  path = path ? path + '.' : '';

  for (var i = 0; i < len; ++i) {
    this.paths[keys[i]].iterate(fn, path + keys[i]);
  }

  return this;
};

/**
 * Get paths with mandatory option
 *
 * @return {String[]}
 * @public
 */
Schema.prototype.requiredPaths = function () {
  if (this._requiredpaths) return this._requiredpaths;
  var ret = [];
  this.eachPath(function (path, field) {
    if (field.isRequired()) ret.push(path);
  });

  return this._requiredpaths = ret;
};

/**
 * Returns the pathType of `path` for this schema.
 *
 * Given a path, returns whether it is a real, virtual, nested, or ad-hoc/undefined path.
 *
 * @param {String} path
 * @return {String}
 * @public
 */
Schema.prototype.pathType = function (path) {
  if (this.path(path, true)) return 'real';
  if (path in this.virtualPaths()) return 'virtual';

  return 'adhocOrUndefined';
};

/**
 * Get virtual paths
 *
 * @return {Object}
 * @public
 */
Schema.prototype.virtualPaths = function () {
  var superClass = this.getSuperClass()
    , virtuals = [];

  if (superClass) virtuals = superClass.virtualPaths();
  return utils.mergeObjects(virtuals, this.virtuals);
};

/**
 * Adds an instance method to documents constructed from Models compiled from this schema.
 *
 * ####Example
 *
 *     var schema = kittySchema = conn.schema(..);
 *
 *     schema.method('meow', function () {
 *       console.log('meeeeeoooooooooooow');
 *     })
 *
 *     var Kitty = conn.model('Kitty');
 *
 *     var fizz = new Kitty;
 *     fizz.meow(); // meeeeeooooooooooooow
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.
 *
 *     schema.method({
 *         purr: function () {}
 *       , scratch: function () {}
 *     });
 *
 *     // later
 *     fizz.purr();
 *     fizz.scratch();
 *
 * @param {String|Object} name
 * @param {Function} [fn]
 *
 * @return {Schema} this
 * @public
 */
Schema.prototype.method = function (name, fn) {
  if (utils.isObject(name)) {
    for (var i in name) {
      this.methods[i] = name[i];
    }
  }
  else this.methods[name] = fn;
  return this;
};

/**
 * Adds static "class" methods to Models compiled from this schema.
 *
 * ####Example
 *
 *     var schema = conn.schema(..);
 *     schema.static('findByName', function (name, callback) {
 *       return this.find({ name: name }, callback);
 *     });
 *
 *     var Drink = conn.model('Drink', schema);
 *     Drink.findByName('sanpellegrino', function (err, drinks) {
 *       //
 *     });
 *
 * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as statics.
 *
 * @param {String} name
 * @param {Function} fn
 *
 * @return {Schema} this
 * @public
 */
Schema.prototype.static = function(name, fn) {
  if (utils.isObject(name)) {
    for (var i in name) {
      this.statics[i] = name[i];
    }
  }
  else this.statics[name] = fn;
  return this;
};

/**
 * Adds a method call to the queue.
 *
 * @param {String} name name of the document method to call later
 * @param {Array} args arguments to pass to the method
 *
 * @return {Schema}
 * @private
 */
Schema.prototype.queue = function(name, args){
  this.callQueue.push([name, args]);
  return this;
};

/**
 * Defines a pre hook for the document.
 *
 * ####Example
 *
 *     var toySchema = conn.schema(..);
 *
 *     toySchema.pre('save', function (next) {
 *       if (!this.created) this.created = new Date;
 *       next();
 *     })
 *
 *     toySchema.pre('validate', function (next) {
 *       if (this.name != 'Woody') this.name = 'Woody';
 *       next();
 *     })
 *
 * @param {String} method
 * @param {Function} fn
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.pre = function (method, fn) {
  return this.queue('pre', arguments);
};

/**
 * Defines a post hook for the document
 *
 * Post hooks fire `on` the event emitted from document instances of Models compiled from this schema.
 *
 *     var schema = conn.schema(..);
 *     schema.post('save', function (doc) {
 *       console.log('this fired after a document was saved');
 *     });
 *
 *     var Model = mongoose.model('Model', schema);
 *
 *     var m = new Model(..);
 *     m.save(function (err) {
 *       console.log('this fires after the `post` hook');
 *     });
 *
 * @param {String} method name of the method to hook
 * @param {Function} fn callback
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.post = function(method, fn){
  return this.queue('on', arguments);
};

/**
 * Registers a plugin for this schema.
 *
 * @param {Function} fn callback
 * @param {Object} [opts]
 *
 * @return {Schema}
 * @public
 */
Schema.prototype.plugin = function (fn, opts) {
  fn(this, opts);
  return this;
};

/**
 * Creates a virtual type with the given name.
 *
 * @param {String} name
 * @param {Object} [options]
 *
 * @return {VirtualType}
 * @public
 */
Schema.prototype.virtual = function (name, options) {
  if (this.path(name, true))
    throw new Error('Cannot overwrite path `' + name + '` with Virtual Type in class `' + this.getName() + '`');

  return this.virtuals[name] = new VirtualType(name, options);
};

/**
 * Returns the virtual type with the given `name`.
 *
 * @param {String} name
 *
 * @return {VirtualType}
 * @public
 */
Schema.prototype.virtualpath = function (name) {
  return this.virtuals[name];
};

/**
 * Return number of paths
 * @return {Number}
 * @public
 */
Schema.prototype.hasPaths = function () {
  return this.listPaths().length;
};

/**
 * Get array of full paths
 * @return {String[]}
 * @public
 */
Schema.prototype.listPaths = function () {
  var paths = [];
  this.eachPath(function (path) {
    paths.push(path);
  });
  return paths;
};

/**
 * Build Schema tree for model
 *
 * @return {Object}
 * @public
 */
Schema.prototype.buildTree = function () {
  var superClass = this.getSuperClass()
    , tree = {}
    , path;

  if (superClass) tree = superClass.buildTree();

  for (path in this.paths) {
    if (!this.paths.hasOwnProperty(path)) continue;
    tree[path] = this.paths[path].buildTree();
  }

  for (path in this.virtuals) {
    if (!this.virtuals.hasOwnProperty(path)) continue;
    tree[path] = this.virtuals[path];
  }

  return tree;
};

/**
 * Prepare object with full schema description
 *
 * @return {Object}
 * @public
 */
Schema.prototype.getStructure = function () {
  if (this.isVirtual()) return {};
  var schema = {
      name: this.getName(),
      options: this.options,
      paths: {},
      indexes: {}
    };

  for (var pName in this.paths) {
    if (['@rid'].indexOf(pName) >= 0) continue;
    schema.paths[pName] = this.paths[pName].getStructure();
  }

  for (var iName in this._indexes) {
    schema.indexes[iName] = this._indexes[iName].getStructure();
  }

  return schema;
};

/**
 * Install class with all dependencies (another classes)
 * @return {Promise}
 * @public
 */
Schema.prototype.init = function () {
  if (this._installed) {
    return Promise.resolve(true);
  }

  // if schema installed already and clusters registered
  var self = this
    , base = this.base;

  if (base.hasCluster(this)) {
    return base.getCluster(this).then(function (cluster) {
      self.cluster(cluster);
      return self._installed = true;
    });
  }

  // need to install schema first
  // but first install dependencies
  return base.initClasses(this.dependencies()).then(function (result) {
    if (result) return install(self);
    return false;
  });
};

/**
 * Get class dependencies
 * @return {String[]}
 * @protected
 */
Schema.prototype.dependencies = function () {
  var deps = []
    , self = this;
  if (this.options.superClass) {
    deps.push(this.options.superClass);
  }
  for (var pName in this.paths) {
    if (!this.paths.hasOwnProperty(pName)) continue;
    deps = deps.concat(this.paths[pName].dependencies().filter(function (cName) {
      return cName !== self.getName();
    }));
  }
  return deps;
};

/**
 * @param {Schema} self
 * @return {Promise}
 * @promise {Boolean}
 */
function install (self) {
  var schema = self.getStructure()
    , base = self.base;

  return base.db().createCommand().createClass(schema.name, schema.options, schema.paths, schema.indexes)
    .execute()
    .then(function (result) {
      if (result) return base.getCluster(self);
      return false;
    }).then(function (cluster) {
      if (cluster) {
        self.cluster(cluster);
        console.info('Class "' + self.getName() + '" installed successfully.');
        return self._installed = true;
      }
      console.error('Class "' + self.getName() + '" can not be installed.');
      return false;
    });
};

/**
 * @param {Object} value
 *
 * @return {*}
 * @public
 */
Schema.prototype.cast = function (value, path, scope, init, priorVal) {
  if (utils.isObject(value)) {
    var embedded = {}
      , self = this;

    path = path ? path + '.': '';
    Object.keys(value).forEach(function (key) {
      embedded[key] = self.path(key, false).cast(value[key], path + key, scope, init, priorVal);
    });

    return embedded;
  };

  throw new CastError('Object', value);
};

/**
 * Converts type arguments into OrientOrm Types.
 *
 * @param {DbSchema} base
 * @param {String} name
 * @param {Object} options constructor
 * @param {Boolean} [linked]
 *
 * @return {SchemaType}
 * @public
 * @static
 */
Schema.interpretAsType = function (base, name, options, linked) {
  if (options instanceof SchemaType) {
    if (linked && !Types[options.getType()]) {
      throw new Error("SchemaType.interpretAsType(): Unsupported linked schema type `" + options.getType() + "`. This type can not be linked type, see types documentation.");
    }
    return options.name(name);
  }

  var type = searchType(options);

  if (utils.isString(options)) {
    options = {$type: options};
  }

  if (type === 'EmbeddedSchema') {
    type = 'Embedded';
    options = {$class: options};
  }

  if (Types[type]) {
    return new Types[type](base, name, options);
  }
  else if (!linked && Containers[type]) {
    return new Containers[type](base, name, options);
  }

  throw new Error("SchemaType.interpretAsType(): Unsupported schema type `" + type + "`");
};

function searchType (options) {
  if (!options) return 'Any';

  if (utils.isString(options)) {
    return options;
  }
  else if (options instanceof Schema) {
    return 'EmbeddedSchema';
  }
  else if (utils.isObject(options)) {
    if (options.$type) {
      return options.$type;
    }
    else if (options.$map) {
      return options.$link ? 'LinkMap' : 'EmbeddedMap';
    }
    else {
      return options.$link ? 'Link' : 'Embedded';
    }
  }
  else if (utils.isArray(options)) {
    if (!options.length || utils.isString(options[0])) {
      return 'EmbeddedList';
    }
    else {
      var subtype = searchType(options[0]);

      switch (subtype) {
        case 'Link':
          return options[0].$unique ? 'LinkSet' : 'LinkList';

        case 'EmbeddedSchema':
          options[0] = {$class: options[0]};
          return 'EmbeddedList';

        case 'Embedded':
          return options[0].$unique ? 'EmbeddedSet' : 'EmbeddedList';

        // the same for any other type returned
        default:
          return options[0].$unique ? 'EmbeddedSet' : 'EmbeddedList';
      }
    }
  }

  throw new Error("SchemaType.interpretAsType(): Unsupported schema description");
};

module.exports = Schema;