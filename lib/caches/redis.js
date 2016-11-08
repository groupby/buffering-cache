const Redis = require('ioredis');

const RedisCache = function(host, port, db = 0){
  const self = this;

  if (typeof host !== 'string' || host.length < 1) {
    throw new Error('host must be a string with length');
  }

  if (typeof port !== 'number' || port < 0 || port > 65535) {
    throw new Error('port must be a number between 0 of 65535');
  }

  if (typeof db !== 'number' || db < 0) {
    throw new Error('db must be a number gte than 0');
  }

  const redis = new Redis({
    host: host,
    port: port,
    db: db
  });

  self.setex = (key, ttl, value) => redis.setex(key, ttl, value);
  self.get = (key) => redis.get(key);
  self.delete = (key) => redis.delete(key);
  self.ttl = (key) => redis.ttl(key);

  return self;
};

module.exports = RedisCache;