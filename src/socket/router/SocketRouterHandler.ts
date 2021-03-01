import { ITeckosSocket } from "teckos";
import { ObjectId } from "mongodb";
import MongoRealtimeDatabase, {
  Collections,
} from "../../database/MongoRealtimeDatabase";
import {
  GlobalAudioProducer,
  GlobalVideoProducer,
  Router,
  Stage,
} from "../../types";
import {
  ClientRouterEvents,
  ServerGlobalEvents,
  ServerRouterEvents,
  ServerStageEvents,
} from "../../events";
import { StageManaged, StageUnManaged } from "../../payloads";
import logger from "../../logger";

const { info, error } = logger("socket:router");

class SocketRouterHandler {
  private readonly _serverAddress: string;

  private readonly _database: MongoRealtimeDatabase;

  private _routers: {
    socket: ITeckosSocket;
    router: Router;
  }[] = [];

  constructor(serverAddress, database: MongoRealtimeDatabase) {
    this._serverAddress = serverAddress;
    this._database = database;
    this._database.addListener(ServerStageEvents.STAGE_ADDED, this.onAddStage);
    this._database.addListener(
      ServerStageEvents.STAGE_REMOVED,
      this.onStageRemoved
    );
  }

  private getProducer = async (
    globalProducerId: ObjectId
  ): Promise<GlobalVideoProducer | GlobalAudioProducer> => {
    let producer = await this._database.readVideoProducer(globalProducerId);
    if (!producer) {
      producer = await this._database.readAudioProducer(globalProducerId);
    }
    return producer;
  };

  onAddStage = (stage: Stage) => {
    const routerStruct = this._routers.find((p) =>
      this._database
        .readRouter(p.router._id)
        .then((r) => r.availableOVSlots > 0)
    );
    if (routerStruct) {
      routerStruct.socket.emit(ServerRouterEvents.MANAGE_STAGE, stage);
    }
  };

  onStageRemoved = (stage: Stage) => {
    if (stage.ovServer && stage.ovServer.router) {
      const routerStruct = this._routers.find(
        (r) => r.router._id === stage.ovServer.router
      );
      if (routerStruct) {
        routerStruct.socket.emit(ServerRouterEvents.UN_MANAGE_STAGE, stage._id);
      }
    }
  };

  handle = async (
    socket: ITeckosSocket,
    initialRouter: Omit<Router, "_id">
  ) => {
    try {
      // Add router to database
      info("NEW ROUTER AVAILABLE");
      const router: Router = await this._database.createRouter({
        ...initialRouter,
        server: this._serverAddress,
      });
      this._routers.push({ socket, router });

      // Attach handlers
      socket.on(ClientRouterEvents.STAGE_MANAGED, (payload: StageManaged) => {
        const id = new ObjectId(payload.id);
        this._database.updateStage(id, {
          ovServer: {
            ...payload.ovServer,
            router: router._id,
          },
        });
        this._database
          .db()
          .collection<Router>(Collections.ROUTERS)
          .findOneAndUpdate(
            { _id: router._id },
            {
              $inc: { availableOVSlots: -1 },
            }
          );
      });

      socket.on(
        ClientRouterEvents.STAGE_UN_MANAGED,
        (payload: StageUnManaged) => {
          const id = new ObjectId(payload);
          this._database
            .db()
            .collection<Router>(Collections.ROUTERS)
            .findOneAndUpdate(
              { _id: router._id },
              {
                $inc: { availableOVSlots: 1 },
              }
            );
          this._database.updateStage(id, {
            ovServer: null,
          });
        }
      );

      socket.on(
        ClientRouterEvents.RESOLVE_PRODUCER,
        (
          id: string,
          callback: (
            error: string | null,
            producer?: GlobalVideoProducer | GlobalAudioProducer
          ) => void
        ) => {
          const objectId = new ObjectId(id);
          return this.getProducer(objectId)
            .then((producer) => {
              if (!producer) {
                return callback(null, producer);
              }
              throw new Error("Not found");
            })
            .catch((err) => callback(err));
        }
      );

      // Find all stages without server and assign them to this router
      const unassignedStages = await this._database.readStagesWithoutRouter(
        router.availableOVSlots
      );

      unassignedStages.forEach((stage) => {
        socket.emit(ServerRouterEvents.MANAGE_STAGE, stage);
      });

      socket.on("disconnect", () => {
        // Remove router from database
        info("ROUTER REMOVED");
        this._database
          .readStagesByRouter(router._id)
          .then((assignedStages) =>
            assignedStages.map((assignedStage) =>
              this._database.updateStage(assignedStage._id, {
                ovServer: null,
              })
            )
          )
          .catch((err) => error(err));
        this._database.deleteRouter(router._id);
        this._routers = this._routers.filter(
          (pair) => pair.router._id !== router._id
        );
      });

      socket.emit(ServerGlobalEvents.READY, router);
    } catch (err) {
      error(err);
    }
  };
}

export default SocketRouterHandler;
