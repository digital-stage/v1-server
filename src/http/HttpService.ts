import * as core from "express-serve-static-core";
import * as expressPino from "express-pino-logger";
import {authentication} from "../auth/Authentication";
import {manager} from "../storage/Manager";


namespace HttpService {
    export const init = (app: core.Express) => {
        app.use(expressPino());

        app.get('/beat', function (req, res) {
            res.send('Hello World!');
        });

        app.post('/stages/create', function (req, res) {
            res.send('Hello World!');
        });

        // GET SINGLE STAGE
        app.get('/stages/:id', function (req, res) {
            if (
                !req.params.id
                || typeof req.params.id !== 'string'
            ) {
                return res.sendStatus(400);
            }
            return authentication.authorizeRequest(req)
                .then(user => {
                    return manager.getStage(req.params.stageId)
                        .then(stage => {
                            if (stage.admins.indexOf(user._id) !== -1) {
                                return res.status(200).send(stage);
                            }
                            return res.sendStatus(404);
                        })
                })
                .catch((error) => {
                    console.log(error);
                    return res.sendStatus(401);
                });
        });

        // GET STAGES
        app.get('/stages', function (req, res) {
            return authentication.authorizeRequest(req)
                .then(user => {
                    return manager.getManagedStages(user)
                        .then(stages => res.status(200).send(stages));
                })
                .catch((error) => {
                    console.log(error);
                    return res.sendStatus(401);
                });
        });

        // UPDATE STAGE
        app.put('/stages/:id', function (req, res) {
            res.send('Hello World!');
        });

        app.put('/stages/update', function (req, res) {
            res.send('Hello World!');
        });

        // JOIN STAGE
        app.put('/stages/join/:stageId/:groupId', function (req, res) {
            if (
                !req.params.stageId
                || typeof req.params.stageId !== 'string'
                || !req.params.groupId
                || typeof req.params.groupId !== 'string'
            ) {
                return res.sendStatus(400);
            }
            return authentication.authorizeRequest(req)
                .then(user => {
                    return manager.joinStage(user, req.params.stageId, req.params.groupId)
                        .then(result => res.sendStatus(result ? 200 : 404));
                });
        });

        // LEAVE STAGE
        app.put('/stages/leave', function (req, res) {
            return authentication.authorizeRequest(req)
                .then(user => {
                    return manager.leaveStage(user)
                        .then(result => res.sendStatus(result ? 200 : 404));
                });
        });
    }

}
export default HttpService;