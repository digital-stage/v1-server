import Server from "../model.server";
import * as core from "express-serve-static-core";
import {IAuthentication} from "../auth/IAuthentication";
import {IDatabase} from "../IDatabase";

export default (app: core.Express, database: IDatabase, authentication: IAuthentication) => {

    app.get('/', function (req, res) {
        res.send('Hello World!');
    });

    app.post('/stages/join/:stageId', function (req, res) {
        authentication.authorizeRequest(req)
            .then(user => {
                if (
                    !req.params.stageId
                    || typeof req.params.stageId !== 'string'
                    || !req.params.groupId
                    || typeof req.params.groupId !== 'string'
                ) {
                    return res.sendStatus(400);
                }

            })
            .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            })
    });

    app.post('/stages/leave', function (req, res) {
        authentication.authorizeRequest(req)
            .then(user => {
                
            })
            .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            })
    });

    app.post('/stages', function (req, res) {
        authentication.authorizeRequest(req)
            .then(user => {
                if (!req.headers.stage || typeof req.headers.stage !== 'string') {
                    return res.sendStatus(400);
                }
                const stage: Partial<Server.Stage> = JSON.parse(req.headers.stage);
                if (!stage.name) {
                    return res.sendStatus(400);
                }
                console.log("Creating stage " + req.headers.name);
                return database.createStage({
                    width: 0,
                    height: 0,
                    length: 0,
                    reflection: 0,
                    absorption: 0,
                    ...stage,
                    name: stage.name,
                    password: stage.password,
                    admins: [user.id],
                    directors: [],
                    groups: [],
                }).then(stage => res.status(200).send(JSON.stringify(stage)));
            })
            .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            })
    });

    app.get('/stages', function (req, res) {
        authentication.authorizeRequest(req)
            .then(user => {
                return database.readStages()
                    .then(stages => {
                        console.log(stages);
                        return res.status(200).send(JSON.stringify(stages.map(stage => ({
                            ...stage,
                            password: stage.admins.indexOf(user.id) !== -1 ? stage.password : undefined
                        }))));
                    });
            })
            .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            });
    });

    app.get('/stages/:stageId', function (req, res) {
        authentication.authorizeRequest(req)
            .then(user => {
                if (!req.params.stageId || typeof req.params.stageId !== 'string') {
                    return res.sendStatus(400);
                }
                return database.readStage(req.params.stageId)
                    .then(stage => {
                        console.log(stage);
                        return res.status(200).send(JSON.stringify({
                            ...stage,
                            password: stage.admins.indexOf(user.id) !== -1 ? stage.password : undefined
                        }));
                    });
            })
            .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            });
    });

    app.put('/stages/:stageId', function (req, res) {
        authentication.authorizeRequest(req)
            .then(user => {
                if (!req.params.stageId || typeof req.params.stageId !== 'string'
                    || !req.headers.stage || typeof req.headers.stage !== 'string') {
                    return res.sendStatus(400);
                }
                const stage: Partial<Server.Stage> = JSON.parse(req.headers.stage);
                if (stage.admins.indexOf(user.id) === -1) {
                    return res.sendStatus(403);
                }
                console.log("Updating stage " + req.headers.name);
                return database.updateStage(req.params.stageId, {
                    width: 0,
                    height: 0,
                    length: 0,
                    reflection: 0,
                    absorption: 0,
                    ...stage,
                    name: stage.name,
                    password: stage.password
                }).then(stage => res.status(200).send(JSON.stringify(stage)));
            })
            .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            })
    });

    app.delete('/stages/:stageId', function (req, res) {
        authentication.authorizeRequest(req)
            .then(user => {
                if (
                    !req.params.stageId
                    || typeof req.params.stageId !== 'string'
                ) {
                    return res.sendStatus(400);
                }
                return database.readStage(req.params.stageId)
                    .then(stage => {
                        if (stage.admins.indexOf(user.id) === -1) {
                            return res.sendStatus(403);
                        }
                        console.log("Deleting stage " + stage.id);
                        return database.deleteStage(stage.id)
                            .then(stage => res.status(200).send(JSON.stringify(stage)));
                    });
            })
            .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            });
    });
};