'use strict';

const _ = require('lodash');
const util = require('util');
const murmurhash = require('murmurhash').v3;
const ops = require('./statement/operations');
const documentPredicate = require('./statement/document-predicate');
const parseKey = require('./util/parse-key');
const quote = require('./util/quote');
const stringify = require('./util/stringify');
const Entity = require('./entity');
const Select = require('./statement/select');

/**
 * A readable database entity (table or view).
 *
 * @class
 * @extends Entity
 * @param {Object} spec - An {@linkcode Entity} specification representing a
 * readable object:
 * @param {Object} spec.db - A {@linkcode Database}.
 * @param {String} spec.name - The table or view's name.
 * @param {String} spec.schema - The name of the schema owning the table or
 * view.
 * @param {Object|Array} spec.columns - An array of column names, or an object
 * mapping constituent Readable names to their column name arrays.
 * @param {Object} spec.joins - A join object.
 * @param {Boolean} [spec.is_matview] - Whether the object is a materialized view
 * (default false).
 */
const Readable = function (spec) {
  Entity.apply(this, arguments);

  this.columnNames = spec.columns;
  this.columns = spec.columns.map(c => ({
    schema: this.schema,
    parent: this.name,
    name: c,
    fullName: `${this.delimitedFullName}."${c}"`
  }));
  this.isMatview = spec.is_matview || false;
};

util.inherits(Readable, Entity);

Readable.prototype.forJoin = Symbol('join');
Readable.prototype.forWhere = Symbol('where');
Readable.prototype.forDoc = Symbol('doc');

/**
 * Generate a consistent alias for a field belonging to this Readable.
 *
 * @param {String} field - The field to alias.
 * @return {String} An alias separating schema (if necessary), relation, and
 * field names with double underscores.
 */
Readable.prototype.aliasField = function (field) {
  if (this.schema === this.db.currentSchema) {
    return `${this.name}__${field}`;
  }

  return `${this.schema}__${this.name}__${field}`;
};

/**
 * Count rows matching criteria. There are two ways to use this method:
 *
 * 1. find() style: db.mytable.count({field: value});
 * 2. where() style: db.mytable.count("field=$1", [value]);
 *
 * @param {Object|String} conditions - A criteria object or SQL predicate.
 * @param {Array} params - Prepared statement parameters for use with raw SQL
 * predicates.
 * @return {Promise} Row count.
 */
Readable.prototype.count = function (conditions = {}, params = []) {
  if (_.isString(conditions)) {
    conditions = {
      conditions,
      params
    };
  }

  const query = new Select(this, conditions, {exprs: {count: 'COUNT(1)'}, order: null, single: true});

  return this.db.query(query).then(res => res.count);
};

/**
 * Count documents matching criteria. Unlike count, this function only supports
 * criteria objects.
 *
 * @param {Object} criteria - A criteria object.
 * @return {Promise} Number of matching documents.
 */
Readable.prototype.countDoc = function (criteria = {}) {
  const query = new Select(this, criteria, {
    exprs: {count: 'COUNT(1)'},
    order: null,
    single: true,
    document: true
  });

  return this.db.query(query).then(res => res.count);
};

/**
 * Find rows matching criteria.
 *
 * @param {Object|UUID|Number} criteria - A criteria object or primary key value.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.find = function (criteria = {}, options = {}) {
  return this.db.query(new Select(this, criteria, options));
};

/**
 * Find a document by searching in the body.
 *
 * @param {Object|UUID|Number} [criteria] - A criteria object or primary key value.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.findDoc = function (criteria = {}, options = {}) {
  options.document = true;

  return this.find(criteria, options);
};

/**
 * Return a single record.
 *
 * @param {Object|UUID|Number} criteria - A criteria object or primary key value.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Select options}.
 * @return {Promise} An object representing the (first) record found, or
 * null if no records match.
 */
Readable.prototype.findOne = function (criteria, options = {}) {
  return this.find(criteria, _.assign(options, {single: true}));
};

/**
 * Refresh a materialized view.
 *
 * @param {Boolean} [concurrently] - Do it without locking reads.
 * @return {Promise} A query with no results.
 */
