import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";
import * as asyncHandler from "express-async-handler";
import {MongoRealtimeDatabase} from "../database/MongoRealtimeDatabase";
import {IAuthentication} from "../auth/IAuthentication";

class HttpService {
    private authentication: IAuthentication;
    private database: MongoRealtimeDatabase;

    constructor(database: MongoRealtimeDatabase, authentication: IAuthentication) {
        this.authentication = authentication;
        this.database = database;
    }

    init(app: core.Express) {
        app.use(expressPino());

        app.get('/beat', asyncHandler(async (req, res) => {
                this.database.db().collection("devices").find({}).toArray()
                    .then(devices => devices.map(device => {
                        console.log("DEVICE:")
                        console.log(device);
                    }))
                return this.database.db().collection("videoproducers").find({}).toArray()
                    .then(producers => producers.map(producer => {
                        console.log("PRODUCER:")
                        console.log(producer);
                    }))
                    .then(() => res.send('Boom!'));
            }
        ));

        // GET SPECIFIC PUBLIC PRODUCER
        app.get('/producers/:id', asyncHandler((req, res) => {
            if (
                !req.params.id
                || typeof req.params.id !== 'string'
            ) {
                return res.sendStatus(400);
            }
            return this.authentication.authorizeRequest(req)
                .then(async () => {
                    console.log(this.database);
                    let producer = await this.database.readVideoProducer(req.params.id).catch(error => console.error(error));
                    if (!producer) {
                        producer = await this.database.readAudioProducer(req.params.id);
                    }
                    if (producer) {
                        return res.status(200).json(producer);
                    } else {
                        console.log("Was looking for " + req.params.id);
                        console.log("But only found following:");
                        await this.database.db().collection("devices").find({}).toArray()
                            .then(devices => devices.map(device => {
                                console.log("DEVICE:")
                                console.log(device);
                            }))
                        await this.database.db().collection("videoproducers").find({}).toArray()
                            .then(producers => producers.map(producer => {
                                console.log("PRODUCER:")
                                console.log(producer);
                            }))
                    }
                    return res.sendStatus(404);
                })
                .catch((error) => {
                    console.log(error);
                    return res.sendStatus(401);
                });
        }));
    }
}

export default HttpService;