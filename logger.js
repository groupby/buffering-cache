'use strict';

const bunyan = require('bunyan');
const PrettyStream = require('bunyan-prettystream');

const prettyStdOut = new PrettyStream({ mode: 'dev' });
prettyStdOut.pipe(process.stdout);
const pjson = require('./package.json');

module.exports = bunyan.createLogger({
  name: pjson.name.replace(/^@[a-zA-Z0-9-]+\//g, ''),
  streams: [
    {
      type: 'raw',
      level: 'info',
      stream: prettyStdOut,
    },
  ],
});
