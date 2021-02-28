import { config } from "dotenv";
import * as fs from "fs";

config();

const {
  MONGO_URL,
  REDIS_URL,
  MONGO_DB,
  PORT,
  AUTH_URL,
  API_KEY,
  SENTRY_DSN,
} = process.env;

const MONGO_CA = process.env.MONGO_CA
  ? [fs.readFileSync(process.env.MONGO_CA)]
  : undefined;
const USE_REDIS = process.env.USE_REDIS && process.env.USE_REDIS === "true";
const USE_SENTRY = process.env.USE_SENTRY && process.env.USE_SENTRY === "true";
const DEBUG_EVENTS =
  process.env.DEBUG_EVENTS && process.env.DEBUG_EVENTS === "true";
const DEBUG_PAYLOAD =
  process.env.DEBUG_PAYLOAD && process.env.DEBUG_PAYLOAD === "true";

export {
  API_KEY,
  MONGO_URL,
  REDIS_URL,
  MONGO_DB,
  PORT,
  USE_REDIS,
  DEBUG_PAYLOAD,
  DEBUG_EVENTS,
  AUTH_URL,
  MONGO_CA,
  USE_SENTRY,
  SENTRY_DSN,
};
