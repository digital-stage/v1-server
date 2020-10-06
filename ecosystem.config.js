module.exports = {
    apps: [{
        name: "server",
        script: "dist/index.js",
        params: "",

        // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
        instances: 1,
        autorestart: true,
        watch: false,
        env_production: {
            "NODE_ENV": "production",
            "ENV_PATH": "/home/node/.env",
        },
        max_memory_restart: '1G',
    }],

    deploy: {
        production: {
            user: 'node',
            host: 'api.digital-stage.org',
            ref: 'origin/master',
            repo: "https://github.com/digital-stage/server.git",
            path: '/node/server',
            env: {
                "NODE_ENV": "production",
                "ENV_PATH": "/home/node/.env",
            },
            'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env production'
        }
    }
};
