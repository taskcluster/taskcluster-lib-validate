suite('Invalid Schema Tests', () => {
  let assert = require('assert');
  let validator = require('../');
  let debug = require('debug')('test');

  test('invalid schema throws error', async () => {
    try {
      let validate = await validator({
        folder: 'test/invalid-schemas',
        rootUrl: 'http://localhost:1203/',
        serviceName: 'whatever',
        version: 'v1',
      });
      return assert(false, 'Bad schema should\'ve thrown an exception!');
    } catch (e) {
      debug('Bad schema has thrown an exception correctly.');
    }
  });

});
