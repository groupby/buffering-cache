#!/usr/bin/env bash
docker rm -f redis
set -e
docker run -d -p 6379:6379 --name redis redis