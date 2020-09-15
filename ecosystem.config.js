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
            PORT: '4000',
            USE_SSL: false,
            SSL_CRT: '/etc/letsencrypt/live/api.digital-stage.org/fullchain.pem',
            SSL_KEY: '/etc/letsencrypt/live/api.digital-stage.org/privkey.pem',
            AUTH_URL: 'https://auth.api.digital-stage.org',
            MONGO_URL: 'mongodb://10.114.0.4:27017/digitalstage'
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
                USE_SSL: false,
                SSL_CRT: '/etc/letsencrypt/live/api.digital-stage.org/fullchain.pem',
                SSL_KEY: '/etc/letsencrypt/live/api.digital-stage.org/privkey.pem',
                AUTH_URL: 'https://auth.api.digital-stage.org',
                MONGO_URL: 'mongodb://10.114.0.4:27017/digitalstage'
            },
            'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
        }
    }
};
