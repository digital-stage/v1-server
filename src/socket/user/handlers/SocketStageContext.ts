import { ObjectId } from "mongodb";
import { ITeckosSocket } from "teckos";
import MongoRealtimeDatabase from "../../../database/MongoRealtimeDatabase";
import { ChatMessage, User } from "../../../types";
import { ClientStageEvents, ServerStageEvents } from "../../../events";
import {
  AddGroupPayload,
  AddStagePayload,
  ChangeGroupPayload,
  ChangeStageMemberAudioProducerPayload,
  ChangeStageMemberOvTrackPayload,
  ChangeStageMemberPayload,
  ChangeStagePayload,
  JoinStagePayload,
  LeaveStageForGoodPayload,
  RemoveCustomGroupPositionPayload,
  RemoveCustomGroupVolumePayload,
  RemoveCustomRemoteAudioPositionPayload,
  RemoveCustomRemoteAudioVolumePayload,
  RemoveCustomRemoteOvPositionPayload,
  RemoveCustomRemoteOvVolumePayload,
  RemoveCustomStageMemberPositionPayload,
  RemoveCustomStageMemberVolumePayload,
  RemoveGroupPayload,
  RemoveStagePayload,
  SendChatMessagePayload,
  SetCustomGroupPositionPayload,
  SetCustomGroupVolumePayload,
  SetCustomRemoteAudioPositionPayload,
  SetCustomRemoteAudioVolumePayload,
  SetCustomRemoteOvPositionPayload,
  SetCustomRemoteOvVolumePayload,
  SetCustomStageMemberPositionPayload,
  SetCustomStageMemberVolumePayload,
} from "../../../payloads";
import logger from "../../../logger";

const { trace, error } = logger("socket:stage");

class SocketStageContext {
  private readonly user: User;

  private readonly socket: ITeckosSocket;

  private readonly database: MongoRealtimeDatabase;

  constructor(
    database: MongoRealtimeDatabase,
    user: User,
    socket: ITeckosSocket
  ) {
    this.user = user;
    this.database = database;
    this.socket = socket;
  }

