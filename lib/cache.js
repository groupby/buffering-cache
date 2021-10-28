const Promise = require('bluebird');
const log     = require('../logger');
const _       = require('lodash');

const COMMAND_TIMEOUT_MS = 50;

const Cache = function (params) {
    const self = this;

    if (typeof params !== 'object') {
        throw new Error('params must be an object');
    }

    const store     = params.store;
    const ttl       = params.ttl;
    const bufferTtl = params.bufferTtl || 0;
    const timeout   = COMMAND_TIMEOUT_MS;

    validateStore(store);

  // Add a parameter getter after lunch
    self.client = params.store.client;

    if ((!_.isNumber(ttl) && !_.isFunction(ttl)) || ttl < 0) {
        throw new Error('ttl must be a number greater than 0 or a function which returns a number greater than 0');
    }

    if (!_.isNumber(bufferTtl) || bufferTtl < 0 || bufferTtl > ttl) {
        throw new Error('if provided, bufferTtl must be a number between 0 and ttl');
    }
    self.getParams = () => {
        return params;
    };

    self.getTtl = () => {
        const ttlToUse = _.isFunction(ttl) ? ttl() : ttl;

        if (!_.isNumber(ttlToUse)) {
            throw new Error('ttl must be a number greater than 0 or a function which returns a number greater than 0');
        }
        return ttlToUse;
    }

    self.get = (key) => {
        return failSafeFunction('get', [key]);
    };

    self.setpx = (key, value, overrideTtl = null) => {
        return failSafeFunction('setpx', [
            key,
            value,
            overrideTtl || self.getTtl()
        ]);
    };

    if (store.setnx) {
        self.setnx = (key, value, overrideTtl = null) => {
            return failSafeFunction('setnx', [
                key,
                value,
                overrideTtl || self.getTtl()
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

const validateStore = (store) => {
    if (typeof store !== 'object') {
        throw new Error('store must be an object');
    }

    if (typeof store.client !== 'object') {
        throw new Error('store.client must be an object');
    }

    if (typeof store.get !== 'function' || store.get.length < 1) {
        throw new Error('store.get must be a function that takes a parameter for key');
    }

    if (typeof store.setpx !== 'function' || store.setpx.length < 3) {
        throw new Error('store.setpx must be a function that takes parameters for key, value, and ttl in milliseconds');
    }

    if (typeof store.delete !== 'function' || store.delete.length < 1) {
        throw new Error('store.delete must be a function that takes a parameter for key');
    }

    if (store.setnx && (typeof store.setnx !== 'function' || store.setnx.length < 3)) {
        throw new Error('if provided, store.setnx must be a function that takes parameters for key, value, and ttl in milliseconds');
    }

    if (store.pttl && (typeof store.pttl !== 'function' || store.pttl.length < 1)) {
        throw new Error('store.pttl must be a function that takes a parameter for key');
    }
};

module.exports = Cache;