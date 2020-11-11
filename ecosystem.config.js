module.exports = {
		apps: [{
				name: "server",
				script: "dist/index.js",
				params: "",

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
						env: {
								"NODE_ENV": process.env.NODE_ENV,
								"PORT": process.env.PORT,
								"AUTH_URL": process.env.AUTH_URL,
								"MONGO_URL": process.env.MONGO_URL,
								"MONGO_DB": process.env.MONGO_DB,
								"USE_REDIS": process.env.USE_REDIS,
								"REDIS_URL":  process.env.REDIS_URL,
								"DEBUG_PAYLOAD":  process.env.DEBUG_PAYLOAD,
						},
						'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env production'
				}
		}
};
