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
                PORT: '',
                LOG_LEVEL: 'debug',
                USE_SSL: false,
                AUTH_URL: 'https://auth.api.digital-stage.org',
                MONGO_URL: 'mongodb://localhost:4321/digitalstage',
                USE_REDIS: true,
                REDIS_HOSTNAME: 'localhost',
                REDIS_PORT: '25061',
                REDIS_PASSWORD: ''
            },
            'post-deploy': 'source .env && npm install && npm run build && pm2 reload ecosystem.config.js --env production --update-env'
        }
    }
};
