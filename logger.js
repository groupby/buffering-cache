const bunyan       = require('bunyan');
const PrettyStream = require('bunyan-prettystream');
const prettyStdOut = new PrettyStream({mode: 'dev', useColor: false});
prettyStdOut.pipe(process.stdout);

const pjson = require('./package.json');

module.exports = bunyan.createLogger({
    name:    pjson.name,
    streams: [
        {
            type:   'raw',
            level:  'info',
            stream: prettyStdOut
        }
    ]
});