"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expressPino = require("express-pino-logger");
const Authentication_1 = require("../auth/Authentication");
const Manager_1 = require("../storage/Manager");
var HttpService;
(function (HttpService) {
    HttpService.init = (app) => {
        app.use(expressPino());
        app.get('/beat', function (req, res) {
            res.send('Hello World!');
        });
        app.post('/stages/create', function (req, res) {
            res.send('Hello World!');
        });
        // GET SINGLE STAGE
        app.get('/stages/:id', function (req, res) {
            if (!req.params.id
                || typeof req.params.id !== 'string') {
                return res.sendStatus(400);
            }
            return Authentication_1.authentication.authorizeRequest(req)
                .then(user => {
                if (user.managedStages.indexOf(req.params.stageId) !== -1)
                    return Manager_1.manager.getStage(req.params.stageId)
                        .then(stage => res.status(200).send(stage));
                return res.sendStatus(404);
            })
                .catch((error) => {
                console.log(error);
                return res.sendStatus(401);
            });
        });
        // GET STAGES
        app.get('/stages', function (req, res) {
            return Authentication_1.authentication.authorizeRequest(req)
                .then(user => {
                return Manager_1.manager.getManagedStages(user)
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
            if (!req.params.stageId
                || typeof req.params.stageId !== 'string'
                || !req.params.groupId
                || typeof req.params.groupId !== 'string') {
                return res.sendStatus(400);
            }
            return Authentication_1.authentication.authorizeRequest(req)
                .then(user => {
                return Manager_1.manager.joinStage(user, req.params.stageId, req.params.groupId)
                    .then(result => res.sendStatus(result ? 200 : 404));
            });
        });
        // LEAVE STAGE
        app.put('/stages/leave', function (req, res) {
            return Authentication_1.authentication.authorizeRequest(req)
                .then(user => {
                return Manager_1.manager.leaveStage(user)
                    .then(result => res.sendStatus(result ? 200 : 404));
            });
        });
    };
})(HttpService || (HttpService = {}));
exports.default = HttpService;
//# sourceMappingURL=HttpService.js.map