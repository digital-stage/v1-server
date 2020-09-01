"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Database_1 = require("./Database");
const IDatabase_1 = require("./IDatabase");
const DummyAuthentication_1 = require("./auth/DummyAuthentication");
const socketIO = require("socket.io");
const events_1 = require("./backup/events");
const database = new Database_1.Database();
const authentication = new DummyAuthentication_1.default();
const init = () => Promise.all([
    database.init()
]);
const io = socketIO(4000);
const sendToUser = (uid, event, payload) => {
    io.to(uid).send(event, payload);
};
init()
    .then(() => {
    io.on("connection", (socket) => {
        authentication.authorizeSocket(socket)
            .then((user) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("NEW CONNECTION");
            const sendToDevice = (event, payload) => {
                socket.emit(event, payload);
            };
            // Socket has been authorized
            // Check if user is already in database
            let existingUser = yield database.readUser(user.id);
            if (!existingUser) {
                yield database.createUser(user);
            }
            else {
                user = existingUser;
            }
            // Create device
            let commitedDevice = undefined;
            let device;
            if (socket.handshake.query && socket.handshake.query.device) {
                commitedDevice = JSON.parse(socket.handshake.query.device);
                if (commitedDevice.mac) {
                    device = yield database.readDeviceByUserAndMac(user.id, socket.handshake.query.device.mac);
                }
            }
            if (!device) {
                const initialDevice = Object.assign(Object.assign({}, commitedDevice), { userId: user.id, videoProducer: [], audioProducer: [], ovProducer: [] });
                device = yield database.createDevice(initialDevice);
            }
            socket.on("disconnect", () => {
                console.log("Remove device");
                database.deleteDevice(device.id);
            });
            console.log(device);
            socket.emit(events_1.ServerEvents.READY, device);
        }))
            .catch((error) => {
            socket.error(error.message);
            console.error("INVALID CONNECTION ATTEMPT");
            socket.disconnect();
        });
    });
});
const testDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    database.on(IDatabase_1.DatabaseEvents.StageAdded, () => {
        console.log("Yeah, Stage added");
    });
    database.on(IDatabase_1.DatabaseEvents.StageChanged, () => {
        console.log("Yeah, Stage changed");
    });
    database.on(IDatabase_1.DatabaseEvents.StageRemoved, () => {
        console.log("Yeah, Stage removed");
    });
    database.on(IDatabase_1.DatabaseEvents.UserAdded, () => {
        console.log("Yeah, User added");
    });
    database.on(IDatabase_1.DatabaseEvents.UserRemoved, () => {
        console.log("Yeah, User removed");
    });
    console.log("Creating stage");
    yield database.createStage({
        name: "My stage",
        groups: [],
        admins: [],
        directors: [],
        width: 0,
        length: 0,
        height: 0,
        absorption: 0,
        reflection: 0
    }).then(stage => {
        console.log("Deleting " + stage.id);
        return database.deleteStage(stage.id)
            .then(result => {
            if (result) {
                console.log("Deleted " + stage.id);
            }
            else {
                console.log("Not deleted " + stage.id);
            }
        });
    });
    console.log("Creating stage");
    yield database.createStage({
        name: "My other stage",
        groups: [],
        admins: [],
        directors: [],
        width: 0,
        length: 0,
        height: 0,
        absorption: 0,
        reflection: 0
    }).then(stage => {
        console.log("Deleting " + stage.id);
        return database.deleteStage(stage.id)
            .then(result => {
            if (result) {
                console.log("Deleted " + stage.id);
            }
            else {
                console.log("Not deleted " + stage.id);
            }
        });
    });
    console.log("Creating user");
    yield database.createUser({
        name: "User"
    }).then(user => {
        return database.deleteUser(user.id);
    });
});
//# sourceMappingURL=index.js.map