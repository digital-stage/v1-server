export enum ServerGlobalEvents {
    READY = "ready"
}

export enum ServerUserEvents {
    USER_READY = "user-ready",
    USER_CHANGED = "user-changed"
}

export enum ClientUserEvents {
    CHANGE_USER = "change-user"
}

export enum ServerDeviceEvents {
    LOCAL_DEVICE_READY = "local-device-ready",
    DEVICE_ADDED = "device-added",
    DEVICE_CHANGED = "device-changed",
    DEVICE_REMOVED = "device-removed",

    SOUND_CARD_ADDED = "sound-card-added",
    SOUND_CARD_CHANGED = "sound-card-changed",
    SOUND_CARD_REMOVED = "sound-card-removed",

    TRACK_PRESET_ADDED = "track-preset-added",
    TRACK_PRESET_CHANGED = "track-preset-changed",
    TRACK_PRESET_REMOVED = "track-preset-removed",

    TRACK_ADDED = "track-added",
    TRACK_CHANGED = "track-changed",
    TRACK_REMOVED = "track-removed",

    PRODUCER_ADDED = "producer-added",
    PRODUCER_CHANGED = "producer-changed",
    PRODUCER_REMOVED = "producer-removed",

    ROUTER_ADDED = "router-added",
    ROUTER_CHANGED = "router-changed",
    ROUTER_REMOVED = "router-removed"
}

export enum ClientDeviceEvents {
    UPDATE_DEVICE = "update-device",

    ADD_PRODUCER = "add-producer",
    CHANGE_PRODUCER = "change-producer",
    REMOVE_PRODUCER = "remove-producer",

    ADD_SOUND_CARD = "add-sound-card",
    CHANGE_SOUND_CARD = "change-sound-card",
    REMOVE_SOUND_CARD = "remove-sound-card",

    ADD_TRACK_PRESET = "add-track-preset",
    CHANGE_TRACK_PRESET = "change-track-preset",
    REMOVE_TRACK_PRESET = "remove-track-preset",

    ADD_TRACK = "add-track",
    CHANGE_TRACK = "change-track",
    REMOVE_TRACK = "remove-track",
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

    CUSTOM_GROUP_ADDED = "custom-group-added",
    CUSTOM_GROUP_CHANGED = "custom-group-changed",
    CUSTOM_GROUP_REMOVED = "custom-group-removed",

    STAGE_MEMBER_ADDED = "stage-member-added",
    STAGE_MEMBER_CHANGED = "stage-member-changed",
    STAGE_MEMBER_REMOVED = "stage-member-removed",

    CUSTOM_STAGE_MEMBER_ADDED = "custom-stage-member-added",
    CUSTOM_STAGE_MEMBER_CHANGED = "custom-stage-member-changed",
    CUSTOM_STAGE_MEMBER_REMOVED = "custom-stage-member-removed",

    STAGE_MEMBER_TRACK_ADDED = "stage-member-track-added",
    STAGE_MEMBER_TRACK_CHANGED = "stage-member-track-changed",
    STAGE_MEMBER_TRACK_REMOVED = "stage-member-track-removed",

    CUSTOM_STAGE_MEMBER_TRACK_ADDED = "stage-member-track-added",
    CUSTOM_STAGE_MEMBER_TRACK_CHANGED = "stage-member-track-changed",
    CUSTOM_STAGE_MEMBER_TRACK_REMOVED = "stage-member-track-removed",
}

export enum ClientStageEvents {
    ADD_STAGE = "add-stage",

    JOIN_STAGE = "join-stage",
    LEAVE_STAGE = "leave-stage",
    LEAVE_STAGE_FOR_GOOD = "leave-stage-for-good",

    SET_CUSTOM_GROUP = "set-custom-group",
    SET_CUSTOM_STAGE_MEMBER = "set-custom-stage-member",
    SET_CUSTOM_STAGE_MEMBER_TRACK = "set-custom-stage-member-track",

    // Following shall be only possible if client is admin of stage
    CHANGE_STAGE = "change-stage",
    REMOVE_STAGE = "remove-stage",

    ADD_GROUP = "add-group",
    CHANGE_GROUP = "update-group",
    REMOVE_GROUP = "remove-group",

    CHANGE_STAGE_MEMBER = "update-stage-member",

    CHANGE_STAGE_MEMBER_TRACK = "update-stage-member-track"
}