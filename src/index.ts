import * as ip from "ip";
import * as uWS from "teckos/uws";
import { UWSProvider } from "teckos";
import debug from "debug";
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

const d = debug("Server");
const warn = d.extend("warn");
const err = d.extend("error");

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
    .catch((error) => err(error));

d("[SERVER] Starting ...");
init()
  .then(() => d(`[SERVER] DONE, running on port ${PORT}`))
  .catch((error) => d(`[SERVER] Could not start:\n${error}`));
