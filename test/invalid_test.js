suite('Invalid Schema Tests', () => {
  let assert = require('assert');
  let SchemaSet = require('../');
  let debug = require('debug')('test');
  let libUrls = require('taskcluster-lib-urls');

  test('invalid schema containing an $id throws error', async () => {
    try {
      new SchemaSet({
        folder: 'test/invalid-schemas/schema-with-id',
        serviceName: 'whatever',
      });
      assert(false, 'Bad schema should\'ve thrown an exception!');
    } catch (e) {
      if (!e.toString().match(/attempts to set own id/)) {
        throw e;
      }
    }
  });

  test('invalid schema containing a default for an array throws error', async () => {
    try {
      new SchemaSet({
        folder: 'test/invalid-schemas/default-array-obj',
        serviceName: 'whatever',
      });
      assert(false, 'Bad schema should\'ve thrown an exception!');
    } catch (e) {
      if (!e.toString().match(/schema is invalid:/)) {
        throw e;
      }
    }
  });
});
