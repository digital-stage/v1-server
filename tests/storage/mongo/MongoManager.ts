import MongoStageManager from "../../../src/storage/mongo/MongoStageManager";
import {testManager} from "../ManagerTest";


const manager = new MongoStageManager();
manager.init()
    .then(
        () => {
            testManager(manager);
        }
    );