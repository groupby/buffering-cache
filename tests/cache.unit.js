'use strict';

/* eslint-disable no-unused-vars, no-use-before-define, no-unused-expressions */

const Promise = require('bluebird');
const { expect } = require('chai');

const log = require('../logger');

log.level('debug');

const Cache = require('../lib/cache');

describe('cache', () => {
  it('accepts the minimum number of parameters', () => {
    expect(() => new Cache({
      store: {
        get: (key) => {},
        setpx: (key, value, ttl) => {},
        delete: (key) => {},
        client: {},
      },
      ttl: 500,
    })).not.to.throw();
  });

  it('returns undefined if the timeout expires', (done) => {
    const cache = new Cache({
      store: {
        get: (key) => Promise.delay(100),
        setpx: (key, value, ttl) => {},
        delete: (key) => {},
        client: {},
      },
      ttl: 500,
    });

    cache.get('yo')
      .then((response) => {
        expect(response).to.be.undefined;
        done();
      })
      .catch((err) => done(err || 'fail'));
  });

  it('returns undefined if the method throws', (done) => {
    const cache = new Cache({
      store: {
        get: (key) => {
          throw new Error('boom');
        },
        setpx: (key, value, ttl) => {},
        delete: (key) => {},
        client: {},
      },
      ttl: 500,
    });

    cache.get('yo')
      .then((response) => {
        expect(response).to.be.undefined;
        done();
      })
      .catch((err) => done(err || 'fail'));
  });

  it('rejects invalid params', () => {
    expect(() => new Cache()).to.throw(/object/);
    expect(() => new Cache({})).to.throw(/object/);
    expect(() => new Cache({ store: {} })).to.throw(/store.client/);
    expect(() => new Cache({
      store: {
        client: {},
      },
    })).to.throw(/store.get/);

    expect(() => new Cache({
      store: {
        client: {},
        get: () => {},
      },
    })).to.throw(/store\.get/);

    expect(() => new Cache({
      store: {
        client: {},
        get: (key) => {},
      },
    })).to.throw(/store\.setpx/);

    expect(() => new Cache({
      store: {
        client: {},
        get: (key) => {},
        setpx: () => {},
      },
    })).to.throw(/store\.setpx/);

    expect(() => new Cache({
      store: {
        client: {},
        get: (key) => {},
        setpx: (key, value, ttl) => {},
      },
    })).to.throw(/store\.delete/);

    expect(() => new Cache({
      store: {
        client: {},
        get: (key) => {},
        setpx: (key, value, ttl) => {},
        delete: () => {},
      },
    })).to.throw(/store\.delete/);

    expect(() => new Cache({
      store: {
        client: {},
        get: (key) => {},
        setpx: (key, value, ttl) => {},
        delete: (key) => {},
      },
    })).to.throw(/ttl/);

    expect(() => new Cache({
      store: {
        client: {},
        get: (key) => {},
        setpx: (key, value, ttl) => {},
        delete: (key) => {},
        setnx: 'yo',
      },
    })).to.throw(/setnx/);

    expect(() => new Cache({
      store: {
        client: {},
        get: (key) => {},
        setpx: (key, value, ttl) => {},
        delete: (key) => {},
        pttl: 'yo',
      },
    })).to.throw(/pttl/);

    expect(() => new Cache({
      store: {
        client: {},
        get: (key) => {},
        setpx: (key, value, ttl) => {},
        delete: (key) => {},
      },
      ttl: 30,
      bufferTtl: -1,
    })).to.throw(/bufferTtl/);
  });
});
