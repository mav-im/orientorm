var StateMachine = require('./StateMachine')
  , ActiveRoster = StateMachine.ctor('require', 'modify', 'init', 'default');

function InternalCache () {
  this.strictMode = undefined;
  this.selected = undefined;
  //this.shardval = undefined;
  this.saveError = undefined;
  this.validationError = undefined;
  this.adhocPaths = undefined;
  //this.removing = undefined;
  //this.inserting = undefined;
  //this.version = undefined;
  this.getters = {};
  //this._id = undefined;
  //this.populate = undefined; // what we want to populate in this doc
  //this.populated = undefined;// the _ids that have been populated
  //this.wasPopulated = false; // if this doc was the result of a population
  this.scope = undefined;
  this.activePaths = new ActiveRoster;

  // embedded docs
  this.ownerDocument = undefined;
  this.fullPath = undefined;
}

module.exports = InternalCache;