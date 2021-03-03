import * as ip from "ip";
import * as uWS from "teckos/uws";
import { UWSProvider } from "teckos";
import HttpService from "./http/HttpService";
import MongoRealtimeDatabase from "./database/MongoRealtimeDatabase";
import DefaultAuthentication from "./auth/DefaultAuthentication";
import { IAuthentication } from "./auth/IAuthentication";
import SocketHandler from "./socket/SocketHandler";
import {
  DEBUG_PAYLOAD,
  MONGO_CA,
  MONGO_DB,
  MONGO_URL,
  PORT,
  REDIS_URL,
} from "./env";
import logger from "./logger";

declare global {
  namespace NodeJS {
    interface Global {
      __rootdir__: string;
    }
  }
}

const { warn, error, info } = logger("A");

if (DEBUG_PAYLOAD) warn("[WARN] Debugging payloads");

const serverAddress = `${ip.address()}:${PORT}`;

const uws = uWS.App();
const io = new UWSProvider(uws, {
  redisUrl: REDIS_URL,
});

const database = new MongoRealtimeDatabase(io, MONGO_URL, MONGO_CA);
const auth: IAuthentication = new DefaultAuthentication(database);

const init = async () =>
  database
    .connect(MONGO_DB)
    .then(() =>
      // Clean up
      database.cleanUp(serverAddress)
    )
    .then(() => new SocketHandler(serverAddress, database, auth, io))
    .then(() => new HttpService(database, auth).init(uws))
    .then(() => io.listen(parseInt(PORT, 10)))
    .catch((e) => error(e));

info("Starting ...");
init()
  .then(() => info(`DONE, running on port ${PORT}`))
  .catch((e) => info(`Could not start:\n${e}`));
