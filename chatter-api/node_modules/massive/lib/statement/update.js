'use strict';

const _ = require('lodash');
const Statement = require('./statement');
const prepareParams = require('../util/prepare-params');

/**
 * Represents an UPDATE query.
 *
 * @class
 * @param {Table} source - Database object to query.
 * @param {Object} changes - A map of field names to new values.
 * @param {Object} criteria - A criteria object.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Update options}.
 */
const Update = function (source, changes, criteria, options = {}) {
  Statement.call(this, source, options, true);

  let offset = 0;

  changes = _.pick(changes, [...source.columnNames, '$set']);

  this.changes = _.reduce(changes, (acc, value, key) => {
    if (key === '$set' && _.isObject(value)) {
      Object.entries(value).forEach(([setKey, setValue]) => {
        if (Object.keys(changes).includes(setKey)) {
          throw new Error(`The key '${setKey}' may not be defined in both the change map and the $set map.`);
        }

        acc.push(`"${setKey}" = ${setValue}`);
      });
    } else {
      acc.push(`"${key}" = $${++offset}`);
    }

    return acc;
  }, []);

  this.setCriteria(criteria, prepareParams(_.keys(changes), [changes]));
};

Update.prototype = Object.create(Statement.prototype);

/**
 * Format this object into a SQL UPDATE.
 *
 * @return {String} A SQL UPDATE statement.
 */
Update.prototype.format = function () {
  let sql = 'UPDATE ';

  if (this.only) { sql += 'ONLY '; }

  sql += `${this.source.delimitedFullName} `;
  sql += `SET ${this.changes.join(', ')} `;

  if (this.source.loader === 'join') {
    // the first join is b in `UPDATE a SET ... FROM b`
    const target = this.source.joins[0];

    this.predicate = `${target.on.predicates} AND (${this.predicate}) `;

    sql += `FROM ${target.relation} `;
    sql += _.tail(this.source.joins).map(j => `${j.type} JOIN ${j.target} ON ${j.on.predicates} `).join('');
    sql += `WHERE ${this.predicate} `;
    sql += `RETURNING ${this.source.delimitedFullName}.*`;
  } else {
    sql += `WHERE ${this.predicate} `;
    sql += `RETURNING ${this.returning.join(', ')}`;
  }

  return sql;
};

module.exports = Update;