Readable.prototype.refresh = function (concurrently) {
  if (!this.isMatview) {
    return this.db.$p.reject(new Error(`${this.delimitedName} is not a materialized view`));
  }

  const concurrentlyStr = concurrently ? 'CONCURRENTLY' : '';

  return this.db.query(`REFRESH MATERIALIZED VIEW ${concurrentlyStr} ${this.delimitedFullName}`);
};

/**
 * Perform a full-text search on queryable fields. If options.document is true,
 * looks in the document body fields instead of the table columns.
 *
 * @param {Object} plan - Search definition.
 * @param {Array} plan.fields - List of the fields to search.
 * @param {String} plan.term - Search term.
 * @param {String} [plan.parser] - Parse search term as `plain` (more forgiving
 * than the default), `phrase`, or `websearch`.
 * @param {String} [plan.tsv] - Unsafely interpolate a prebuilt text search
 * vector instead of using `fields`.
 * @param {Object} [plan.where] - Criteria object to filter results.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Select options}.
 * @param {Boolean} doDocumentProcessing - True to process results as documents.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.search = function (plan, options = {}, doDocumentProcessing = false) {
  if (!plan.fields && !plan.tsv) {
    return this.db.$p.reject(new Error('Plan must contain a fields array or tsv string'));
  } else if (!plan.term) {
    return this.db.$p.reject(new Error('Plan must contain a term string'));
  }

  if (!plan.tsv) {
    if (plan.fields.length === 1) {
      plan.to_tsv = plan.fields[0];

      if (plan.to_tsv.indexOf('>>') === -1) {
        plan.to_tsv = quote(plan.to_tsv); // just a column, quote it to preserve casing
      }
    } else {
      plan.to_tsv = `concat(${plan.fields.join(", ' ', ")})`;  // eslint-disable-line quotes
    }
  }

  if (plan.to_tsv) {
    plan.tsv = `to_tsvector(${plan.to_tsv})`;
  }

  switch (plan.parser) {
    case 'plain': plan.parser = 'plainto_tsquery'; break;
    case 'phrase': plan.parser = 'phraseto_tsquery'; break;
    case 'websearch': plan.parser = 'websearch_to_tsquery'; break;
    default: plan.parser = 'to_tsquery'; break;
  }

  const criteria = {
    conditions: `${plan.tsv} @@ ${plan.parser}($1)`,
    params: [plan.term],
    where: plan.where,
    isDocument: options.document
  };

  if (doDocumentProcessing) {
    options.document = true;
  }

  const query = new Select(this, criteria, options);

  return this.db.query(query);
};

/**
 * Shortcut to perform a full text search on a document table.
 *
 * @param {Object} plan - Search definition.
 * @param {Array} [plan.fields] - List of the document keys to search.
 * @param {String} plan.term - Search term.
 * @param {Object} [plan.where] - Criteria object to filter results.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.searchDoc = function (plan, options = {}) {
  if (!plan.fields) {
    plan.tsv = 'search';
  } else {
    plan.fields = plan.fields.map(key => {
      return `(body ->> '${key}')`;
    });
  }

  return this.search(plan, options, true);
};

/**
 * Run a query with a raw SQL predicate, eg:
 *
 * db.mytable.where('id=$1', [123]).then(...);
 *
 * @param {String} conditions - A raw SQL predicate.
 * @param {Array} [params] - Prepared statement parameters.
 * @param {Object} [options] - {@link https://massivejs.org/docs/options-objects|Select options}.
 * @return {Promise} An array containing any query results.
 */
Readable.prototype.where = function (conditions, params = [], options = {}) {
  if (!_.isArray(params) && !_.isPlainObject(params)) { params = [params]; }

  const query = new Select(this, {conditions, params}, options);

  return this.db.query(query);
};

/**
 * Build a disjunction (logical OR).
 *
 * @param {Object} criteria - A criteria object.
 * @param {Number} offset - Offset prepared statement parameter ordinals.
 * @param {Symbol} kind - forJoin, forWhere, or forDoc.
 * @return {String} The JOIN condition text, to be stored and interpolated into
 * queries after the ON.
 */
