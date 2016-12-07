/*eslint no-console: "off" */
const checker = require('gb-license-check');

const PACKAGE_WHITELIST = {
  'flexbuffer': ['^0.0.6'], // Has MIT license https://github.com/mercadolibre/flexbuffer-node/blob/master/LICENSE
  'log-driver': ['^1.2.5'], // Has ISC license https://github.com/cainus/logdriver/blob/master/LICENSE
  'tweetnacl':  ['^0.14.3'] // Has unlimited license https://github.com/dchest/tweetnacl-js/blob/master/COPYING.txt
};

checker.run(PACKAGE_WHITELIST, (err) => {
  if (err) {
    console.error('ERROR: Unknown licenses found');
    process.exit(1);
  }

  console.log('License check successful');
});