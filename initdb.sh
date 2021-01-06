#!/bin/sh
# MongoDB
ssh -L 27017:localhost:27017 aws-single -f -N
