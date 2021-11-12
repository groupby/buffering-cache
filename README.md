# buffering-cache

![example workflow](https://github.com/groupby/buffering-cache/actions/workflows/node.js.yml/badge.svg)

Cache a little cold? Cache misses slowing you down?

`buffering-cache` keeps your cache warm asynchronously upto the hour. Minimizing cache misses and keeping the entries from becoming stale.

Currently works with Redis only. Requires an 'ioredis' Redis client to be provided. 

## Installation:
```bash
npm install --save buffering-cache
```

## Simple Example:
```javascript
const BufferingCache = require('buffering-cache');
const rp = require('request-promise');
const Redis = require('ioredis');

const bufferingCache = new BufferingCache({
  // Required:
  redisClient: new Redis({
    host: 'localhost',
    port: 6379,
    db: 0,
  }),
  ttlMsec: 5000, // Redis ttl. Must be a number gte 0
});

const rawFunction = () => rp('http://www.google.com');

const bufferedAndCachedFunction = bufferingCache.wrapFunction(rawFunction);

bufferedAndCachedFunction()
.then((response) => {
  // No cache yet
  // 'response' returned after round-trip to google.com. 
})
.delay(3000) // Wait a bit 
.then(() => {
  return bufferedAndCachedFunction();
})
.then(() => {
  // Returns results from cache
  // So at 3000 ms the cache returns the result
  return bufferedAndCachedFunction();
})
.delay(3000)
.then(() => {
  // Results from cache expire. 
  // This time returns the result from google.com.
  // Refreshes the cache again
  return bufferedAndCachedFunction();
})
```
