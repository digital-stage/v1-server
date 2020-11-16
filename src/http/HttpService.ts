import { ObjectId } from 'mongodb';
import * as uWebSocket from 'teckos/uWebSockets';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import { IAuthentication } from '../auth/IAuthentication';

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
      const id = req.getParameter(0);
      if (!id
      || typeof id !== 'string') {
        return res.writeStatus('400 Bad Request ').end();
      }
      const token = req.getHeader('authorization');
      if (!token
        || typeof token !== 'string') {
        return res.writeStatus('400 Bad Request ').end();
      }

      return this.authentication.verifyWithToken(token)
        .then(() => this.getProducer(id))
        .then((producer) => {
          if (!res.onAborted) {
            if (producer) {
              res.end(JSON.stringify(producer));
            } else {
              res.writeStatus('404 Not Found').end();
            }
          }
        })
        .catch((err) => {
          console.error(err);
          if (!res.onAborted) {
            return res.writeStatus('500 Internal Server Error').end();
          }
          return null;
        });
    });
  }
}

export default HttpService;
