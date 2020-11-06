import * as pino from 'pino';
import { ObjectId } from 'mongodb';
import MongoRealtimeDatabase from '../database/MongoRealtimeDatabase';
import { User } from '../model.server';
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
import ISocket from '../socket/ISocket';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

class SocketStageHandler {
  private readonly user: User;

  private readonly socket: ISocket;

  private readonly database: MongoRealtimeDatabase;

  constructor(database: MongoRealtimeDatabase, user: User, socket: ISocket) {
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
        .then(() => logger.trace(`[SOCKET STAGE EVENT] User ${this.user.name} created stage ${payload.name}`))
        .catch((error) => logger.error(error)));
    this.socket.on(ClientStageEvents.CHANGE_STAGE, (payload: ChangeStagePayload) => {
      // CHANGE STAGE
      const id = new ObjectId(payload.id);
      this.database.readManagedStage(this.user._id, id)
        .then((stage) => {
          if (stage) {
            this.database.updateStage(id, payload.update)
              .then(() => logger.trace(`[SOCKET STAGE EVENT] User ${this.user.name} changed stage ${payload.id}`))
              .catch((error) => logger.error(error));
          }
        });
    });
    this.socket.on(ClientStageEvents.REMOVE_STAGE,
      (payload: RemoveStagePayload) => {
        // REMOVE STAGE
        const id = new ObjectId(payload);
        this.database.readManagedStage(this.user._id, id)
          .then((stage) => {
            if (stage) this.database.deleteStage(id);
          });
      });

    // GROUP MANAGEMENT
    this.socket.on(ClientStageEvents.ADD_GROUP,
      (payload: AddGroupPayload) => {
        const stageId = new ObjectId(payload.stageId);
        this.database.readManagedStage(this.user._id, stageId)
          .then((stage) => {
            if (stage) {
              this.database.createGroup({
                stageId,
                name: payload.name,
                volume: 1,
                muted: false,
              });
            }
          });
      });
    this.socket.on(ClientStageEvents.CHANGE_GROUP,
      (payload: ChangeGroupPayload) => {
        const id = new ObjectId(payload.id);
        return this.database.readGroup(id)
          .then((group) => {
            if (group) {
              this.database.readManagedStage(this.user._id, group.stageId)
                .then((stage) => {
                  if (stage) {
                    this.database.updateGroup(id, {
                      ...payload.update,
                    });
                  }
                });
            }
          });
      });
    this.socket.on(ClientStageEvents.REMOVE_GROUP,
      (payload: RemoveGroupPayload) => {
        // REMOVE GROUP
        const id = new ObjectId(payload);
        this.database.readGroup(id)
          .then((group) => {
            if (group) {
              this.database.readManagedStage(this.user._id, group.stageId)
                .then((stage) => {
                  if (stage) this.database.deleteGroup(id);
                });
            }
          });
      });

    this.socket.on(ClientStageEvents.CHANGE_STAGE_MEMBER_AUDIO,
      (payload: ChangeStageMemberAudioProducerPayload) => {
        const id = new ObjectId(payload.id);
        this.database.readStageMemberAudioProducer(id)
          .then((audioProducer) => {
            if (audioProducer) {
              this.database.readManagedStage(this.user._id, audioProducer.stageId)
                .then((stage) => {
                  if (stage) {
                    this.database.updateStageMemberAudioProducer(id, payload.update);
                  }
                });
            }
          });
      });

    this.socket.on(ClientStageEvents.CHANGE_STAGE_MEMBER_OV,
      (payload: ChangeStageMemberOvTrackPayload) => {
        const id = new ObjectId(payload.id);
        this.database.readStageMemberOvTrack(id)
          .then((audioProducer) => {
            if (audioProducer) {
              this.database.readManagedStage(this.user._id, audioProducer.stageId)
                .then((stage) => {
                  if (stage) {
                    this.database.updateStageMemberOvTrack(id, payload.update);
                  }
                });
            }
          });
      });

    this.socket.on(ClientStageEvents.SET_CUSTOM_GROUP, (payload: SetCustomGroupPayload) => {
      const groupId = new ObjectId(payload.groupId);
      this.database.setCustomGroup(this.user._id, groupId, payload.volume, payload.muted);
    });

    this.socket.on(ClientStageEvents.REMOVE_CUSTOM_GROUP, (payload: RemoveCustomGroupPayload) => {
      const id = new ObjectId(payload);
      this.database.readCustomGroup(id)
        .then((group) => {
          if (group && group.userId.equals(this.user._id)) {
            this.database.deleteCustomGroup(id);
          }
        });
    });

