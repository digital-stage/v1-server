module.exports = {
    apps: [{
        name: "server",
        script: "dist/index.js",

        // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production',
            LOG_LEVEL: 'debug',
            PORT: 4000,
            USE_SSL: false,
            AUTH_URL: 'https://auth.api.digital-stage.org',
            MONGO_URL: 'mongodb://10.114.0.4:27017/digitalstage',
            USE_REDIS: true,
            REDIS_HOSTNAME: 'private-api-db-redis-do-user-7336329-0.b.db.ondigitalocean.com',
            REDIS_PORT: 25061,
        }
    }],

    deploy: {
        production: {
            user: 'node',
            host: 'api.digital-stage.org',
            ref: 'origin/master',
            repo: "https://github.com/digital-stage/server.git",
            path: '/node/server',
            env: {
                NODE_ENV: 'production',
                PORT: '4000',
                LOG_LEVEL: 'debug',
                USE_SSL: false,
                AUTH_URL: 'https://auth.api.digital-stage.org',
                MONGO_URL: 'mongodb://10.114.0.4:27017/digitalstage',
                REDIS_HOSTNAME: 'private-api-db-redis-do-user-7336329-0.b.db.ondigitalocean.com',
                REDIS_PORT: 25061,
            },
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
        }
    }
};
