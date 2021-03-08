export enum ServerGlobalEvents {
  READY = "ready",
}

export enum ServerRouterEvents {
  ROUTER_ADDED = "router-added",
  ROUTER_CHANGED = "router-changed",
  ROUTER_REMOVED = "router-removed",

  MANAGE_STAGE = "manage-stage",
  UN_MANAGE_STAGE = "un-manage-stage",
}
export enum ClientRouterEvents {
  RESOLVE_PRODUCER = "resolve-producer",
  STAGE_MANAGED = "stage-managed",
  STAGE_UN_MANAGED = "stage-unmanaged",
}

export enum ServerUserEvents {
  USER_READY = "user-ready",
  USER_ADDED = "user-added",
  USER_CHANGED = "user-changed",
  USER_REMOVED = "user-removed",
}

export enum ClientUserEvents {
  CHANGE_USER = "change-user",
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

  AUDIO_PRODUCER_ADDED = "audio-producer-added",
  AUDIO_PRODUCER_CHANGED = "audio-producer-changed",
  AUDIO_PRODUCER_REMOVED = "audio-producer-removed",

  VIDEO_PRODUCER_ADDED = "video-producer-added",
  VIDEO_PRODUCER_CHANGED = "video-producer-changed",
  VIDEO_PRODUCER_REMOVED = "video-producer-removed",

  ROUTER_ADDED = "router-added",
  ROUTER_CHANGED = "router-changed",
  ROUTER_REMOVED = "router-removed",
}

export enum ClientDeviceEvents {
  ADD_DEVICE = "add-device",
  UPDATE_DEVICE = "update-device",

  ADD_AUDIO_PRODUCER = "add-audio-producer",
  REMOVE_AUDIO_PRODUCER = "remove-audio-producer",

  ADD_VIDEO_PRODUCER = "add-video-producer",
  REMOVE_VIDEO_PRODUCER = "remove-video-producer",

  SET_SOUND_CARD = "set-sound-card",
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
  MESSAGE_SENT = "m-s",

  STAGE_READY = "s-r",

  STAGE_LEFT = "s-l",
  STAGE_JOINED = "s-j",

  STAGE_ADDED = "s-a",
  STAGE_CHANGED = "s-c",
  STAGE_REMOVED = "s-r",

  REMOTE_USER_ADDED = "r-u-a",
  REMOTE_USER_CHANGED = "r-u-c",
  REMOTE_USER_REMOVED = "r-u-r",

  GROUP_ADDED = "g-a",
  GROUP_CHANGED = "g-c",
  GROUP_REMOVED = "g-r",

  CUSTOM_GROUP_POSITION_ADDED = "c-g-p-a",
  CUSTOM_GROUP_POSITION_CHANGED = "c-g-p-c",
  CUSTOM_GROUP_POSITION_REMOVED = "c-g-p-r",
  CUSTOM_GROUP_VOLUME_ADDED = "c-g-v-a",
  CUSTOM_GROUP_VOLUME_CHANGED = "c-g-v-c",
  CUSTOM_GROUP_VOLUME_REMOVED = "c-g-v-r",

  STAGE_MEMBER_ADDED = "sm-a",
  STAGE_MEMBER_CHANGED = "sm-c",
  STAGE_MEMBER_REMOVED = "sm-r",

  CUSTOM_STAGE_MEMBER_VOLUME_ADDED = "c-sm-v-a",
  CUSTOM_STAGE_MEMBER_VOLUME_CHANGED = "c-sm-v-c",
  CUSTOM_STAGE_MEMBER_VOLUME_REMOVED = "c-sm-v-r",
  CUSTOM_STAGE_MEMBER_POSITION_ADDED = "c-sm-p-a",
  CUSTOM_STAGE_MEMBER_POSITION_CHANGED = "c-sm-p-c",
  CUSTOM_STAGE_MEMBER_POSITION_REMOVED = "c-sm-p-r",

  STAGE_MEMBER_VIDEO_ADDED = "sm-v-a",
  STAGE_MEMBER_VIDEO_CHANGED = "sm-v-c",
  STAGE_MEMBER_VIDEO_REMOVED = "sm-v-r",

