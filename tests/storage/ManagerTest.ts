import {IDeviceManager, IStageManager, IUserManager} from "../../src/storage/IManager";


const assert = require('assert');

const testDeviceManager = (manager: IDeviceManager) => {
    describe('Device Management', function () {

        describe('#indexOf()', function () {
            it('should return -1 when the value is not present', function () {
                assert.equal([1, 2, 3].indexOf(4), -1);
            });
        });

    });
}
const testUserManager = (manager: IUserManager) => {
    describe('Device Management', function () {

        describe('#indexOf()', function () {
            it('should return -1 when the value is not present', function () {
                assert.equal([1, 2, 3].indexOf(4), -1);
            });
        });

    });
}
const testStageManager = (manager: IStageManager) => {
    describe('Stage Management', function () {

        describe('#indexOf()', function () {
            it('should return -1 when the value is not present', function () {
                assert.equal([1, 2, 3].indexOf(4), -1);
            });
        });

    });
}

export const testManager = (manager: IStageManager & IDeviceManager & IUserManager) => {
    testDeviceManager(manager);
    testStageManager(manager);
    testUserManager(manager);
}