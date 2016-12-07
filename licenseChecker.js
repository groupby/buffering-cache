/*eslint no-console: "off" */
const checker = require('gb-license-check');

const PACKAGE_WHITELIST = {
  'bitsyntax': [
    '^0.0.4'  // Has MIT license https://github.com/squaremo/bitsyntax-js/blob/master/LICENSE-MIT
  ],
  'commander': [
    '^0.6.1',
    '^2.3.0'
  ], // MIT license https://github.com/tj/commander.js/blob/master/LICENSE
  'map-stream':     ['^0.1.0'], // MIT license https://github.com/dominictarr/map-stream/blob/master/LICENCE
  'buffers':        ['^0.1.1'], // Says MIT in the package.json
  'flexbuffer':     ['^0.0.6'], // Has MIT license https://github.com/mercadolibre/flexbuffer-node/blob/master/LICENSE
  'log-driver':     ['^1.2.5'], // Has ISC license https://github.com/cainus/logdriver/blob/master/LICENSE
  'path-is-inside': ['^1.0.2'], // Has MIT/WTFPL https://github.com/domenic/path-is-inside/blob/master/LICENSE.txt
  'tweetnacl':      ['^0.14.3'] // Has unlimited license https://github.com/dchest/tweetnacl-js/blob/master/COPYING.txt
};

checker.run(PACKAGE_WHITELIST, (err) => {
  if (err) {
    console.error('ERROR: Unknown licenses found');
    process.exit(1);
  }

  console.log('License check successful');
});