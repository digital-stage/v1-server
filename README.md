# server
Stage and device server for digital-stage.org




# docker usage for development

First run `docker-compose build` to build.

`docker-compuse up -d` starts a mongodb (ephemeral) and the server.

If the container should be run with `docker run` instead of 'docker-compose' it is import to set `--init`