Readable.prototype.disjoin = function (criteria, offset, kind, ...args) {
  return _.reduce(criteria, (disjunction, subconditions) => {
    // each member of an 'or' array is itself a conjunction, so build it and
    // integrate it into the disjunction predicate structure
    /* eslint-disable-next-line no-use-before-define */
    const conjunction = this.conjoin(subconditions, disjunction.offset + disjunction.params.length, kind, ...args);

    disjunction.params = disjunction.params.concat(conjunction.params);
    disjunction.predicates.push(`(${conjunction.predicates.join(' AND ')})`);

    return disjunction;
  }, {
    predicates: [],
    params: [],
    offset
  });
};

/**
 * Build a conjunction (logical AND).
 *
 * @param {Object} criteria - A criteria object.
 * @param {Number} offset - Offset prepared statement parameter ordinals.
 * @param {Symbol} kind - forJoin, forWhere, or forDoc.
 * @return {String} The JOIN condition text, to be stored and interpolated into
 * queries after the ON.
 */
Readable.prototype.conjoin = function (criteria, offset, kind, ...args) {
  return _.reduce(criteria, (conjunction, val, key) => {
    // TODO un-$ed names are officially deprecated but may or may not ever be
    // practical to remove
    if (['$or', 'or'].indexOf(key) > -1) {
      const disjunction = this.disjoin(val, conjunction.offset + conjunction.params.length, kind, ...args);

      conjunction.params = conjunction.params.concat(disjunction.params);
      conjunction.predicates.push(`(${disjunction.predicates.join(' OR ')})`);

      return conjunction;
    } else if (['$and', 'and'].indexOf(key) > -1) {
      const predicates = []; // track subconjunction predicates separately since they're grouped together

      conjunction = _.reduce(val, (c, subconditions) => {
        // each member of an 'and' array is itself a conjunction, so build it and
        // integrate it into the conjunction predicate structure
        /* eslint-disable-next-line no-use-before-define */
        const innerConjunction = this.conjoin(subconditions, c.offset + c.params.length, kind, ...args);

        c.params = c.params.concat(innerConjunction.params);
        predicates.push(`(${innerConjunction.predicates.join(' AND ')})`);

        return c;
      }, conjunction);

      conjunction.predicates = conjunction.predicates.concat([`(${predicates.join(' AND ')})`]);

      return conjunction;
    }

    let name = key;

    if (kind === this.forDoc) {
      name = `body.${name}`;
    } else if (kind === this.forJoin) {
      name = `${args[0]}.${name}`; // alias for join clause
    }

    let condition = parseKey.withAppendix(
      name,
      this,
      ops,
      val,
      offset + conjunction.params.length + 1
    );

    if (kind === this.forDoc) {
      condition = documentPredicate(condition, key);
    } else {
      if (kind === this.forJoin && _.isString(val)) {
        // for join criteria, val can be another Readable column name to match
        const sourceKey = parseKey(val, this);

        if (this.columns.some(c => c.fullName === sourceKey.path && !sourceKey.remainder)) {
          conjunction.predicates.push(`${condition.lhs} = ${sourceKey.lhs}`); // TODO operations?

          return conjunction;
        }
      }

      // join or table where
      // mutators can do things to condition.value, so it has to be in final form
      // before those get applied; and JSON predicates expect strings.
      if (condition.isJSON && condition.value) {
        condition.value = stringify(condition.value);
      }

      if (condition.appended.mutator) {
        condition = condition.appended.mutator(condition);
      } else if (condition.value) {
        condition.params.push(condition.value);
        condition.value = `$${condition.offset}`;
      }
    }

    conjunction.predicates.push(`${condition.lhs} ${condition.appended.operator} ${condition.value}`);
    conjunction.params = conjunction.params.concat(condition.params);

    return conjunction;
  }, {
    predicates: [],
    params: [],
    offset
  });
};

