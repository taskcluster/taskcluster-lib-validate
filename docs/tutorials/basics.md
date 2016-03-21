TODO: Make this more complete

You can view the tests to see more in-detail usage of most features of this library, but the general idea is as follows

```javascript
let doc = {'what-is-this': 'it-is-the-json-you-wish-to-validate'};

// This creates a validator for you to use
validate = await validator({ constants: {'my-constant': 42} });

// This checks whatever object you wish against whichever schema you wish
let error = validate(
    doc,
    'http://schemas.taskcluster.net/a-schema-you-wish-to-validate-against');

// Finally, ensure that there are no errors and continue however you see fit
if (!error) {
  doSomethingWith(doc);
} else {
  yellAboutErrors();
}
```

The return value is either `null` if nothing is wrong, or an error message that tries to
do a decent job of explaining what went wrong in plain, understandable language. An
error message may look as follows:

```
Schema Validation Failed:
  Rejecting Schema: http://localhost:1203/big-schema.json
  Errors:
    * data should have required property 'provisionerId'
    * data should have required property 'workerType'
    * data should have required property 'schedulerId'
    * data should have required property 'taskGroupId'
    * data should have required property 'routes'
    * data should have required property 'priority'
    * data should have required property 'retries'
    * data should have required property 'created'
    * data should have required property 'deadline'
    * data should have required property 'scopes'
    * data should have required property 'payload'
    * data should have required property 'metadata'
    * data should have required property 'tags'
```

It is possible to specify constants that will be substituted into all of your schemas.
For examples of this behavior, you can view the tests.

This library will automatically publish schemas to s3 in production if you so desire.

All other functionality should be the same as [ajv itself](https://www.npmjs.com/package/ajv).
