import {DatabaseEvents, IDatabase} from "../../backup/database/IDatabase";

export default async (database: IDatabase) => {
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