import { ObjectId } from 'mongodb';
import { ITeckosSocket } from 'teckos';
import debug from 'debug';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import { User } from '../types';
import { ClientStageEvents } from '../events';
import {
  AddGroupPayload,
  AddStagePayload,
  ChangeGroupPayload, ChangeStageMemberAudioProducerPayload, ChangeStageMemberOvTrackPayload,
  ChangeStageMemberPayload,
  ChangeStagePayload,
  JoinStagePayload, LeaveStageForGoodPayload,
  RemoveCustomGroupPayload,
  RemoveCustomStageMemberAudioPayload,
  RemoveCustomStageMemberOvPayload,
  RemoveCustomStageMemberPayload,
  RemoveGroupPayload,
  RemoveStagePayload,
  SetCustomGroupPayload, SetCustomStageMemberAudioPayload,
  SetCustomStageMemberOvPayload, SetCustomStageMemberPayload,
} from '../payloads';

const d = debug('server').extend('socket').extend('stage');
const trace = d.extend('trace');
const err = d.extend('err');

class SocketStageHandler {
  private readonly user: User;

  private readonly socket: ITeckosSocket;

  private readonly database: MongoRealtimeDatabase;

  constructor(database: MongoRealtimeDatabase, user: User, socket: ITeckosSocket) {
    this.user = user;
    this.database = database;
    this.socket = socket;
  }

