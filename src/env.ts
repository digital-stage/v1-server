import * as dotenv from "dotenv";
import * as fs from "fs";
import * as pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

export const parseEnv = () => {
    if (process.env.ENV_PATH) {
        logger.debug("Using custom environment file at " + process.env.ENV_PATH);
        const envConfig = dotenv.parse(fs.readFileSync(process.env.ENV_PATH));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    } else {
        dotenv.config();
    }
}