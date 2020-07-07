'use strict';

const _ = require('lodash');
const parseKey = require('../util/parse-key');
const where = require('./where');

/**
 * An SQL DML statement.
 *
 * @class
 * @param {Table} source - Database object to query.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Update options}.
 */
const Statement = function (source, options = {}) {
  this.source = source;

  // query and result processing options
  this.build = options.build || false;
  this.decompose = options.decompose;
  this.document = options.document || false;
  this.single = options.single || false;
  this.stream = options.stream || false;

  // common SQL statement modifications
  this.only = options.only || false;
  this.returning = options.fields ? options.fields.map(f => parseKey(f, source).lhs) : ['*'];

  return this;
};

/**
 * Set the conditions and parameters for SELECT, UPDATE, and DELETE queries.
 *
 * @param {Object} criteria - A criteria object.
 * @param {Array} [initialParams] - Existing parameters which will be prepended
 * to parameters generated from criteria.
 */
Statement.prototype.setCriteria = function (criteria, initialParams = []) {
  this.isPkSearch = this.source.isPkSearch(criteria, this);

  if (this.isPkSearch && !_.isPlainObject(criteria)) {
    // primitive unary pk search
    this.criteria = _.fromPairs([[this.source.pk[0], criteria]]);
    this.single = this.source.loader !== 'join';
  } else {
    this.criteria = criteria;
  }

  const {conditions, params} = where(
    this.source,
    this.criteria,
    initialParams.length,
    !this.isPkSearch && this.document
  );

  this.conditions = conditions;
  this.params = initialParams.length ? initialParams.concat(params) : params;
};

module.exports = Statement;
