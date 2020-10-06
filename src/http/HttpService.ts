import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";
import Auth from "../auth/IAuthentication";
import {IRealtimeDatabase} from "../database/IRealtimeDatabase";

namespace HttpService {
    import IAuthentication = Auth.IAuthentication;
    export const init = (app: core.Express, database: IRealtimeDatabase, authentication: IAuthentication) => {
        app.use(expressPino());

        app.get('/beat', function (req, res) {
            res.send('Boom!');
        });

        // GET SPECIFIC PUBLIC PRODUCER
        app.get('/producers/:id', function (req, res) {
            if (
                !req.params.id
                || typeof req.params.id !== 'string'
            ) {
                return res.sendStatus(400);
            }
            return authentication.authorizeRequest(req)
                .then(async () => {
                    let producer = await database.readVideoProducer(req.params.id).catch(error => console.error(error));
                    if (!producer) {
                        producer = await database.readAudioProducer(req.params.id);
                    }
                    if (producer) {
                        return res.status(200).json(producer);
                    }
                    return res.sendStatus(404);
                })
                .catch((error) => {
                    console.log(error);
                    return res.sendStatus(401);
                });
        });
    }

}
export default HttpService;