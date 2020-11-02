import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const parseEnv = () => {
  if (process.env.ENV_PATH) {
    logger.debug(`Using custom environment file at ${process.env.ENV_PATH}`);
    const envConfig = dotenv.parse(fs.readFileSync(process.env.ENV_PATH));
    Object.keys(envConfig).forEach((k) => {
      process.env[k] = envConfig[k];
    });
  } else {
    dotenv.config();
  }
};

export default parseEnv;
