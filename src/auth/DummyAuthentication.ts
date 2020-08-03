import * as socketIO from "socket.io";
import {IAuthentication} from "./IAuthentication";
import {User} from "../model";

class DummyAuthentication implements IAuthentication {
    authorizeSocket(socket: socketIO.Socket): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            if (!socket.handshake.query || !socket.handshake.query.token) {
                reject(new Error("Missing authorization"));
            }
            if (socket.handshake.query.token === "123")
                return resolve({
                    id: "123",
                    name: "Test",
                    avatarUrl: "https://vignette.wikia.nocookie.net/bibi-blocksberg/images/e/e1/Dgtzgh.png/revision/latest/top-crop/width/360/height/450?cb=20190623184129&path-prefix=de",
                    stageId: null
                });
            reject(new Error("Invalid credentials, try 123"))
        })
    }

}

export default DummyAuthentication;