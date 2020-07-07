'use strict';

const _ = require('lodash');
const parseKey = require('../util/parse-key');

/** @module join */

const buildJoinConjunction = (criteria, joiner, compoundReadable) => {
  const conjunctions = _.map(criteria, (val, joinKey) => {
    if (joinKey === 'or') {
      const disjunctions = val.map(v => buildJoinConjunction(v, joiner, compoundReadable));

      return `(${disjunctions.join(' OR ')})`;
    }

    const sourceKey = parseKey(val, compoundReadable);

    return `("${joiner}"."${joinKey}" = ${sourceKey.path})`;
  });

  if (conjunctions.length > 1) {
    return `(${conjunctions.join(' AND ')})`;
  }

  return conjunctions[0];
};

/**
 * Generates the raw materials for JOIN clauses.
 *
 * @param {Entity} source - The source being queried.
 * @return {Object} An array of JOIN type-relation-criteria objects.
 */
exports = module.exports = function join (source) {
  return source.joins.map(j => {
    const criteria = buildJoinConjunction(j.on, j.alias, source);
    const delimitedAlias = `"${j.alias}"`;
    const relation = delimitedAlias === j.readable.delimitedFullName ?
      delimitedAlias :
      `${j.readable.delimitedFullName} AS ${delimitedAlias}`;

    return {
      type: j.type,
      relation,
      criteria
    };
  });
};
