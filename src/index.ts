import * as pino from 'pino';
import * as express from 'express';
import * as cors from 'cors';
import * as core from 'express-serve-static-core';
import * as ip from 'ip';
import * as uWebSocket from 'uWebSockets.js';
import HttpService from './http/HttpService';
import parseEnv from './env';
import SocketHandler from './uwebsocket/SocketHandler';
import MongoRealtimeDatabase from './database/MongoRealtimeDatabase';
import DefaultAuthentication from './auth/DefaultAuthentication';
import { IAuthentication } from './auth/IAuthentication';

parseEnv();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const serverAddress = `${ip.address()}:${process.env.PORT}`;

const server: uWebSocket.TemplatedApp = uWebSocket.App();

server.ws();

const database = new MongoRealtimeDatabase(server, process.env.MONGO_URL);
const auth: IAuthentication = new DefaultAuthentication(database);
const handler = new SocketHandler(serverAddress, database, auth, io);
const httpService = new HttpService(database, auth);

const resetDevices = () => database.readDevicesByServer(serverAddress)
  .then((devices) => devices.map((device) => database.deleteDevice(device._id)))
  .then(() => logger.warn(`Removed all devices of ${serverAddress} first`));

const init = async () => database.connect(process.env.MONGO_DB)
  .then(() => handler.init())
  .then(() => httpService.init(server))
  .then(() => resetDevices())
  .then(() => server.listen(process.env.PORT));

logger.info('[SERVER] Starting ...');
init()
  .then(() => logger.info(`[SERVER] DONE, running on port ${process.env.PORT}`))
  .catch((error) => logger.error(`[SERVER] Could not start:\n${error}`));
