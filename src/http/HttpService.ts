import { ObjectId } from 'mongodb';
import * as uWebSocket from 'teckos/uws';
import debug from 'debug';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import { IAuthentication } from '../auth/IAuthentication';

const d = debug('server').extend('http');
const warn = d.extend('warn');
const err = d.extend('err');

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
      d(`[/producers/:id] Producer with id ${id} requested`);
      if (!id
      || typeof id !== 'string') {
        warn('[/producers/:id] Bad request');
        return res.writeStatus('400 Bad Request').end();
      }
      const token = req.getHeader('authorization');
      if (!token
        || typeof token !== 'string') {
        warn('[/producers/:id] Missing authorization');
        return res.writeStatus('400 Bad Request').end();
      }

      return this.authentication.verifyWithToken(token)
        .then(() => this.getProducer(id))
        .then((producer) => {
          if (!res.onAborted) {
            if (producer) {
              d(`[/producers/:id] Found producer with id ${id}`);
              res.end(JSON.stringify(producer));
            } else {
              warn(`[/producers/:id] Producer with id ${id} not found`);
              res.writeStatus('404 Not Found').end();
            }
          }
        })
        .catch((error) => {
          err(error);
          if (!res.onAborted) {
            return res.writeStatus('500 Internal Server Error').end();
          }
          return null;
        });
    });
  }
}

export default HttpService;
