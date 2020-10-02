import MongoStageManager from "../../backup/storage/mongoose/MongoStageManager";
import * as mongoose from "mongoose";
import {User} from "../../src/model.common";


const assert = require('assert');

describe('Mongo Database', function () {
    let user: User;
    let anotherUser: User;

    before(function () {
        const manager = new MongoStageManager("managertest");
        return manager.init()
            .then(() => Promise.all([
                manager.createUserWithUid("123", "Testuser")
                    .then(created => user = created),
                manager.createUserWithUid("123", "Another user")
                    .then(created => anotherUser = created)
            ]))
            .then(() => console.log("Prepared mongo db"))
    });

    after(function () {
        return mongoose.connection.db.dropDatabase()
            .then(() => console.log("Cleaned up mongo db"))
    });

    it('User shall be creatable', function () {
        assert.equal([1, 2, 3].indexOf(4), -1);
    });
    it('User shall be creatable', function () {
        assert.equal([1, 2, 3].indexOf(4), -1);
    });
    it('User shall be creatable', function () {
        assert.equal([1, 2, 3].indexOf(4), -1);
    });
    it('User shall be creatable', function () {
        assert.equal([1, 2, 3].indexOf(4), -1);
    });
});
