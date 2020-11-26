import { ITeckosSocket } from 'teckos';
import debug from 'debug';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import { User } from '../model.server';
import { ClientStageEvents, ClientUserEvents } from '../events';
import { ChangeUserPayload } from '../payloads';

const d = debug('server').extend('socket').extend('user');
const trace = d.extend('trace');

class SocketUserHandler {
  private readonly database: MongoRealtimeDatabase;

  private readonly user: User;

  private readonly socket: ITeckosSocket;

  constructor(
    database: MongoRealtimeDatabase,
    user: User,
    socket: ITeckosSocket,
  ) {
    this.user = user;
    this.database = database;
    this.socket = socket;
  }

  init() {
    this.socket.on(ClientUserEvents.CHANGE_USER,
      (payload: ChangeUserPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_STAGE_MEMBER_OV}`);
        return this.database.updateUser(this.user._id, payload);
      });
  }
}
export default SocketUserHandler;
