module.exports = {
    apps: [{
        name: "server",
        script: "dist/index.js",

        // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
    }],

    deploy: {
        production: {
            user: 'node',
            host: 'api.digital-stage.org',
            ref: 'origin/master',
            repo: "https://github.com/digital-stage/server.git",
            path: '/node/server',
            node_args : '-r dotenv/config',
            'post-deploy': 'npm install && cp ~/.env .env && source .env && npm run build && pm2 reload ecosystem.config.js'
        }
    }
};
