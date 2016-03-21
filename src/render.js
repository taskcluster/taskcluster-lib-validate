let debug = require('debug')('taskcluster-lib-validate');
let _ = require('lodash');

/**
 * Walk through objects and replace nodes that are
 * simply an object that looks like `{$const: <key>}` with the
 * value of `<key>` in the list of constants.
 *
 * @private
 * @param {Object} schema - The object to replace within.
 * @param {Object} constants - The keys and values that will be substituted in.
 * @throws Will throw an error if any of the `<key>`'s are not defined in constants.
 * @returns {Object} The schema with substituted keys
 * */
function render (schema, constants) {

  let substitute = (val) => {

    // Primitives and arrays shouldn't event be considered
    if (!(val instanceof Object) || val instanceof Array) {
      return undefined;
    }

    // Check if there is a key and only one key
    let key = val['$const'];
    if (key === undefined || typeof key != 'string' || _.keys(val).length != 1) {
      return undefined;
    }

    // Check that there's a constant for the key
    let constant = constants[key];
    if (constant === undefined) {
      throw new Error('Warning! Undefined constant: ' + key);
    }

    // Clone constant
    return _.cloneDeepWith(constants[key], substitute);
  };
  // Do a deep clone with substitute
  return _.cloneDeepWith(schema, substitute);
};

module.exports = render;