  STAGE_MEMBER_AUDIO_ADDED = "sm-a-a",
  STAGE_MEMBER_AUDIO_CHANGED = "sm-a-c",
  STAGE_MEMBER_AUDIO_REMOVED = "sm-a-r",

  STAGE_MEMBER_OV_ADDED = "sm-ov-a",
  STAGE_MEMBER_OV_CHANGED = "sm-ov-c",
  STAGE_MEMBER_OV_REMOVED = "sm-ov-r",

  CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_ADDED = "c-sm-a-v-a",
  CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_CHANGED = "c-sm-a-v-c",
  CUSTOM_STAGE_MEMBER_AUDIO_VOLUME_REMOVED = "c-sm-a-v-r",
  CUSTOM_STAGE_MEMBER_AUDIO_POSITION_ADDED = "c-sm-a-p-a",
  CUSTOM_STAGE_MEMBER_AUDIO_POSITION_CHANGED = "c-sm-a-p-c",
  CUSTOM_STAGE_MEMBER_AUDIO_POSITION_REMOVED = "c-sm-a-p-r",

  CUSTOM_STAGE_MEMBER_OV_POSITION_ADDED = "c-sm-ov-p-a",
  CUSTOM_STAGE_MEMBER_OV_POSITION_CHANGED = "c-sm-ov-p-c",
  CUSTOM_STAGE_MEMBER_OV_POSITION_REMOVED = "c-sm-ov-p-r",
  CUSTOM_STAGE_MEMBER_OV_VOLUME_ADDED = "c-sm-ov-v-a",
  CUSTOM_STAGE_MEMBER_OV_VOLUME_CHANGED = "c-sm-ov-v-c",
  CUSTOM_STAGE_MEMBER_OV_VOLUME_REMOVED = "c-sm-ov-v-r",
}

export enum ClientStageEvents {
  SEND_MESSAGE = "send-message",

  ADD_STAGE = "add-stage",

  JOIN_STAGE = "join-stage",
  LEAVE_STAGE = "leave-stage",
  LEAVE_STAGE_FOR_GOOD = "leave-stage-for-good",

  SET_CUSTOM_GROUP_VOLUME = "s-c-g-v",
  REMOVE_CUSTOM_GROUP_VOLUME = "r-c-g-v",
  SET_CUSTOM_GROUP_POSITION = "s-c-g-p",
  REMOVE_CUSTOM_GROUP_POSITION = "r-c-g-p",

  SET_CUSTOM_STAGE_MEMBER_POSITION = "s-c-sm-p",
  REMOVE_CUSTOM_STAGE_MEMBER_POSITION = "r-c-sm-p",
  SET_CUSTOM_STAGE_MEMBER_VOLUME = "s-c-sm-v",
  REMOVE_CUSTOM_STAGE_MEMBER_VOLUME = "r-c-sm-v",

  SET_CUSTOM_REMOTE_AUDIO_VOLUME = "s-c-sm-a-v",
  REMOVE_CUSTOM_REMOTE_AUDIO_VOLUME = "r-c-sm-a-v",
  SET_CUSTOM_REMOTE_AUDIO_POSITION = "s-c-sm-a-p",
  REMOVE_CUSTOM_REMOTE_AUDIO_POSITION = "r-c-sm-a-p",

  SET_CUSTOM_REMOTE_OV_VOLUME = "s-c-sm-ov-v",
  REMOVE_CUSTOM_REMOTE_OV_VOLUME = "r-c-sm-ov-v",
  SET_CUSTOM_REMOTE_OV_POSITION = "s-c-sm-ov-p",
  REMOVE_CUSTOM_REMOTE_OV_POSITION = "r-c-sm-ov-p",

  // Following shall be only possible if client is admin of stage
  CHANGE_STAGE = "change-stage",
  REMOVE_STAGE = "remove-stage",

  ADD_GROUP = "add-group",
  CHANGE_GROUP = "update-group",
  REMOVE_GROUP = "remove-group",

  CHANGE_STAGE_MEMBER = "update-stage-member",
  REMOVE_STAGE_MEMBER = "remove-stage-member",

  CHANGE_STAGE_MEMBER_OV = "update-stage-member-ov",
  CHANGE_STAGE_MEMBER_AUDIO = "update-stage-member-audio",
}
