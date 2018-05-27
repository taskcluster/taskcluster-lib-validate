const debug = require('debug')('taskcluster-lib-validate');
const _ = require('lodash');
const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');
const walk = require('walk');
const yaml = require('js-yaml');
const assert = require('assert');
const Ajv = require('ajv');
const aws = require('aws-sdk');
const libUrls = require('taskcluster-lib-urls');
const publish = require('./publish');
const render = require('./render');
const rootdir = require('app-root-dir');
const mkdirp = require('mkdirp');

const TASKCLUSTER_SCHEMA_SCHEME = 'taskcluster:';

class SchemaSet {
  constructor(options) {
    assert(!options.prefix, 'The `prefix` option is no longer allowed');
    assert(!options.version, 'The `version` option is no longer allowed');
    assert(options.serviceName, 'A `serviceName` must be provided to taskcluster-lib-validate!');

    this.ajv = Ajv({useDefaults: true, format: 'full', verbose: true, allErrors: true});
    this.ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

    this.schemas = {};
    this.rawSchemas = {};

    const defaultFolder = path.join(rootdir.get(), 'schemas');
    this.cfg = _.defaults(options, {
      folder: defaultFolder,
      constants: path.join(options && options.folder || defaultFolder, 'constants.yml'),
      publish: process.env.NODE_ENV == 'production',
      bucket: 'schemas.taskcluster.net',
      preview: process.env.PREVIEW_JSON_SCHEMA_FILES,
      writeFile: process.env.WRITE_JSON_SCHEMA_FILES,
    });

    if (_.isString(this.cfg.constants)) {
      const fullpath = path.resolve(this.cfg.constants);
      debug('Attempting to set constants by file: %s', fullpath);
      try {
        this.cfg.constants = yaml.safeLoad(fs.readFileSync(fullpath, 'utf-8'));
      } catch (err) {
        if (err.code == 'ENOENT') {
          debug('Constants file does not exist, setting constants to {}');
          this.cfg.constants = {};
        } else {
          throw err;
        }
      }
    }

    let walkErr;
    walk.walkSync(path.resolve(this.cfg.folder), {listeners: {file: (root, stats) => {
      try {
        let name = path.relative(this.cfg.folder, path.join(root, stats.name));

        let json = null;
        const data = fs.readFileSync(path.join(this.cfg.folder, name), 'utf-8');
        if (/\.ya?ml$/.test(name) && name !== 'constants.yml') {
          json = yaml.safeLoad(data);
        } else if (/\.json$/.test(name)) {
          json = JSON.parse(data);
        } else {
          debug('Ignoring file %s', name);
          return;
        }

        const jsonName = name.replace(/\.ya?ml$/, '.json');
        this.rawSchemas[jsonName] = json;

        const schema = render(json, TASKCLUSTER_SCHEMA_SCHEME, this.cfg.serviceName, this.cfg.constants);

        if (schema.id || schema.$id) {
          debug('Schema incorrectly attempts to set own id: %s', name);
          throw new Error('Schema ' + path.join(root, name) + ' attempts to set own id!');
        }

        // We use a `taskcluster:` scheme until rootUrl is known later
        schema.$id = libUrls.schema(TASKCLUSTER_SCHEMA_SCHEME, this.cfg.serviceName, jsonName + '#');
        this.ajv.addSchema(schema);
        this.schemas[jsonName] = schema;
      } catch (err) {
        // walk swallows errors, so we must raise them ourselves
        if (!walkErr) {
          walkErr = err;
        }
      }
    }}});
    if (walkErr) {
      throw walkErr;
    }
    debug('finished walking tree of schemas');
  }

  abstractSchemas() {
    return this.schemas;
  }

  absoluteSchemas(rootUrl) {
    return _.mapValues(this.rawSchemas, (schema, name) => {
      schema.$id = libUrls.schema(rootUrl, this.cfg.serviceName, name + '#');
      // Re-render to update refs to include rootUrl
      schema = render(schema, rootUrl, this.cfg.serviceName, this.cfg.constants);
      return schema;
    });
  }

  async validator(rootUrl) {
    if (this.cfg.publish) {
      debug('Publishing schemas');
      assert(this.cfg.aws, 'Can\'t publish without aws credentials.');
      let s3Provider = this.cfg.s3Provider;
      if (!s3Provider) {
        debug('Using default s3 client');
        s3Provider = new aws.S3(this.cfg.aws);
      }
      await Promise.all(_.map(this.absoluteSchemas(rootUrl), (content, name) => {
        return publish.s3(
          s3Provider,
          this.cfg.bucket,
          `${this.cfg.serviceName}/`,
          name,
          content
        );
      }));
    }

    if (this.cfg.writeFile) {
      debug('Writing schema to local file');
      const dir = 'rendered_schemas';
      _.forEach(this.schemas, (content, name) => {
        const file = path.join(dir, name);
        const subdir = path.dirname(file);
        mkdirp.sync(subdir);
        publish.writeFile(file, content);
      });
    }

    if (this.cfg.preview) {
      debug('Writing schema to console');
      await Promise.all(_.map(this.schemas, (content, name) => {
        return publish.preview(
          name,
          content
        );
      }));
    }

    return (obj, id) => {
      id = id.replace(/#$/, '');
      id = id.replace(/\.ya?ml$/, '.json');
      if (!_.endsWith(id, '.json')) {
        id += '.json';
      }
      id += '#';
      this.ajv.validate(id, obj);
      if (this.ajv.errors) {
        _.forEach(this.ajv.errors, function(error) {
          if (error.params['additionalProperty']) {
            error.message += ': ' + JSON.stringify(error.params['additionalProperty']);
          }
        });
        return [
          '\nSchema Validation Failed!',
          '\nRejecting Schema: ',
          id,
          '\nErrors:\n  * ',
          this.ajv.errorsText(this.ajv.errors, {separator: '\n  * '}),
        ].join('');
      }
      return null;
    };
  }
}

module.exports = SchemaSet;
