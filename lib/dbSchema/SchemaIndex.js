var mixins = require('./mixins')
  , utils = require('../utils');

/**
 * @param {String} name
 * @param {Object} options
 * @constructor
 */
function SchemaIndex (name, options) {
  this.options = {};
  this.options.name = name;

  for (var i in options) {
    if (this[i] && utils.isFunction(this[i])) {

      var opts = utils.isArray(options[i])
        ? options[i]
        : [options[i]];

      this[i].apply(this, opts);
    }
  }
};

/**
 * @param {String} name
 *
 * @return {SchemaIndex}
 * @public
 */
SchemaIndex.prototype.name = mixins.option('name');

/**
 * @param {String} cName
 *
 * @return {SchemaIndex}
 * @public
 */
SchemaIndex.prototype.class = mixins.option('class');

/**
 * @param {Object} metadata
 *
 * @return {SchemaIndex}
 * @public
 */
SchemaIndex.prototype.metadata = mixins.option('metadata');

/**
 * @param {String|String[]} paths
 *
 * @return {SchemaIndex}
 * @public
 */
SchemaIndex.prototype.paths = function (paths) {
  if (paths === null) this.options.paths = [];
  else {
    this.options.paths = utils.isArray(paths) ? paths : [paths];
  }
  return this;
};

SchemaIndex.prototype.type = mixins.option('type');

/**
 * Prepare object with full schema description
 *
 * @return {Object}
 * @public
 */
SchemaIndex.prototype.getStructure = function () {
  return this.options;
};

module.exports = SchemaIndex;