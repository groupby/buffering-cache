const Promise = require('bluebird');
const log     = require('../logger');

const COMMAND_TIMEOUT_MS = 50;

const Cache = function (params) {
  const self = this;

  const store     = params.store;
  const ttl       = params.ttl;
  const bufferTtl = params.bufferTtl || 0;
  const timeout   = COMMAND_TIMEOUT_MS;

  validateStore(store);

  if (typeof ttl !== 'number' || ttl < 0) {
    throw new Error('ttl must be a number greater than 0');
  }

  if (typeof bufferTtl !== 'number' || bufferTtl < 0 || bufferTtl > ttl) {
    throw new Error('if provided, bufferTtl must be a number between 0 and ttl');
  }

  self.get = (key) => {
    return failSafeFunction('get', [key]);
  };

  self.setpx = (key, value, overrideTtl = null) => {
    return failSafeFunction('setpx', [
      key,
      value,
      overrideTtl || ttl
    ]);
  };

  if (store.setnx) {
    self.setnx = (key, value, overrideTtl = null) => {
      return failSafeFunction('setnx', [
        key,
        value,
        overrideTtl || ttl
      ]);
    };
  }

  self.delete = (key) => {
    return failSafeFunction('delete', [key]);
  };

  if (store.pttl) {
    self.pttl = (key) => {
      return failSafeFunction('pttl', [key]);
    };
  }

  const failSafeFunction = (action, args) => {
    try {
      return Promise.resolve(store[action](...args))
        .timeout(timeout)
        .catch((err) => log.warn(`Error during '${action}'. Error: ${err}`));
    } catch (err) {
      return Promise.resolve();
    }
  };

  return self;
};

const validateStore = (client) => {
  if (typeof client !== 'object') {
    throw new Error('client must be an object');
  }

  if (typeof client.get !== 'function' || client.get.length < 1) {
    throw new Error('client.get must be a function that takes a parameter for key');
  }

  if (typeof client.setpx !== 'function' || client.setpx.length < 3) {
    throw new Error('client.setpx must be a function that takes parameters for key, value, and ttl in milliseconds');
  }

  if (client.setnx && (typeof client.setnx !== 'function' || client.setnx.length < 3)) {
    throw new Error('if provided, client.setnx must be a function that takes parameters for key, value, and ttl in milliseconds');
  }

  if (typeof client.delete !== 'function' || client.delete.length < 1) {
    throw new Error('client.delete must be a function that takes a parameter for key');
  }

  if (client.pttl && (typeof client.pttl !== 'function' || client.pttl.length < 1)) {
    throw new Error('client.pttl must be a function that takes a parameter for key');
  }
};

module.exports = Cache;