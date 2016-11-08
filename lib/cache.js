const Promise = require('bluebird');
const log     = require('../logger');

const Cache = function (params) {
  const self = this;

  const store = params.store;
  const ttl = params.ttl;
  const bufferTtlFactor = params.bufferTtlFactor || 1;
  const timeout = params.timeout || 50;

  validateStore(store);

  if (typeof ttl !== 'number' || ttl < 0) {
    throw new Error('ttl must be a number greater than 0');
  }

  if (bufferTtlFactor && (typeof bufferTtlFactor !== 'number' || bufferTtlFactor < 0 || bufferTtlFactor > 1)) {
    throw new Error('if provided, bufferTtlFactor must be a number between 0 and 1');
  }

  if (typeof timeout !== 'number' || timeout < 0) {
    throw new Error('timeout must be a positive number');
  }

  self.get = (key) => {
    return failSafeFunction('get', [key]);
  };

  self.set = (key, value) => {
    return failSafeFunction('setex', [
      key,
      ttl,
      value
    ]);
  };

  self.delete = (key) => {
    return failSafeFunction('delete', [key]);
  };

  self.ttl = (key) => {
    return failSafeFunction('ttl', [key]);
  };

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

  if (typeof client.setex !== 'function' || client.setex.length < 3) {
    throw new Error('client.setex must be a function that takes parameters for key, value, and ttl in seconds');
  }

  if (typeof client.delete !== 'function' || client.delete.length < 1) {
    throw new Error('client.delete must be a function that takes a parameter for key');
  }

  if (typeof client.ttl !== 'function' || client.ttl.length < 1) {
    throw new Error('client.ttl must be a function that takes a parameter for key');
  }
};

module.exports = Cache;