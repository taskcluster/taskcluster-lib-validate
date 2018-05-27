const debug = require('debug')('taskcluster-lib-validate');
const _ = require('lodash');
const libUrls = require('taskcluster-lib-urls');

/** 
 * Render {$const: <key>} into JSON schema and update $ref
 */
function renderConstants(schema, constants) {
  // Replace val with constant, if it is an {$const: <key>} schema
  let substitute = (val) => {
    // Primitives and arrays shouldn't event be considered
    if (!(val instanceof Object) || val instanceof Array) {
      return undefined;
    }

    // Check if there is a key and only one key
    let key = val.$const;
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

exports.renderConstants = renderConstants;
