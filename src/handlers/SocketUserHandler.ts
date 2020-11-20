import { ITeckosSocket } from 'teckos';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import { User } from '../model.server';
import { ClientUserEvents } from '../events';
import { ChangeUserPayload } from '../payloads';

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
      (payload: ChangeUserPayload) => this.database.updateUser(this.user._id, payload));
  }
}
export default SocketUserHandler;
