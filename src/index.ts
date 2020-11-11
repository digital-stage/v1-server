import * as pino from 'pino';
import * as ip from 'ip';
import {config} from 'dotenv';
import * as uWS from 'uWebSockets.js';
import {UWSProvider} from 'teckos';
import HttpService from './http/HttpService';
import MongoRealtimeDatabase from './database/MongoRealtimeDatabase';
import DefaultAuthentication from './auth/DefaultAuthentication';
import {IAuthentication} from './auth/IAuthentication';
import SocketHandler from './handlers/SocketHandler';

config();

const {MONGO_URL, REDIS_URL, MONGO_DB} = process.env;
const PORT: number = parseInt(process.env.PORT, 10);

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const serverAddress = `${ip.address()}:${PORT}`;

const uws = uWS.App();
const io = new UWSProvider(uws, {
  redisUrl: REDIS_URL,
});

const database = new MongoRealtimeDatabase(io, MONGO_URL);
const auth: IAuthentication = new DefaultAuthentication(database);
const handler = new SocketHandler(serverAddress, database, auth, io);
const httpService = new HttpService(database, auth);

const resetDevices = () => database.readDevicesByServer(serverAddress)
  .then((devices) => devices.map((device) => database.deleteDevice(device._id)))
  .then(() => logger.warn(`Removed all devices of ${serverAddress} first`));

const init = async () => database.connect(MONGO_DB)
  .then(() => handler.init())
  .then(() => httpService.init(uws))
  .then(() => resetDevices())
  .then(() => io.listen(PORT));

logger.info('[SERVER] Starting ...');
init()
  .then(() => logger.info(`[SERVER] DONE, running on port ${PORT}`))
  .catch((error) => logger.error(`[SERVER] Could not start:\n${error}`));
