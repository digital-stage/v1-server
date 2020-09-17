import * as dotenv from "dotenv";
import * as fs from "fs";
import * as pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

if (process.env.ENV_PATH) {
    logger.debug("Using custom environment file at " + process.env.ENV_PATH);
    const envConfig = dotenv.parse(fs.readFileSync(process.env.ENV_PATH));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    dotenv.config();
}

export const PORT: number | string = process.env.PORT || 4000;
export const MONGO_URL: string = process.env.MONGO_URL || "mongodb://127.0.0.1:4321/digitalstage";
export const USE_REDIS: boolean = (process.env.USE_REDIS && process.env.USE_REDIS === "true") || false;
export const REDIS_HOSTNAME: string = process.env.REDIS_HOSTNAME || "localhost";
export const REDIS_PORT: number | string = process.env.REDIS_PORT || 25061;
export const REDIS_PASSWORD: string = process.env.REDIS_PASSWORD || "";
export const DEBUG_PAYLOAD: boolean = (process.env.DEBUG_PAYLOAD && process.env.DEBUG_PAYLOAD === "true") || false;
export const AUTH_SERVER_URL: string = process.env.AUTH_URL || "http://localhost:5000";