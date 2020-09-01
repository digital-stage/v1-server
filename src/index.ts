import {Database} from "./Database";
import {DatabaseEvents, IDatabase} from "./IDatabase";
import Auth, {IAuthentication} from "./auth/IAuthentication";
import DummyAuthentication from "./auth/DummyAuthentication";
import * as socketIO from "socket.io";
import {ServerEvents} from "./backup/events";
import Server from "./model.server";


const database: IDatabase = new Database();
const authentication: IAuthentication = new DummyAuthentication();

const init = () => Promise.all([
    database.init()
]);

const io: socketIO.Server = socketIO(4000);

const sendToUser = (uid: string, event: string, payload?: any) => {
    io.to(uid).send(event, payload);
}

init()
    .then(() => {
        io.on("connection", (socket: socketIO.Socket) => {
            authentication.authorizeSocket(socket)
                .then(async (user: Auth.User) => {
                    console.log("NEW CONNECTION");
                    const sendToDevice = (event: string, payload?: any) => {
                        socket.emit(event, payload);
                    }

                    // Socket has been authorized
                    // Check if user is already in database
                    let existingUser = await database.readUser(user.id);
                    if (!existingUser) {
                        await database.createUser(user);
                    } else {
                        user = existingUser;
                    }

                    // Create device
                    let commitedDevice: Server.Device = undefined;
                    let device;
                    if (socket.handshake.query && socket.handshake.query.device) {
                        commitedDevice = JSON.parse(socket.handshake.query.device);
                        if (commitedDevice.mac) {
                            device = await database.readDeviceByUserAndMac(user.id, socket.handshake.query.device.mac);
                        }
                    }
                    if (!device) {
                        const initialDevice: Omit<Server.Device, "id"> = {
                            ...commitedDevice,
                            userId: user.id,
                            videoProducer: [],
                            audioProducer: [],
                            ovProducer: []
                        }
                        device = await database.createDevice(initialDevice);
                    }

                    socket.on("disconnect", () => {
                        console.log("Remove device")
                        database.deleteDevice(device.id);
                    })

                    console.log(device);
                    socket.emit(ServerEvents.READY, device);
                })
                .catch((error) => {
                    socket.error(error.message);
                    console.error("INVALID CONNECTION ATTEMPT");
                    socket.disconnect();
                });
        });
    });


const testDatabase = async () => {
    database.on(DatabaseEvents.StageAdded, () => {
        console.log("Yeah, Stage added");
    });
    database.on(DatabaseEvents.StageChanged, () => {
        console.log("Yeah, Stage changed");
    });
    database.on(DatabaseEvents.StageRemoved, () => {
        console.log("Yeah, Stage removed");
    });
    database.on(DatabaseEvents.UserAdded, () => {
        console.log("Yeah, User added");
    });
    database.on(DatabaseEvents.UserRemoved, () => {
        console.log("Yeah, User removed");
    });

    console.log("Creating stage");
    await database.createStage({
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
                    } else {
                        console.log("Not deleted " + stage.id);
                    }
                })
        }
    );

    console.log("Creating stage");
    await database.createStage({
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
                } else {
                    console.log("Not deleted " + stage.id);
                }
            })
    });

    console.log("Creating user");
    await database.createUser({
        name: "User"
    }).then(user => {
        return database.deleteUser(user.id);
    })
};