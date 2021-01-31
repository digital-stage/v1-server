export enum ServerGlobalEvents {
  READY = 'ready',
}

export enum ServerRouterEvents {
  ROUTER_ADDED = 'router-added',
  ROUTER_CHANGED = 'router-changed',
  ROUTER_REMOVED = 'router-removed',

  MANAGE_STAGE = 'manage-stage',
  UN_MANAGE_STAGE = 'un-manage-stage',
}
export enum ClientRouterEvents {
  RESOLVE_PRODUCER = 'resolve-producer',
  STAGE_MANAGED = 'stage-managed',
  STAGE_UN_MANAGED = 'stage-unmanaged',
}

export enum ServerUserEvents {
  USER_READY = 'user-ready',
  USER_ADDED = 'user-added',
  USER_CHANGED = 'user-changed',
  USER_REMOVED = 'user-removed',
}

export enum ClientUserEvents {
  CHANGE_USER = 'change-user',
}

export enum ServerDeviceEvents {
  LOCAL_DEVICE_READY = 'local-device-ready',
  DEVICE_ADDED = 'device-added',
  DEVICE_CHANGED = 'device-changed',
  DEVICE_REMOVED = 'device-removed',

  SOUND_CARD_ADDED = 'sound-card-added',
  SOUND_CARD_CHANGED = 'sound-card-changed',
  SOUND_CARD_REMOVED = 'sound-card-removed',

  TRACK_PRESET_ADDED = 'track-preset-added',
  TRACK_PRESET_CHANGED = 'track-preset-changed',
  TRACK_PRESET_REMOVED = 'track-preset-removed',

  TRACK_ADDED = 'track-added',
  TRACK_CHANGED = 'track-changed',
  TRACK_REMOVED = 'track-removed',

  AUDIO_PRODUCER_ADDED = 'audio-producer-added',
  AUDIO_PRODUCER_CHANGED = 'audio-producer-changed',
  AUDIO_PRODUCER_REMOVED = 'audio-producer-removed',

  VIDEO_PRODUCER_ADDED = 'video-producer-added',
  VIDEO_PRODUCER_CHANGED = 'video-producer-changed',
  VIDEO_PRODUCER_REMOVED = 'video-producer-removed',

  ROUTER_ADDED = 'router-added',
  ROUTER_CHANGED = 'router-changed',
  ROUTER_REMOVED = 'router-removed',
}

export enum ClientDeviceEvents {
  ADD_DEVICE = 'add-device',
  UPDATE_DEVICE = 'update-device',

  ADD_AUDIO_PRODUCER = 'add-audio-producer',
  REMOVE_AUDIO_PRODUCER = 'remove-audio-producer',

  ADD_VIDEO_PRODUCER = 'add-video-producer',
  REMOVE_VIDEO_PRODUCER = 'remove-video-producer',

  ADD_SOUND_CARD = 'add-sound-card',
  CHANGE_SOUND_CARD = 'change-sound-card',
  REMOVE_SOUND_CARD = 'remove-sound-card',

  ADD_TRACK_PRESET = 'add-track-preset',
  CHANGE_TRACK_PRESET = 'change-track-preset',
  REMOVE_TRACK_PRESET = 'remove-track-preset',

  ADD_TRACK = 'add-track',
  CHANGE_TRACK = 'change-track',
  REMOVE_TRACK = 'remove-track',
}

export enum ServerStageEvents {
  MESSAGE_SENT = 'message-sent',

  STAGE_READY = 'stage-ready',

  STAGE_LEFT = 'stage-left',
  STAGE_JOINED = 'stage-joined',

  STAGE_ADDED = 'stage-added',
  STAGE_CHANGED = 'stage-changed',
  STAGE_REMOVED = 'stage-removed',

  USER_ADDED = 'remote-user-added',
  USER_CHANGED = 'remote-user-changed',
  USER_REMOVED = 'remote-user-removed',

  GROUP_ADDED = 'group-added',
  GROUP_CHANGED = 'group-changed',
  GROUP_REMOVED = 'group-removed',

