var utils = require('../utils')
  , error = require('../error');

/**
 *
 * @param name
 * @param [available]
 * @param [defaultV]
 *
 * @return {Function}
 */
exports.option = function (name, available, defaultV) {
  if (available) {
    defaultV = defaultV || available[0];
  }

  return function (value) {
    if (available) {
      this.options[name] = (available.indexOf(value) >= 0) ? value : defaultV;
    }
    else {
      this.options[name] = value;
    }
    return this;
  };
};

exports.getOption = function (name) {
  return function () {
    return this.options[name];
  };
};

/**
 * @return {Function}
 */
exports.maxValidator = function () {
  return function (value, message) {
    if (this.maxValidator) {
      this.validators = this.validators.filter(function(v){
        return v[0] != this.maxValidator;
      }, this);
      this.maxValidator = false;
    }

    if (null != value) {
      message = message || error.messages.Number.max;
      message = message.replace(/{MAX}/, value);
      this.validators.push([this.maxValidator = function(v){
        return v === null || v <= value;
      }, message, 'max']);
    }
    this.builtOpts.max = value;
    return this;
  }
};

/**
 * @return {Function}
 */
exports.minValidator = function () {
  return function (value, message) {
    if (this.minValidator) {
      this.validators = this.validators.filter(function (v) {
        return v[0] != this.minValidator;
      }, this);
      this.minValidator = false;
    }

    if (null != value) {
      message = message || error.messages.Number.min;
      message = message.replace(/{MIN}/, value);
      this.validators.push([this.minValidator = function (v) {
        return v === null || v >= value;
      }, message, 'min']);
    }

    this.builtOpts.min = value;
    return this;
  }
};