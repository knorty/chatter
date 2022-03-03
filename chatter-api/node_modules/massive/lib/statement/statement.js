'use strict';

const _ = require('lodash');
const parseKey = require('../util/parse-key');

/**
 * An SQL DML statement.
 *
 * @class
 * @param {Table} source - Database object to query.
 * @param {Object} options - {@link https://massivejs.org/docs/options-objects|Update options}.
 * @param {Boolean} returns - True to generate a field array for a RETURNING clause.
 */
const Statement = function (source, options, returns = false) {
  this.source = source;

  // query and result processing options
  this.build = options.build || false;
  this.decompose = options.decompose;
  this.document = options.document || false;
  this.single = options.single || false;
  this.stream = options.stream || false;

  // common SQL statement modifications
  this.only = options.only || false;
  this.returning = returns && options.fields ? options.fields.map(f => parseKey(f, source).lhs) : ['*'];

  return this;
};

/**
 * Determine whether a criteria object represents a search on the complete
 * primary key and only the primary key.
 *
 * @param {Object} criteria - A criteria object.
 * @return {Boolean} True if the criteria represent a primary key search.
 */
Statement.prototype.isPkSearch = function (criteria) {
  if (!this.source.pk) { return false; }

  const criteriaKeys = _.map(criteria, (v, k) => parseKey(k, this.source).field);

  return _.difference(criteriaKeys, this.source.pk).length === 0;
};

/**
 * Set the conditions and parameters for SELECT, UPDATE, and DELETE queries.
 *
 * @param {Object} criteria - A criteria object.
 * @param {Array} [prepend] - Known parameter values to prepend, e.g. for
 * changes in an update.
 */
Statement.prototype.setCriteria = function (criteria, prepend = []) {
  if (!criteria) {
    throw new Error('Criteria cannot be null or undefined. Pass {} to operate on all rows.');
  }

  if (!_.isPlainObject(criteria)) {
    // primitive unary pk search
    if (!this.source.pk) {
      throw new Error(`${this.source.delimitedFullName} doesn't have a primary key.`);
    }

    this.criteria = _.fromPairs([[this.source.pk[0], criteria]]);

    if (this.source.loader !== 'join') {
      // for single-relation queries the unary pk can only refer to a single
      // row, so make sure we return an object no matter what; nothing can be
      // assumed for a join query, however
      this.single = true;
    }
  } else {
    this.criteria = criteria;
  }

  // find literal join conditions
  if (this.source.loader === 'join') {
    prepend = prepend.concat(this.source.joins.reduce((acc, j) => {
      if (j.on.params) {
        acc = acc.concat(j.on.params);
      }

      return acc;
    }, []));
  }

  const {predicate, params} = this.source.predicate(
    this.criteria,
    prepend.length,
    // use document mode in the WHERE clause if:
    // * document mode has been selected
    // * we are not searching on the pk, since that's always in the row rather
    // than the document body
    this.document && _.isPlainObject(criteria) && !this.isPkSearch(criteria) ? this.source.forDoc : this.source.forWhere
  );

  this.predicate = predicate;
  this.params = prepend.length ? prepend.concat(params) : params;
};

module.exports = Statement;
