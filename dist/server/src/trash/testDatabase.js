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
const IDatabase_1 = require("../../backup/database/IDatabase");
exports.default = (database) => __awaiter(void 0, void 0, void 0, function* () {
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
//# sourceMappingURL=testDatabase.js.map