/**
 * Create a {predicate, params} object from join or where criteria.
 *
 * Spread argument is used to disambiguate columns while building compound
 * Readables by prepending the joining relation's alias, e.g. "alias"."field".
 *
 * @param {Object} criteria - Query criteria mapping column names (optionally
 * including operation eg 'my_field <>') to the parameter values. Predicates
 * generated from a criteria object are joined together with `$and`; an `$or`
 * key denotes an array of nested criteria objects, the collected predicates
 * from each of which are parenthesized and joined with `$or`.
 * @param {Number} offset - Added to the token index value in the prepared
 * statement (with offset 0, parameters will start $1, $2, $3).
 * @param {Symbol} kind - forJoin, forWhere, or forDoc.
 * @return {Object} A predicate string and an array of parameters.
 */
Readable.prototype.predicate = function (criteria, offset, kind, ...args) {
  if (_.isPlainObject(criteria) && _.isEmpty(criteria)) {
    return {
      predicate: 'TRUE',
      params: []
    };
  }

  if (Object.prototype.hasOwnProperty.call(criteria, 'conditions') && Object.prototype.hasOwnProperty.call(criteria, 'params')) {
    if (_.isPlainObject(criteria.where) && !_.isEmpty(criteria.where)) {
      // searchDoc can pass an alternate inner isDocument in the criteria
      let subWhere;

      if (Object.prototype.hasOwnProperty.call(criteria, 'isDocument')) {
        const innerKind = criteria.isDocument ? this.forDoc : this.forWhere;
        subWhere = this.predicate(criteria.where, criteria.params.length, innerKind);
      } else {
        subWhere = this.predicate(criteria.where, criteria.params.length, kind);
      }

      return {
        predicate: `${criteria.conditions} AND ${subWhere.predicate}`,
        params: criteria.params.concat(subWhere.params)
      };
    }

    return {
      predicate: criteria.conditions,
      params: criteria.params
    };
  }

  const assemblage = this.conjoin(criteria, offset, kind, ...args);

  assemblage.predicate = `${assemblage.predicates.join(' AND ')}`;

  return assemblage;
};

/**
 * Find the foreign key relationships which exist between this readable and its
 * parent in a join context.
 *
 * @param {Readable} parentReadable - The readable being joined to.
 * @param {String} parentAlias - The alias corresponding to parentReadable in
 * the current join tree.
 * @return {Array} A list of foreign key relationships represented as objects
 * mapping fields of this Readable to their corresponding fields in
 * `parentReadable`.
 */
Readable.prototype.findCandidateJoinKeys = function (parentReadable, parentAlias) {
  return _.chain(this.fks)
    .concat(parentReadable.fks)
    .compact()
    .reduce((allJoinPredicates, fk) => {
      // standardize the join criteria with the table being joined on the
      // left side regardless of the foreign key's directionality
      let leftColumns, rightColumns;

      if (fk.origin_schema === this.schema && fk.origin_name === this.name) {
        leftColumns = fk.origin_columns;
        rightColumns = fk.dependent_columns;
      } else if (fk.origin_schema === parentReadable.schema && fk.origin_name === parentReadable.name) {
        leftColumns = fk.dependent_columns;
        rightColumns = fk.origin_columns;
      }

      if (leftColumns && rightColumns) {
        // columns on the right side always belong to the parent relation
        // and must be prefixed with its alias for parseKey
        allJoinPredicates[fk.fk] = _.zipObject(leftColumns, rightColumns.map(c => `${parentAlias}.${c}`));
      }

      return allJoinPredicates;
    }, {})
    .toPairs()
    .value();
};

/**
 * Create a compound Readable by declaring other relations to attach. Queries
 * against the compound Readable will `JOIN` the attached relations and
 * decompose results into object trees automatically.
 *
 * Compound Readables are cached. If the same join plan is encountered
 * elsewhere, Massive will pull the compound Readable from the cache instead of
 * processing the definition again.
 *
 * @param {Object} definition - An object mapping relation paths (optional
 * schema and dot, required name) or aliases to objects defining the join `type`
 * (inner, left outer, etc); `on` mapping the foreign column(s) in the relation
 * being joined to the source column(s) in the relation being joined to; and an
 * optional `relation` path if an alias is used for the key. These objects may
 * be nested.
 * @return {Readable} The compound Readable.
 */
