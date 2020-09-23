export enum ServerGlobalEvents {
    READY = "ready"
}

export enum ServerUserEvents {
    USER_READY = "user-ready",
    USER_CHANGED = "user-changed"
}

export enum ServerDeviceEvents {
    LOCAL_DEVICE_READY = "local-device-ready",
    DEVICE_ADDED = "device-added",
    DEVICE_CHANGED = "device-changed",
    DEVICE_REMOVED = "device-removed",

    PRODUCER_ADDED = "producer-added",
    PRODUCER_CHANGED = "producer-changed",
    PRODUCER_REMOVED = "producer-removed",

    ROUTER_ADDED = "router-added",
    ROUTER_CHANGED = "router-changed",
    ROUTER_REMOVED = "router-removed"
}

export enum ClientDeviceEvents {
    UPDATE_DEVICE = "update-device",

    HIDE_PRODUCER = "hide-producer",
    PUBLISH_PRODUCER = "publish-producer",

    ADD_PRODUCER = "add-producer",
    CHANGE_PRODUCER = "change-producer",
    REMOVE_PRODUCER = "remove-producer",
}


export enum ServerStageEvents {
    STAGE_READY = "stage-ready",

    STAGE_LEFT = "stage-left",
    STAGE_JOINED = "stage-joined",

    STAGE_ADDED = "stage-added",
    STAGE_CHANGED = "stage-changed",
    STAGE_REMOVED = "stage-removed",

    USER_ADDED = "user-added",
    USER_CHANGED = "user-changed",
    USER_REMOVED = "user-removed",

    GROUP_ADDED = "group-added",
    GROUP_CHANGED = "group-changed",
    GROUP_REMOVED = "group-removed",

    GROUP_MEMBER_ADDED = "group-member-added",
    GROUP_MEMBER_CHANGED = "group-member-changed",
    GROUP_MEMBER_REMOVED = "group-member-removed",

    CUSTOM_GROUP_VOLUME_ADDED = "custom-group-volume-added",
    CUSTOM_GROUP_VOLUME_CHANGED = "custom-group-volume-changed",
    CUSTOM_GROUP_VOLUME_REMOVED = "custom-group-volume-removed",

    CUSTOM_GROUP_MEMBER_VOLUME_ADDED = "custom-group-member-volume-added",
    CUSTOM_GROUP_MEMBER_VOLUME_CHANGED = "custom-group-member-volume-changed",
    CUSTOM_GROUP_MEMBER_VOLUME_REMOVED = "custom-group-member-volume-removed",

    STAGE_PRODUCER_ADDED = "stage-producer-added",
    STAGE_PRODUCER_CHANGED = "stage-producer-changed",
    STAGE_PRODUCER_REMOVED = "stage-producer-removed",
}

export enum ClientStageEvents {
    ADD_STAGE = "add-stage",

    JOIN_STAGE = "join-stage",
    LEAVE_STAGE = "leave-stage",
    LEAVE_STAGE_FOR_GOOD = "leave-stage-for-good",

    SET_CUSTOM_GROUP_VOLUME = "set-custom-group-volume",
    SET_CUSTOM_GROUP_MEMBER_VOLUME = "set-custom-group-member-volume",

    // Following shall be only possible if client is admin of stage
    CHANGE_STAGE = "change-stage",
    REMOVE_STAGE = "remove-stage",

    ADD_GROUP = "add-group",
    CHANGE_GROUP = "update-group",
    REMOVE_GROUP = "remove-group",

    CHANGE_GROUP_MEMBER = "update-group-member",
    REMOVE_GROUP_MEMBER = "remove-group-member",


    ADD_PRODUCER = "add-producer",
    CHANGE_PRODUCER = "change-producer",
    REMOVE_PRODUCER = "remove-producer",
}