  init() {
    // STAGE MANAGEMENT
    this.socket.on(ClientStageEvents.ADD_STAGE,
      (payload: AddStagePayload) => this.database.createStage({
        ...payload,
        admins: [this.user._id],
      })
        .then(() => trace(`User ${this.user.name} created stage ${payload.name}`))
        .catch((error) => err(error)));
    this.socket.on(ClientStageEvents.CHANGE_STAGE, (payload: ChangeStagePayload) => {
      trace(`${this.user.name}: ${ClientStageEvents.CHANGE_STAGE}`);
      // CHANGE STAGE
      const id = new ObjectId(payload.id);
      this.database.readManagedStage(this.user._id, id)
        .then((stage) => {
          if (stage) {
            this.database.updateStage(id, payload.update)
              .then(() => trace(`User ${this.user.name} changed stage ${payload.id}`))
              .catch((error) => err(error));
          }
        });
    });
    this.socket.on(ClientStageEvents.REMOVE_STAGE,
      (payload: RemoveStagePayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.REMOVE_STAGE}(${payload})`);
        const id = new ObjectId(payload);
        this.database.readManagedStage(this.user._id, id)
          .then((stage) => {
            if (stage) return this.database.deleteStage(id);
            return null;
          }).catch((error) => err(error));
      });

    // GROUP MANAGEMENT
    this.socket.on(ClientStageEvents.ADD_GROUP,
      (payload: AddGroupPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.ADD_GROUP}`);
        const stageId = new ObjectId(payload.stageId);
        this.database.readManagedStage(this.user._id, stageId)
          .then((stage) => {
            if (stage) {
              this.database.createGroup({
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
              }).catch((error) => err(error));
            }
          });
      });
    this.socket.on(ClientStageEvents.CHANGE_GROUP,
      (payload: ChangeGroupPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_GROUP}`);
        const id = new ObjectId(payload.id);
        return this.database.readGroup(id)
          .then((group) => {
            if (group) {
              this.database.readManagedStage(this.user._id, group.stageId)
                .then((stage) => {
                  if (stage) {
                    return this.database.updateGroup(id, {
                      ...payload.update,
                    });
                  }
                  return null;
                }).catch((error) => err(error));
            }
          }).catch((error) => err(error));
      });
    this.socket.on(ClientStageEvents.REMOVE_GROUP,
      (payload: RemoveGroupPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.REMOVE_GROUP}(${payload})`);
        // REMOVE GROUP
        const id = new ObjectId(payload);
        this.database.readGroup(id)
          .then((group) => {
            if (group) {
              return this.database.readManagedStage(this.user._id, group.stageId)
                .then((stage) => {
                  if (stage) return this.database.deleteGroup(id);
                  return null;
                });
            }
            return null;
          }).catch((error) => err(error));
      });

    this.socket.on(ClientStageEvents.CHANGE_STAGE_MEMBER_AUDIO,
      (payload: ChangeStageMemberAudioProducerPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_STAGE_MEMBER_AUDIO}`);
        const id = new ObjectId(payload.id);
        this.database.readStageMemberAudioProducer(id)
          .then((audioProducer) => {
            if (audioProducer) {
              this.database.readManagedStage(this.user._id, audioProducer.stageId)
                .then((stage) => {
                  if (stage) {
                    return this.database.updateStageMemberAudioProducer(id, payload.update);
                  }
                  return null;
                });
            }
          }).catch((error) => err(error));
      });

    this.socket.on(ClientStageEvents.CHANGE_STAGE_MEMBER_OV,
      (payload: ChangeStageMemberOvTrackPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_STAGE_MEMBER_OV}`);
        const id = new ObjectId(payload.id);
        this.database.readStageMemberOvTrack(id)
          .then((audioProducer) => {
            if (audioProducer) {
              this.database.readManagedStage(this.user._id, audioProducer.stageId)
                .then((stage) => {
                  if (stage) {
                    return this.database.updateStageMemberOvTrack(id, payload.update);
                  }
                  return null;
                });
            }
          }).catch((error) => err(error));
      });

    this.socket.on(ClientStageEvents.SET_CUSTOM_GROUP, (payload: SetCustomGroupPayload) => {
      trace(`${this.user.name}: ${ClientStageEvents.SET_CUSTOM_GROUP}`);
      const groupId = new ObjectId(payload.groupId);
      return this.database.setCustomGroup(this.user._id, groupId, payload.update)
        .catch((error) => err(error));
    });

    this.socket.on(ClientStageEvents.REMOVE_CUSTOM_GROUP, (payload: RemoveCustomGroupPayload) => {
      trace(`${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_GROUP}`);
      const id = new ObjectId(payload);
      this.database.readCustomGroup(id)
        .then((group) => {
          if (group && group.userId.equals(this.user._id)) {
            return this.database.deleteCustomGroup(id);
          }
          return null;
        }).catch((error) => err(error));
    });

    this.socket.on(ClientStageEvents.SET_CUSTOM_STAGE_MEMBER,
      (payload: SetCustomStageMemberPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.SET_CUSTOM_STAGE_MEMBER}`);
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const stageMemberId = new ObjectId(payload.stageMemberId);
        this.database.setCustomStageMember(this.user._id, stageMemberId, payload.update)
          .catch((error) => err(error));
      });

    this.socket.on(ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER,
      (payload: RemoveCustomStageMemberPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER}`);
        const id = new ObjectId(payload);
        this.database.readCustomStageMember(id)
          .then((item) => {
            if (item && item.userId.equals(this.user._id)) {
              return this.database.deleteCustomStageMember(id);
            }
            return null;
          }).catch((error) => err(error));
      });

    this.socket.on(ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_AUDIO,
      (payload: SetCustomStageMemberAudioPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_AUDIO}`);
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const stageMemberAudioId = new ObjectId(payload.stageMemberAudioId);
        this.database.setCustomStageMemberAudioProducer(
          this.user._id,
          stageMemberAudioId,
          payload.update,
        )
          .catch((error) => err(error));
      });

    this.socket.on(ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_AUDIO,
      (payload: RemoveCustomStageMemberAudioPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_AUDIO}`);
        const id = new ObjectId(payload);
        return this.database.readCustomStageMemberAudioProducer(id)
          .then((group) => {
            if (group && group.userId.equals(this.user._id)) {
              return this.database.deleteCustomStageMemberAudioProducer(id);
            }
            return null;
          }).catch((error) => err(error));
      });

    this.socket.on(ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_OV,
      (payload: SetCustomStageMemberOvPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_OV}`);
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        const stageMemberOvTrackId = new ObjectId(payload.stageMemberOvTrackId);
        this.database.setCustomStageMemberOvTrack(
          this.user._id,
          stageMemberOvTrackId,
          payload.update,
        ).catch((error) => err(error));
      });

    this.socket.on(ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_OV,
      (payload: RemoveCustomStageMemberOvPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_OV}`);
        const id = new ObjectId(payload);
        return this.database.readCustomStageMemberOvTrack(id)
          .then((item) => {
            if (item && item.userId.equals(this.user._id)) {
              return this.database.deleteCustomStageMemberOvTrack(id);
            }
            return null;
          }).catch((error) => err(error));
      });

    // STAGE MEMBER MANAGEMENT
    this.socket.on(ClientStageEvents.CHANGE_STAGE_MEMBER,
      (payload: ChangeStageMemberPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.CHANGE_STAGE_MEMBER}`);
        if (!payload.update || Object.keys(payload.update).length === 0) {
          return;
        }
        // REMOVE GROUPS
        const id = new ObjectId(payload.id);
        this.database.readStageMember(id)
          .then((stageMember) => {
            if (stageMember) {
              this.database.readManagedStage(this.user._id, stageMember.stageId)
                .then((stage) => {
                  if (stage) return this.database.updateStageMember(id, payload.update);
                  return null;
                });
            }
          }).catch((error) => err(error));
      });

    // STAGE MEMBERSHIP MANAGEMENT
    this.socket.on(ClientStageEvents.JOIN_STAGE,
      (payload: JoinStagePayload, fn: (error?: string) => void) => {
        trace(`${this.user.name}: ${ClientStageEvents.JOIN_STAGE}`);
        // JOIN STAGE
        const stageId = new ObjectId(payload.stageId);
        const groupId = new ObjectId(payload.groupId);
        return this.database.joinStage(this.user._id, stageId, groupId, payload.password)
          .then(() => d(`${this.user.name} joined stage ${stageId} and group ${groupId}`))
          .then(() => fn())
          .catch((error) => {
            err(error);
            return fn(error.message);
          });
      });
    this.socket.on(ClientStageEvents.LEAVE_STAGE, () => this.database
      .leaveStage(this.user._id)
      .then(() => d(`${this.user.name} left stage`)));

    this.socket.on(ClientStageEvents.LEAVE_STAGE_FOR_GOOD,
      (payload: LeaveStageForGoodPayload) => {
        trace(`${this.user.name}: ${ClientStageEvents.LEAVE_STAGE_FOR_GOOD}`);
        // LEAVE STAGE FOR GOOD
        const stageId = new ObjectId(payload);
        return this.database.leaveStageForGood(this.user._id, stageId)
          .then(() => d(`${this.user.name} left stage for good`))
          .catch((error) => err(error));
      });

    trace(`Registered handler for user ${this.user.name} at socket ${this.socket.id}`);
  }

  sendStages(): Promise<void> {
    trace('Sending stages');
    return this.database.sendStageDataToDevice(this.socket, this.user);
  }
}

export default SocketStageHandler;
