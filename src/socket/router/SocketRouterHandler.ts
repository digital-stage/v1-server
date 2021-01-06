import { ITeckosSocket } from 'teckos';
import debug from 'debug';
import { ObjectId } from 'mongodb';
import MongoRealtimeDatabase from '../../database/MongoRealtimeDatabase';
import { GlobalAudioProducer, GlobalVideoProducer, Router } from '../../types';
import { ClientRouterEvents, ServerGlobalEvents, ServerRouterEvents } from '../../events';
import { StageManaged, StageUnManaged } from '../../payloads';

const d = debug('server').extend('socket').extend('router');
const info = d.extend('info');

class SocketRouterHandler {
  private readonly _serverAddress: string;

  private readonly _database: MongoRealtimeDatabase;

  constructor(
    serverAddress,
    database: MongoRealtimeDatabase,
  ) {
    this._serverAddress = serverAddress;
    this._database = database;
  }

  private getProducer = async (globalProducerId: ObjectId)
  : Promise<GlobalVideoProducer | GlobalAudioProducer> => {
    let producer = await this._database.readVideoProducer(globalProducerId);
    if (!producer) {
      producer = await this._database.readAudioProducer(globalProducerId);
    }
    return producer;
  };

  async handle(socket: ITeckosSocket, initialRouter: Omit<Router, '_id'>) {
    // Add router to database
    info('NEW ROUTER AVAILABLE');
    const router: Router = await this._database.createRouter({
      ...initialRouter,
      server: this._serverAddress,
    });

    // Attach handlers
    socket.on(ClientRouterEvents.STAGE_MANAGED, (payload: StageManaged) => {
      const id = new ObjectId(payload.id);
      this._database.updateStage(id, {
        ovServer: {
          ...payload.ovServer,
          router: router._id,
        },
      });
    });

    socket.on(ClientRouterEvents.STAGE_UN_MANAGED, (payload: StageUnManaged) => {
      const id = new ObjectId(payload);
      this._database.updateStage(id, {
        ovServer: null,
      });
    });

    socket.on(
      ClientRouterEvents.RESOLVE_PRODUCER,
      (id: string,
        callback: (
          error: string | null,
          producer?: GlobalVideoProducer | GlobalAudioProducer) => void) => {
        const objectId = new ObjectId(id);
        return this.getProducer(objectId)
          .then((producer) => {
            if (!producer) {
              return callback('Not found');
            }
            return callback(null, producer);
          });
      },
    );

    // Find all stages without server and assign them to this router
    const unassignedStages = await this._database.readStagesWithoutRouter(router.availableOVSlots);

    unassignedStages.forEach((stage) => {
      socket.emit(ServerRouterEvents.MANAGE_STAGE, stage);
    });

    socket.on('disconnect', () => {
      // Remove router from database
      info('ROUTER REMOVED');
      this._database.readStagesByRouter(router._id)
        .then((assignedStages) => assignedStages.map(
          (assignedStage) => this._database.updateStage(assignedStage._id, {
            ovServer: null,
          }),
        ));
      this._database.deleteRouter(router._id);
    });

    socket.emit(ServerGlobalEvents.READY, router);
  }
}

export default SocketRouterHandler;
