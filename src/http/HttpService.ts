import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";
import Auth from "../auth/IAuthentication";
import {IRealtimeDatabase} from "../database/IRealtimeDatabase";
import IAuthentication = Auth.IAuthentication;

class HttpService {
    private authentication: IAuthentication;
    private database: IRealtimeDatabase;

    constructor(database: IRealtimeDatabase, authentication: IAuthentication) {
        this.authentication = authentication;
        this.database = database;
    }

    handleProducerRequest(req, res) {
        if (
            !req.params.id
            || typeof req.params.id !== 'string'
        ) {
            return res.sendStatus(400);
        }
        return this.authentication.authorizeRequest(req)
            .then(async () => {
                let producer = await this.database.readVideoProducer(req.params.id).catch(error => console.error(error));
                if (!producer) {
                    producer = await this.database.readAudioProducer(req.params.id);
                }
                if (producer) {
                    return res.status(200).json(producer);
                } else {
                    console.log("Was looking for " + req.params.id);
                    console.log("But only found following:");
                    await this.database.db().collection("videoproducers").find({}).toArray()
                        .then(producers => producers.map(producer => console.log(producer)))
                }
                return res.sendStatus(404);
            })
            .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            });
    }

    init(app: core.Express) {
        app.use(expressPino());

        app.get('/beat', function (req, res) {
            res.send('Boom!');
        });

        // GET SPECIFIC PUBLIC PRODUCER
        app.get('/producers/:id', (req, res) => {
            return this.handleProducerRequest(req, res);
        });
    }
}

export default HttpService;