import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";
import * as asyncHandler from "express-async-handler";
import {MongoRealtimeDatabase} from "../database/MongoRealtimeDatabase";
import {IAuthentication} from "../auth/IAuthentication";
import {GlobalAudioProducer, GlobalAudioProducerId, GlobalVideoProducer, GlobalVideoProducerId} from "../model.server";
import * as pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});

class HttpService {
    private authentication: IAuthentication;
    private database: MongoRealtimeDatabase;

    constructor(database: MongoRealtimeDatabase, authentication: IAuthentication) {
        this.authentication = authentication;
        this.database = database;
    }

    async handleBeat(): Promise<boolean> {
        console.log("Database is " + this.database.db() !== undefined);
        await this.database.db().collection("devices").find({}).toArray()
            .then(devices => devices.map(device => {
                console.log("DEVICE:")
                console.log(device);
            }))
            .then(() => console.log("Finished device lockup"));
        await this.database.db().collection("videoproducers").find({}).toArray()
            .then(producers => producers.map(producer => {
                console.log("PRODUCER:")
                console.log(producer);
            }));
        return true;
    }

    async getProducer(id: GlobalAudioProducerId | GlobalVideoProducerId): Promise<GlobalAudioProducer | GlobalVideoProducer | null> {
        let producer = await this.database.readVideoProducer(id);
        if (!producer) {
            producer = await this.database.readAudioProducer(id);
        }
        return producer;
    }

    init(app: core.Express) {
        app.use(expressPino());

        app.get('/beat', asyncHandler(async (req, res) => {
                await this.handleBeat();
                res.send('Boom!');
            }
        ));

        // GET SPECIFIC PUBLIC PRODUCER
        app.get('/producers/:id', asyncHandler(async (req, res) => {
            if (
                !req.params.id
                || typeof req.params.id !== 'string'
            ) {
                return res.sendStatus(400);
            }

            await this.authentication.authorizeRequest(req)
                .then(async () => {
                    const producer = await this.getProducer(req.params.id);
                    if (producer) {
                        logger.debug("[HTTP SERVICE] Returning producer: " + req.params.id);
                        return res.status(200).json(producer);
                    }
                    logger.warn("[HTTP SERVICE] Could not find requested producer: " + req.params.id);
                    return res.sendStatus(404);
                })
                .catch((error) => {
                    logger.warn("[HTTP SERVICE] Unauthorized accesss to /producers/" + req.params.id + " from " + req.ip);
                    return res.sendStatus(401);
                });
        }));
    }
}

export default HttpService;