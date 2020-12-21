import * as ip from 'ip';
import * as uWS from 'teckos/uws';
import { UWSProvider } from 'teckos';
import debug from 'debug';
import HttpService from './http/HttpService';
import MongoRealtimeDatabase from './database/MongoRealtimeDatabase';
import DefaultAuthentication from './auth/DefaultAuthentication';
import { IAuthentication } from './auth/IAuthentication';
import SocketHandler from './handlers/SocketHandler';
import {
  DEBUG_PAYLOAD,
  MONGO_DB, MONGO_URL, PORT, REDIS_URL,
} from './env';

const d = debug('Server');
const warn = d.extend('warn');

if (DEBUG_PAYLOAD) warn('[WARN] Debugging payloads');

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
  .then(() => warn(`Removed all devices of ${serverAddress} first`));

const init = async () => database.connect(MONGO_DB)
  .then(() => handler.init())
  .then(() => httpService.init(uws))
  .then(() => resetDevices())
  .then(() => io.listen(parseInt(PORT, 10)));

d('[SERVER] Starting ...');
init()
  .then(() => d(`[SERVER] DONE, running on port ${PORT}`))
  .catch((error) => d(`[SERVER] Could not start:\n${error}`));
