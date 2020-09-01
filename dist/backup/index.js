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
const socketIO = require("socket.io");
const database_1 = require("./database");
const events_1 = require("./events");
const DummyAuthentication_1 = require("./auth/DummyAuthentication");
const database = new database_1.default();
const authentication = new DummyAuthentication_1.default();
const io = socketIO(4000);
const sendToUser = (uid, event, payload) => {
    io.to(uid).send(event, payload);
};
database.on(database_1.DatabaseEvents.DEVICE_ADDED, (device) => sendToUser(device.userId, events_1.ServerEvents.DEVICE_ADDED, device));
database.on(database_1.DatabaseEvents.DEVICE_CHANGED, (device) => sendToUser(device.userId, events_1.ServerEvents.DEVICE_CHANGED, device));
database.on(database_1.DatabaseEvents.DEVICE_REMOVED, (device) => sendToUser(device.userId, events_1.ServerEvents.DEVICE_REMOVED, device));
io.on("connection", (socket) => {
    authentication.authorizeSocket(socket)
        .then((user) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("NEW CONNECTION");
        const sendToDevice = (event, payload) => {
            socket.emit(event, payload);
        };
        // Socket has been authorized
        // Check if user is already in database
        let existingUser = yield database.getUser(user.id);
        if (!existingUser) {
            yield database.storeUser(user);
        }
        else {
            user = existingUser;
        }
        // Create device
        let initialDevice = undefined;
        let device;
        if (socket.handshake.query && socket.handshake.query.device) {
            initialDevice = JSON.parse(socket.handshake.query.device);
            if (initialDevice.mac) {
                device = yield database.getDeviceByMac(socket.handshake.query.device.mac);
            }
        }
        if (!device) {
            device = yield database.addDevice(user.id, initialDevice);
        }
        socket.on("disconnect", () => {
            console.log("Remove device");
            database.removeDevice(device.id);
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
//# sourceMappingURL=index.js.map