Readable.prototype.join = function (definition) {
  const name = murmurhash(`${this.path}.${JSON.stringify(definition)}`);

  if (Object.hasOwnProperty.call(this.db.entityCache, name)) {
    return this.db.entityCache[name];
  }

  // single table-to-table inner joins on a foreign key relationship can be
  // expressed just by giving the name of the table to join, but the reducer
  // still expects to see an object with the appropriate key and _some_ value
  if (_.isString(definition)) {
    definition = _.set({}, definition, true);
  }

  const seenAliases = [this.name];
  const primaryPk = (definition.pk ? _.castArray(definition.pk) : this.pk).map(this.aliasField, this);
  const decompositionSchema = {
    pk: primaryPk,
    columns: this.columns.reduce((map, c) => {
      map[this.aliasField(c.name)] = c.name;

      return map;
    }, {})
  };
  let schemaNodeParent = decompositionSchema;

  // if passed an explicit pk for a view at the root of the join tree, ensure
  // it doesn't get processed as part of that tree
  delete definition.pk;

  // This reducer is building several things at once, going node by node in the
  // definition tree:
  //
  // * the formal definition tree with standardized paths
  // * the decomposition schema tree, which has exactly the same shape as the
  // definition tree
  // * the list of member relations
  // * the list of involved columns from the member relations
  // * the list of seen aliases, to forestall reuse of same
  const reducer = (acc, val, key) => {
    // The original definition's keys each refer to a relation to be attached
    // in the compound Readable. However, they can refer to it in different
    // ways:
    //
    // * as a schema.relation path
    // * as a relation name alone, where the schema is db.currentSchema
    // * as an alias, in which case the definition must include either of the
    // above as a property `relation`
    //
    // The final definition reorganizes the original's properties to eliminate
    // the first category: all keys must be relation names or aliases.
    const lexed = parseKey.lex(val.relation || key);
    const relation = lexed.tokens.pop();
    const schema = lexed.tokens.length ? lexed.tokens.shift() : undefined;
    const alias = val.relation ? key : relation;
    const readable = _.get(this.db, _.compact([schema, relation]));

    if (!readable) {
      throw new Error(`Bad join definition: unknown database entity ${val.relation || key}.`);
    } else if (seenAliases.some(a => a === alias)) {
      throw new Error(`Bad join definition: ${alias} is repeated.`);
    } else if (!val.pk && !readable.pk) {
      throw new Error(`Missing explicit pk in join definition for ${alias}.`);
    }

    seenAliases.push(alias);

    // setting up for recursion: store the parent schema node pointer and
    // enter the "current" scope which defines the parent for any nested nodes
    const outerParent = schemaNodeParent;

    if (!val.omit) {
      // create this node in the parallel decomposition schema tree
      schemaNodeParent[alias] = {};

      const schemaNodeCurrent = schemaNodeParent[alias];

      schemaNodeCurrent.pk = (val.pk ? _.castArray(val.pk) : readable.pk).map(c => `${alias}__${c}`);
      schemaNodeCurrent.decomposeTo = val.decomposeTo;
      schemaNodeCurrent.columns = readable.columns.reduce((map, c) => {
        const columnAlias = `${alias}__${c.name}`;

        map[columnAlias] = c.name;

        return map;
      }, {});

      schemaNodeParent = schemaNodeCurrent;
    }

    // if not given an explicit join predicate, attempt to fall back on an
    // unambiguous foreign key relationship between the relations
    let on = val.on;

    if (!on) {
      const candidateFks = readable.findCandidateJoinKeys(val.parentReadable || this, val.parentAlias || this.delimitedFullName);

      switch (candidateFks.length) {
        case 1: on = candidateFks[0][1]; break;
        case 0: throw new Error(`An explicit 'on' mapping is required for ${val.relation || key}.`);
        default: throw new Error(`Ambiguous foreign keys for ${val.relation || key}. Define join keys explicitly.`);
      }
    }

    // standardize this node in the definition tree, recursing if necessary
    acc[alias] = _.reduce(val, (node, v, k) => {
      switch (k) {
        case 'type':
        case 'on':
        case 'schema':
        case 'relation':
        case 'pk':
        case 'omit':
        case 'parentReadable':
        case 'parentAlias':
        case 'decomposeTo':
          return node;
        default:
          // Any other property is a descendant definition node. Attach its
          // parent info and recurse, standardizing it and adding to the
          // current node.
          v.parentReadable = readable;
          v.parentAlias = alias;

          return reducer(node, v, k);
      }
    }, {
      schema,
      relation,
      alias,
      readable,
      type: val.type || 'INNER',
      on,
      joinRelations: [],
      joinColumns: []
    });

    // restore the parent schema node pointer
    schemaNodeParent = outerParent;

    // Add the join relation and its columns to the node accumulator. It's
    // stored there because we want the column order and JOIN order to match
    // the tree layout (a "pre-order" traversal: parents before children, in
    // sequence) -- Postgres won't toposort JOIN clauses for us. However, since
    // we're only ready to accumulate relations and columns _after_ the
    // recursive reduction, we're forced into a "post-order" traversal
    // (children first, parents as all their children are accumulated). To
    // restore the desired order, we accumulate descendant relations and columns
    // on the node and collect them after recursion.
    acc.joinRelations = _.concat(acc.joinRelations, [acc[alias]], acc[alias].joinRelations);
    acc.joinColumns = _.concat(acc.joinColumns, readable.columns.map(c => {
      return {
        schema: c.schema,
        parent: c.parent,
        name: c.name,
        fullName: `"${alias}"."${c.name}"`,
        alias: `${alias}__${c.name}`
      };
    }), acc[alias].joinColumns);

    // strictly speaking, only leftover joinRelations or joinColumns on the
    // origin node will cause problems, but it's better to keep things clean.
    delete acc[alias].joinRelations;
    delete acc[alias].joinColumns;

    return acc;
  };

  definition = _.reduce(definition, reducer, {
    joinRelations: [],
    joinColumns: this.columns.map(c => {
      c.alias = this.aliasField(c.name);

      return c;
    })
  });

  // this form of joinRelations is temporary; it's only declared here because
  // there has to be something to reference in the `clone` construction just
  // below. Before the compound Readable is fully finished, `joinRelations` will
  // be augmented with additional information about each attached relation.
  let joinRelations = definition.joinRelations;
  const joinColumns = definition.joinColumns;

  delete definition.joinRelations;
  delete definition.joinColumns;

  const clone = new Proxy(this, {
    get: (target, prop) => {
      switch (prop) {
        case 'loader': return 'join';
        case 'joins': return joinRelations;
        case 'columns': return joinColumns;
      }

      if (
        typeof target[prop] === 'function' &&
        ['find', 'findOne', 'search', 'where'].indexOf(prop) > -1
      ) {
        // apply a decomposition schema to the options argument for all
        // non-document non-count Readable functions
        return new Proxy(target[prop], {
          apply: (fn, thisArg, args) => {
            const optionsIdx = prop === 'where' ? 2 : 1;
            const optionsObj = args[optionsIdx] || {};
            const override = optionsObj.decompose;

            args[optionsIdx] = _.assign(optionsObj, {
              decompose: override || decompositionSchema
            });

            return fn.apply(thisArg, args);
          }
        });
      }

      return target[prop];
    }
  });

  let offset = 0;

  joinRelations = joinRelations.map(joinRelation => {
    // Build the ON clause ahead of time, since JOIN criteria for a given
    // compound Readable never change. Since parseKey only looks to compound
    // Readables for alternate schema/relation paths, this has to happen after
    // instantiation of the clone.
    const delimitedAlias = quote(joinRelation.alias);

    joinRelation.target = delimitedAlias === joinRelation.readable.delimitedFullName ?
      delimitedAlias :
      `${joinRelation.readable.delimitedFullName} AS ${delimitedAlias}`;
    joinRelation.on = clone.predicate(joinRelation.on, offset, this.forJoin, joinRelation.alias);

    offset += joinRelation.on.params.length;

    return joinRelation;
  });

  this.db.entityCache[name] = clone;

  return clone;
};

module.exports = Readable;