  // DEPRECATED
  CUSTOM_GROUP_ADDED = 'custom-group-added',
  CUSTOM_GROUP_CHANGED = 'custom-group-changed',
  CUSTOM_GROUP_REMOVED = 'custom-group-removed',

  STAGE_MEMBER_ADDED = 'stage-member-added',
  STAGE_MEMBER_CHANGED = 'stage-member-changed',
  STAGE_MEMBER_REMOVED = 'stage-member-removed',

  CUSTOM_STAGE_MEMBER_ADDED = 'custom-stage-member-added',
  CUSTOM_STAGE_MEMBER_CHANGED = 'custom-stage-member-changed',
  CUSTOM_STAGE_MEMBER_REMOVED = 'custom-stage-member-removed',

  STAGE_MEMBER_VIDEO_ADDED = 'stage-member-video-added',
  STAGE_MEMBER_VIDEO_CHANGED = 'stage-member-video-changed',
  STAGE_MEMBER_VIDEO_REMOVED = 'stage-member-video-removed',

  STAGE_MEMBER_AUDIO_ADDED = 'stage-member-audio-added',
  STAGE_MEMBER_AUDIO_CHANGED = 'stage-member-audio-changed',
  STAGE_MEMBER_AUDIO_REMOVED = 'stage-member-audio-removed',

  STAGE_MEMBER_OV_ADDED = 'stage-member-ov-added',
  STAGE_MEMBER_OV_CHANGED = 'stage-member-ov-changed',
  STAGE_MEMBER_OV_REMOVED = 'stage-member-ov-removed',

  CUSTOM_STAGE_MEMBER_AUDIO_ADDED = 'custom-stage-member-audio-added',
  CUSTOM_STAGE_MEMBER_AUDIO_CHANGED = 'custom-stage-member-audio-changed',
  CUSTOM_STAGE_MEMBER_AUDIO_REMOVED = 'custom-stage-member-audio-removed',

  CUSTOM_STAGE_MEMBER_OV_ADDED = 'custom-stage-member-ov-added',
  CUSTOM_STAGE_MEMBER_OV_CHANGED = 'custom-stage-member-ov-changed',
  CUSTOM_STAGE_MEMBER_OV_REMOVED = 'custom-stage-member-ov-removed',
}

export enum ClientStageEvents {
  SEND_MESSAGE = 'send-message',

  ADD_STAGE = 'add-stage',

  JOIN_STAGE = 'join-stage',
  LEAVE_STAGE = 'leave-stage',
  LEAVE_STAGE_FOR_GOOD = 'leave-stage-for-good',

  SET_CUSTOM_GROUP = 'set-custom-group',
  REMOVE_CUSTOM_GROUP = 'remove-custom-group',

  SET_CUSTOM_STAGE_MEMBER = 'set-custom-stage-member',
  REMOVE_CUSTOM_STAGE_MEMBER = 'remove-custom-stage-member',

  SET_CUSTOM_STAGE_MEMBER_AUDIO = 'set-custom-stage-member-audio',
  REMOVE_CUSTOM_STAGE_MEMBER_AUDIO = 'remove-custom-stage-member-audio',

  ADD_CUSTOM_STAGE_MEMBER_OV = 'add-custom-stage-member-ov',
  UPDATE_CUSTOM_STAGE_MEMBER_OV = 'update-custom-stage-member-ov',
  SET_CUSTOM_STAGE_MEMBER_OV = 'set-custom-stage-member-ov',
  REMOVE_CUSTOM_STAGE_MEMBER_OV = 'remove-custom-stage-member-ov',

  // Following shall be only possible if client is admin of stage
  CHANGE_STAGE = 'change-stage',
  REMOVE_STAGE = 'remove-stage',

  ADD_GROUP = 'add-group',
  CHANGE_GROUP = 'update-group',
  REMOVE_GROUP = 'remove-group',

  CHANGE_STAGE_MEMBER = 'update-stage-member',
  REMOVE_STAGE_MEMBER = 'remove-stage-member',

  CHANGE_STAGE_MEMBER_OV = 'update-stage-member-ov',
  CHANGE_STAGE_MEMBER_AUDIO = 'update-stage-member-audio',
}
