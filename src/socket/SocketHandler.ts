import { ITeckosProvider, ITeckosSocket } from "teckos";
import MongoRealtimeDatabase from "../database/MongoRealtimeDatabase";
import { IAuthentication } from "../auth/IAuthentication";
import { Device, Router } from "../types";
import { API_KEY } from "../env";
import SocketUserHandler from "./user/SocketUserHandler";
import SocketRouterHandler from "./router/SocketRouterHandler";
import logger from "../logger";

const { error } = logger("socket");

interface RouterConnectionPayload {
  apiKey: string;
  router?: Omit<Router, "_id">;
}

interface UserConnectionPayload {
  token: string;
  device?: Partial<Device>;
}

class SocketHandler {
  private readonly _io: ITeckosProvider;

  private readonly _userHandler: SocketUserHandler;

  private readonly _routerHandler: SocketRouterHandler;

  constructor(
    serverAddress,
    database: MongoRealtimeDatabase,
    authentication: IAuthentication,
    io: ITeckosProvider
  ) {
    this._io = io;
    this._io.onConnection(this.handleConnection);
    this._userHandler = new SocketUserHandler(
      serverAddress,
      database,
      authentication
    );
    this._routerHandler = new SocketRouterHandler(serverAddress, database);
  }

  private handleConnection = (socket: ITeckosSocket) => {
    socket.on("router", (payload: RouterConnectionPayload) => {
      const { apiKey, router } = payload;
      if (apiKey) {
        // A router is trying to connect
        if (apiKey === API_KEY) {
          return this._routerHandler.handle(socket, router).catch((err) => {
            error(`Router handler reported error: ${err}`);
            socket.disconnect();
          });
        }
        error(`Router ${router.url} tried to sign in with wrong api key`);
      } else {
        error(`Router ${router.url} dit not provide any api key`);
      }
      return socket.disconnect();
    });

    socket.on("token", (payload: UserConnectionPayload) => {
      const { token, device } = payload;
      if (token) {
        return this._userHandler.handle(socket, token, device).catch(() => {
          socket.disconnect();
        });
      }
      return socket.disconnect();
    });
  };
}

export default SocketHandler;
