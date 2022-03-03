#!/usr/bin/env node

/* eslint-disable no-console */

'use strict';

const path = require('path');
const program = require('commander');
const repl = require('repl');
const pkg = require('../package.json');
const massive = require('../index');

program
  .version(pkg.version)
  .option('-d, --database [name]', 'Quick connect with just a local database name')
  .option('-c, --connection [string]', 'Provide a full connection string (postgres://user:password@server/db)')
  .option('-s, --scripts [dir]', 'Change the scripts directory (default ./db)', 'db')
  .parse(process.argv);

const opts = program.opts();

if (opts.database) {
  opts.connection = `postgres://localhost/${opts.database}`;  // assume local user has rights
} else if (!opts.connection) {
  program.help();
  process.exit(1);
}

console.log(path.resolve(opts.scripts));

massive({connectionString: opts.connection}, {scripts: path.resolve(opts.scripts)}).then(db => {
  console.log('Massive loaded and listening');

  const r = repl.start({
    prompt: 'db > ',
    eval: (cmd, ctx, f, callback) => {
      const result = eval(cmd);

      if (result && result.then) {
        return result.then(val => callback(null, val)).catch(err => callback(err));
      }

      return callback(null, result);
    }
  });

  r.context.db = db;
  r.on('exit', () => {
    process.exit(0);
  });
}).catch(err => {
  console.log(`Failed loading Massive: ${err}`);
  process.exit(1);
});
