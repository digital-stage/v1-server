import * as pino from 'pino';
import { ObjectId } from 'mongodb';
import * as uWebSocket from 'uWebSockets.js';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import { IAuthentication } from '../auth/IAuthentication';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

class HttpService {
  private authentication: IAuthentication;

  private database: MongoRealtimeDatabase;

  constructor(database: MongoRealtimeDatabase, authentication: IAuthentication) {
    this.authentication = authentication;
    this.database = database;
  }

  async getProducer(id: string) {
    const objectId = new ObjectId(id);
    let producer = await this.database.readVideoProducer(objectId);
    if (!producer) {
      producer = await this.database.readAudioProducer(objectId);
    }
    return producer;
  }

  init(app: uWebSocket.TemplatedApp) {
    app.get('/beat', (res) => {
      res.writeStatus('200 OK').writeHeader('IsExample', 'Yes').end('Boom!');
    });

    app.get('/producers/:id', async (res, req) => {
      res.onAborted(() => {
        res.aborted = true;
      });

      const params = JSON.parse(req.getParameter(0));
      const token = JSON.parse(req.getHeader('authorization'));

      if (
        !params.token
          || !params.id
            || typeof params.id !== 'string'
      ) {
        res.sendStatus(400).end();
      }

      const user = await this.authentication.verifyWithToken(token);

      if (user) {
        const producer = await this.getProducer(params.id);

        if (!res.aborted) {
          if (producer) {
            res.end(JSON.stringify(producer));
          } else {
            res.sendStatus('404 Not Found');
          }
        }
      }
    });
  }
}

export default HttpService;
