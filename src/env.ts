import { config } from 'dotenv';

config();

const {
  MONGO_URL, REDIS_URL, MONGO_DB, PORT, AUTH_URL,
} = process.env;

const USE_REDIS = process.env.USE_REDIS && process.env.USE_REDIS === 'true';
const DEBUG_EVENTS = process.env.DEBUG_EVENTS && process.env.DEBUG_EVENTS === 'true';
const DEBUG_PAYLOAD = process.env.DEBUG_PAYLOAD && process.env.DEBUG_PAYLOAD === 'true';

export {
  MONGO_URL,
  REDIS_URL,
  MONGO_DB,
  PORT,
  USE_REDIS,
  DEBUG_PAYLOAD,
  DEBUG_EVENTS,
  AUTH_URL,
};