  init() {
    // STAGE MANAGEMENT
    this.socket.on(
      ClientStageEvents.SEND_MESSAGE,
      (payload: SendChatMessagePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SEND_MESSAGE}(${payload})`
        );
        return this.database
          .readUser(this.user._id)
          .then((user) => {
            if (user && user.stageId && user.stageMemberId) {
              const chatMessage: ChatMessage = {
                userId: this.user._id,
                stageMemberId: this.user.stageMemberId,
                message: payload,
                time: Date.now(),
              };
              return this.database.sendToStage(
                user.stageId,
                ServerStageEvents.MESSAGE_SENT,
                chatMessage
              );
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(ClientStageEvents.ADD_STAGE, (payload: AddStagePayload) =>
      this.database
        .createStage({
          ...payload,
          admins: [this.user._id],
        })
        .then(() =>
          trace(`User ${this.user.name} created stage ${payload.name}`)
        )
        .catch((e) => error(e))
    );
    this.socket.on(
      ClientStageEvents.CHANGE_STAGE,
      (payload: ChangeStagePayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_STAGE}`);
        // CHANGE STAGE
        const id = new ObjectId(payload.id);
        return this.database
          .readManagedStage(this.user._id, id)
          .then((stage) => {
            if (stage) {
              return this.database
                .updateStage(id, payload.update)
                .then(() =>
                  trace(`User ${this.user.name} changed stage ${payload.id}`)
                );
            }
            throw new Error(
              `Unknown stage or user has no privileges to change stage ${id}`
            );
          })
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_STAGE,
      (payload: RemoveStagePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_STAGE}(${payload})`
        );
        const id = new ObjectId(payload);
        return this.database
          .readManagedStage(this.user._id, id)
          .then((stage) => {
            if (stage) return this.database.deleteStage(id);
            throw new Error(
              `Unknown stage or user has no privileges to delete stage ${id}`
            );
          })
          .catch((e) => error(e));
      }
    );

    // GROUP MANAGEMENT
    this.socket.on(ClientStageEvents.ADD_GROUP, (payload: AddGroupPayload) => {
      trace(`${this.user.name}: ${ClientStageEvents.ADD_GROUP}`);
      const stageId = new ObjectId(payload.stageId);
      return this.database
        .readManagedStage(this.user._id, stageId)
        .then((stage) => {
          if (stage) {
            return this.database.createGroup({
              stageId,
              name: payload.name,
              x: 0,
              y: 0,
              z: 0,
              rX: 0,
              rY: 0,
              rZ: 0,
              volume: 1,
              muted: false,
            });
          }
          throw new Error(
            `User has no privileges to add group for stage ${stageId}`
          );
        })
        .catch((e) => error(e));
    });
    this.socket.on(
      ClientStageEvents.CHANGE_GROUP,
      (payload: ChangeGroupPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_GROUP}`);
        const id = new ObjectId(payload.id);
        return this.database
          .readGroup(id)
          .then((group) => {
            if (group) {
              return this.database
                .readManagedStage(this.user._id, group.stageId)
                .then((stage) => {
                  if (stage) {
                    return this.database.updateGroup(id, {
                      ...payload.update,
                    });
                  }
                  throw new Error(
                    `User has no privileges to change group ${id}`
                  );
                })
                .catch((e) => error(e));
            }
            throw new Error(`Unknown group ${id}`);
          })
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_GROUP,
      (payload: RemoveGroupPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_GROUP}(${payload})`
        );
        // REMOVE GROUP
        const id = new ObjectId(payload);
        this.database
          .readGroup(id)
          .then((group) => {
            if (group) {
              return this.database
                .readManagedStage(this.user._id, group.stageId)
                .then((stage) => {
                  if (stage) return this.database.deleteGroup(id);
                  return null;
                });
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientStageEvents.CHANGE_STAGE_MEMBER_AUDIO,
      (payload: ChangeStageMemberAudioProducerPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.CHANGE_STAGE_MEMBER_AUDIO}`
        );
        const id = new ObjectId(payload.id);
        return this.database
          .readRemoteAudioProducer(id)
          .then((audioProducer) => {
            if (audioProducer) {
              return this.database
                .readManagedStage(this.user._id, audioProducer.stageId)
                .then((stage) => {
                  if (stage) {
                    return this.database.updateRemoteAudioProducer(
                      id,
                      payload.update
                    );
                  }
                  throw new Error(
                    `User has no privileges to change stage member audio ${id}`
                  );
                });
            }
            throw new Error(`Unknown stage member audio ${id}`);
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientStageEvents.CHANGE_STAGE_MEMBER_OV,
      (payload: ChangeStageMemberOvTrackPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_STAGE_MEMBER_OV}`);
        const id = new ObjectId(payload.id);
        return this.database
          .readRemoteOvTrack(id)
          .then((audioProducer) => {
            if (audioProducer) {
              return this.database
                .readManagedStage(this.user._id, audioProducer.stageId)
                .then((stage) => {
                  if (stage) {
                    return this.database.updateRemoteOvTrack(
                      id,
                      payload.update
                    );
                  }
                  throw new Error(
                    `User has no privileges to change stage member ov track ${id}`
                  );
                });
            }
            throw new Error(`Unknown stage member ov track ${id}`);
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientStageEvents.SET_CUSTOM_GROUP_VOLUME,
      (payload: SetCustomGroupVolumePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SET_CUSTOM_GROUP_VOLUME}`
        );
        const groupId = new ObjectId(payload.groupId);
        return this.database
          .setCustomGroupVolume(this.user._id, groupId, payload.update)
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_CUSTOM_GROUP_VOLUME,
      (payload: RemoveCustomGroupVolumePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_GROUP_VOLUME}`
        );
        const id = new ObjectId(payload);
        this.database
          .readCustomGroupVolume(id)
          .then((group) => {
            if (group && group.userId.equals(this.user._id)) {
              return this.database.deleteCustomGroupVolume(id);
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.SET_CUSTOM_GROUP_POSITION,
      (payload: SetCustomGroupPositionPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SET_CUSTOM_GROUP_POSITION}`
        );
        const groupId = new ObjectId(payload.groupId);
        return this.database
          .setCustomGroupPosition(this.user._id, groupId, payload.update)
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_CUSTOM_GROUP_POSITION,
      (payload: RemoveCustomGroupPositionPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_GROUP_POSITION}`
        );
        const id = new ObjectId(payload);
        this.database
          .readCustomGroupPosition(id)
          .then((group) => {
            if (group && group.userId.equals(this.user._id)) {
              return this.database.deleteCustomGroupPosition(id);
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_VOLUME,
      (payload: SetCustomStageMemberVolumePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_VOLUME}`
        );
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const stageMemberId = new ObjectId(payload.stageMemberId);
        this.database
          .setCustomStageMemberVolume(
            this.user._id,
            stageMemberId,
            payload.update
          )
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_VOLUME,
      (payload: RemoveCustomStageMemberVolumePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_VOLUME}`
        );
        const id = new ObjectId(payload);
        this.database
          .readCustomStageMemberVolume(id)
          .then((item) => {
            if (item && item.userId.equals(this.user._id)) {
              return this.database.deleteCustomStageMemberVolume(id);
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_POSITION,
      (payload: SetCustomStageMemberPositionPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_POSITION}`
        );
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const stageMemberId = new ObjectId(payload.stageMemberId);
        this.database
          .setCustomStageMemberPosition(
            this.user._id,
            stageMemberId,
            payload.update
          )
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_POSITION,
      (payload: RemoveCustomStageMemberPositionPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_POSITION}`
        );
        const id = new ObjectId(payload);
        this.database
          .readCustomStageMemberPosition(id)
          .then((item) => {
            if (item && item.userId.equals(this.user._id)) {
              return this.database.deleteCustomStageMemberPosition(id);
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientStageEvents.SET_CUSTOM_REMOTE_AUDIO_VOLUME,
      (payload: SetCustomRemoteAudioVolumePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SET_CUSTOM_REMOTE_AUDIO_VOLUME}`
        );
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const remoteAudioProducerId = new ObjectId(
          payload.remoteAudioProducerId
        );
        this.database
          .setCustomRemoteAudioProducerVolume(
            this.user._id,
            remoteAudioProducerId,
            payload.update
          )
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_CUSTOM_REMOTE_AUDIO_VOLUME,
      (payload: RemoveCustomRemoteAudioVolumePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_REMOTE_AUDIO_VOLUME}`
        );
        const id = new ObjectId(payload);
        return this.database
          .readCustomRemoteAudioProducerVolume(id)
          .then((group) => {
            if (group && group.userId.equals(this.user._id)) {
              return this.database.deleteCustomRemoteAudioProducerVolume(id);
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.SET_CUSTOM_REMOTE_AUDIO_POSITION,
      (payload: SetCustomRemoteAudioPositionPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SET_CUSTOM_REMOTE_AUDIO_POSITION}`
        );
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const remoteAudioProducerId = new ObjectId(
          payload.remoteAudioProducerId
        );
        this.database
          .setCustomRemoteAudioProducerPosition(
            this.user._id,
            remoteAudioProducerId,
            payload.update
          )
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_CUSTOM_REMOTE_AUDIO_POSITION,
      (payload: RemoveCustomRemoteAudioPositionPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_REMOTE_AUDIO_POSITION}`
        );
        const id = new ObjectId(payload);
        return this.database
          .readCustomRemoteAudioProducerPosition(id)
          .then((audioProducer) => {
            if (audioProducer && audioProducer.userId.equals(this.user._id)) {
              return this.database.deleteCustomRemoteAudioProducerPosition(id);
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );

    this.socket.on(
      ClientStageEvents.SET_CUSTOM_REMOTE_OV_VOLUME,
      (payload: SetCustomRemoteOvVolumePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SET_CUSTOM_REMOTE_OV_VOLUME}`
        );
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const remoteOvTrackId = new ObjectId(payload.remoteOvTrackId);
        this.database
          .setCustomRemoteOvTrackVolume(
            this.user._id,
            remoteOvTrackId,
            payload.update
          )
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_CUSTOM_REMOTE_OV_VOLUME,
      (payload: RemoveCustomRemoteOvVolumePayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_REMOTE_OV_VOLUME}`
        );
        const id = new ObjectId(payload);
        return this.database
          .readCustomRemoteOvTrackVolume(id)
          .then((item) => {
            if (item && item.userId.equals(this.user._id)) {
              return this.database.deleteCustomRemoteOvTrackVolume(id);
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.SET_CUSTOM_REMOTE_OV_POSITION,
      (payload: SetCustomRemoteOvPositionPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.SET_CUSTOM_REMOTE_OV_POSITION}`
        );
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const remoteOvTrackId = new ObjectId(payload.remoteOvTrackId);
        this.database
          .setCustomRemoteOvTrackPosition(
            this.user._id,
            remoteOvTrackId,
            payload.update
          )
          .catch((e) => error(e));
      }
    );
    this.socket.on(
      ClientStageEvents.REMOVE_CUSTOM_REMOTE_OV_POSITION,
      (payload: RemoveCustomRemoteOvPositionPayload) => {
        trace(
          `${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_REMOTE_OV_POSITION}`
        );
        const id = new ObjectId(payload);
        return this.database
          .readCustomRemoteOvTrackPosition(id)
          .then((item) => {
            if (item && item.userId.equals(this.user._id)) {
              return this.database.deleteCustomRemoteOvTrackPosition(id);
            }
            return null;
          })
          .catch((e) => error(e));
      }
    );

    // STAGE MEMBER MANAGEMENT
    this.socket.on(
      ClientStageEvents.CHANGE_STAGE_MEMBER,
      (payload: ChangeStageMemberPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_STAGE_MEMBER}`);
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        // REMOVE GROUPS
        const id = new ObjectId(payload.id);
        this.database
          .readStageMember(id)
          .then((stageMember) => {
            if (stageMember) {
              return this.database
                .readManagedStage(this.user._id, stageMember.stageId)
                .then((stage) => {
                  if (stage)
                    return this.database.updateStageMember(id, payload.update);
                  throw new Error(
                    `User has no privileges to change stage member ${id}`
                  );
                });
            }
            throw new Error(`Unknown stage member ${id}`);
          })
          .catch((e) => error(e));
      }
    );

    // STAGE MEMBERSHIP MANAGEMENT
    this.socket.on(
      ClientStageEvents.JOIN_STAGE,
      (payload: JoinStagePayload, fn: (error?: string) => void) => {
        trace(`${this.user.name}: ${ClientStageEvents.JOIN_STAGE}`);
        // JOIN STAGE
        const stageId = new ObjectId(payload.stageId);
        const groupId = new ObjectId(payload.groupId);
        return this.database
          .joinStage(this.user._id, stageId, groupId, payload.password)
          .then(() =>
            trace(
              `${this.user.name} joined stage ${stageId} and group ${groupId}`
            )
          )
          .then(() => fn())
          .catch((e) => {
            error(e);
            return fn(e.message);
          });
      }
    );
    this.socket.on(ClientStageEvents.LEAVE_STAGE, () =>
      this.database
        .leaveStage(this.user._id)
        .then(() => trace(`${this.user.name} left stage`))
    );

    this.socket.on(
      ClientStageEvents.LEAVE_STAGE_FOR_GOOD,
      (payload: LeaveStageForGoodPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.LEAVE_STAGE_FOR_GOOD}`);
        // LEAVE STAGE FOR GOOD
        const stageId = new ObjectId(payload);
        return this.database
          .leaveStageForGood(this.user._id, stageId)
          .then(() => trace(`${this.user.name} left stage for good`))
          .catch((e) => error(e));
      }
    );

    trace(
      `Registered handler for user ${this.user.name} at socket ${this.socket.id}`
    );
  }

  sendStages(): Promise<void> {
    trace("Sending stages");
    return this.database.sendStageDataToDevice(this.socket, this.user);
  }
}

export default SocketStageContext;
