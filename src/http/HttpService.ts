import { ObjectId } from "mongodb";
import * as uWebSocket from "teckos/uws";
import MongoRealtimeDatabase from "../database/MongoRealtimeDatabase";
import { IAuthentication } from "../auth/IAuthentication";
import setupCORS from "./setupCORS";
import logger from "../logger";

const { trace, warn, error } = logger("http");

class HttpService {
  private authentication: IAuthentication;

  private database: MongoRealtimeDatabase;

  constructor(
    database: MongoRealtimeDatabase,
    authentication: IAuthentication
  ) {
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
    app.get("/beat", (res) => {
      res.writeStatus("200 OK").writeHeader("IsExample", "Yes").end("Boom!");
    });

    app.get("/routers", async (res, req) => {
      setupCORS(res, req);
      res.onAborted(() => {
        res.aborted = true;
      });
      return this.database
        .readRouters()
        .then((routers) => {
          if (!res.aborted) {
            return res.end(JSON.stringify(routers));
          }
          return null;
        })
        .catch((e) => error(e));
    });

    app.get("/producers/:id", async (res, req) => {
      res.onAborted(() => {
        res.aborted = true;
      });
      const id = req.getParameter(0);
      trace(`[/producers/:id] Producer with id ${id} requested`);
      if (!id || typeof id !== "string") {
        warn("[/producers/:id] Bad request");
        return res.writeStatus("400 Bad Request").end();
      }
      const token = req.getHeader("authorization");
      if (!token || typeof token !== "string") {
        warn("[/producers/:id] Missing authorization");
        return res.writeStatus("400 Bad Request").end();
      }

      return this.authentication
        .verifyWithToken(token)
        .then(() => this.getProducer(id))
        .then((producer) => {
          if (!res.aborted) {
            if (producer) {
              trace(`[/producers/:id] Found producer with id ${id}`);
              return res.end(JSON.stringify(producer));
            }
            warn(`[/producers/:id] Producer with id ${id} not found`);
            return res.writeStatus("404 Not Found").end();
          }
          warn("[/producers/:id] Request aborted");
          return null;
        })
        .catch((e) => {
          error(e);
          if (!res.aborted) {
            return res.writeStatus("500 Internal Server Error").end();
          }
          return null;
        });
    });
  }
}

export default HttpService;
