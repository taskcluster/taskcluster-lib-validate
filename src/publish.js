let debug = require('debug')('taskcluster-lib-validate');
let Promise = require('promise');

/**
 * Publish a schema to s3
 *
 * @private
 * @param {Object} s3 - An object that provides a `putObject` function that is compatible with
 * the aws-sdk S3 object.
 * @param {string} buckets - The s3 bucket that the schemas will be placed in.
 * @param {string} prefix - The first part of the key for the schema. The name will be appended to this.
 * @param {string} name - The final part of the full key for this schema in s3.
 * @param {Object} content - The schema itself.
 * @returns {Promise}
 * */
function publish (s3, bucket, prefix, name, content) {
  return new Promise((accept, reject) => {
    debug('Publishing schema %s', name);
    content = JSON.stringify(content, undefined, 4);
    if (!content) {
      debug('Schema %s has invalid content!', name);
      return reject();
    }
    s3.putObject({
      Bucket: bucket,
      Key: prefix + name,
      Body: content,
      ContentType: 'application/json',
    }, (err, data) => {
      if (err) {
        debug('Publishing failed for schema %s', name);
        return reject(err);
      }
      debug('Publishing succeeded for schema %s', name);
      return accept(data);
    });
  });
}

module.exports = publish;
