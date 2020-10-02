import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";
import Auth from "../auth/IAuthentication";

namespace HttpService {
    import IAuthentication = Auth.IAuthentication;
    export const init = (app: core.Express, authentication: IAuthentication) => {
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
            console.log(req.params);
            return authentication.authorizeRequest(req)
                .then(() => {
                    //TODO: FIND AND RETURN PRODUCER, WHERE STAGEMEMBERID IS NOT NULL
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