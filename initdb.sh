#!/bin/sh
# REDIS
ssh -L 6380:localhost:6380 ds-router -f -N
# MongoDB
ssh -L 27017:localhost:4321 ds-router -f -N