    this.socket.on(ClientStageEvents.SET_CUSTOM_STAGE_MEMBER,
      (payload: SetCustomStageMemberPayload) => {
        const stageMemberId = new ObjectId(payload.stageMemberId);
        this.database.setCustomStageMember(this.user._id, stageMemberId, payload.update);
      });

    this.socket.on(ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER,
      (payload: RemoveCustomStageMemberPayload) => {
        const id = new ObjectId(payload);
        this.database.readCustomStageMember(id)
          .then((item) => {
            if (item && item.userId.equals(this.user._id)) {
              this.database.deleteCustomStageMember(id);
            }
          });
      });

    this.socket.on(ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_AUDIO,
      (payload: SetCustomStageMemberAudioPayload) => {
        const stageMemberAudioId = new ObjectId(payload.stageMemberAudioId);
        this.database.setCustomStageMemberAudioProducer(
          this.user._id,
          stageMemberAudioId,
          payload.update,
        );
      });

    this.socket.on(ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_AUDIO,
      (payload: RemoveCustomStageMemberAudioPayload) => {
        const id = new ObjectId(payload);
        return this.database.readCustomStageMemberAudioProducer(id)
          .then((group) => {
            if (group && group.userId.equals(this.user._id)) {
              this.database.deleteCustomStageMemberAudioProducer(id);
            }
          });
      });

    this.socket.on(ClientStageEvents.SET_CUSTOM_STAGE_MEMBER_OV,
      (payload: SetCustomStageMemberOvPayload) => {
        const stageMemberOvTrackId = new ObjectId(payload.stageMemberOvTrackId);
        this.database.setCustomStageMemberOvTrack(
          this.user._id,
          stageMemberOvTrackId,
          payload.update,
        );
      });

    this.socket.on(ClientStageEvents.REMOVE_CUSTOM_STAGE_MEMBER_OV,
      (payload: RemoveCustomStageMemberOvPayload) => {
        const id = new ObjectId(payload);
        return this.database.readCustomStageMemberOvTrack(id)
          .then((item) => {
            if (item && item.userId.equals(this.user._id)) {
              this.database.deleteCustomStageMemberOvTrack(id);
            }
          });
      });

    // STAGE MEMBER MANAGEMENT
    this.socket.on(ClientStageEvents.CHANGE_STAGE_MEMBER,
      (payload: ChangeStageMemberPayload) => {
        // REMOVE GROUPS
        const id = new ObjectId(payload.id);
        return this.database.readStageMember(id)
          .then((stageMember) => {
            if (stageMember) {
              this.database.readManagedStage(this.user._id, stageMember.stageId)
                .then((stage) => {
                  if (stage) this.database.updateStageMember(id, payload.update);
                });
            }
          });
      });

    // STAGE MEMBERSHIP MANAGEMENT
    this.socket.on(ClientStageEvents.JOIN_STAGE,
      (payload: JoinStagePayload, fn: (error?: string) => void) => {
        // JOIN STAGE
        const stageId = new ObjectId(payload.stageId);
        const groupId = new ObjectId(payload.groupId);
        return this.database.joinStage(this.user._id, stageId, groupId, payload.password)
          .then(() => logger.info(`${this.user.name} joined stage ${stageId} and group ${groupId}`))
          .then(() => fn())
          .catch((error) => {
            logger.error(error);
            return fn(error.message);
          });
      });
    this.socket.on(ClientStageEvents.LEAVE_STAGE, () => this.database
      .leaveStage(this.user._id)
      .then(() => logger.info(`${this.user.name} left stage`)));

    this.socket.on(ClientStageEvents.LEAVE_STAGE_FOR_GOOD,
      (payload: LeaveStageForGoodPayload) => {
        // LEAVE STAGE FOR GOOD
        const stageId = new ObjectId(payload);
        this.database.leaveStageForGood(this.user._id, stageId)
          .then(() => logger.info(`${this.user.name} left stage for good`));
      });

    logger.debug(`[SOCKET STAGE HANDLER] Registered handler for user ${this.user.name} at socket ${this.socket.id}`);
  }

  sendStages(): Promise<void> {
    logger.debug('[SOCKET STAGE HANDLER] Sending stages');
    return this.database.sendInitialToDevice(this.socket, this.user);
  }
}

export default SocketStageHandler;
