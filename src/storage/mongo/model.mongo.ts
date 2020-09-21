import * as mongoose from "mongoose";
import {Device, Producer, Router, User} from "../../model.common";
import {
    CustomGroupVolumeType, CustomStageMemberVolumeType,
    DeviceType,
    GroupType,
    ProducerType,
    RouterType,
    StageMemberType,
    StageType, UserType
} from "./mongo.types";
import {
    CustomGroupVolumeSchema,
    CustomStageMemberVolumeSchema,
    DeviceSchema, GroupSchema,
    ProducerSchema, RouterSchema, StageMemberSchema,
    StageSchema, UserSchema
} from "./mongo.schema";
import {HookNextFunction} from "mongoose";

export type Event<T> = (element: T) => Promise<any>;

export enum ModelEvents {
    //STAGE_ADDED = "stage-added",
    //STAGE_CHANGED = "stage-changed",
    STAGE_REMOVED = "stage-removed",

    //GROUP_ADDED = "group-added",
    //GROUP_CHANGED = "group-changed",
    GROUP_REMOVED = "group-removed",

    //GROUP_MEMBER_ADDED = "group-member-added",
    //GROUP_MEMBER_CHANGED = "group-member-changed",
    GROUP_MEMBER_REMOVED = "group-member-removed",

    //CUSTOM_GROUP_VOLUME_ADDED = "custom-group-volume-added",
    //CUSTOM_GROUP_VOLUME_CHANGED = "custom-group-volume-changed",
    CUSTOM_GROUP_VOLUME_REMOVED = "custom-group-volume-removed",

    //CUSTOM_GROUP_MEMBER_VOLUME_ADDED = "custom-group-member-volume-added",
    //CUSTOM_GROUP_MEMBER_VOLUME_CHANGED = "custom-group-member-volume-changed",
    CUSTOM_GROUP_MEMBER_VOLUME_REMOVED = "custom-group-member-volume-removed",

    //DEVICE_ADDED = "device-added",
    //DEVICE_CHANGED = "device-changed",
    DEVICE_REMOVED = "device-removed",

    //PRODUCER_ADDED = "producer-added",
    //PRODUCER_CHANGED = "producer-changed",
    PRODUCER_REMOVED = "producer-removed",

    //USER_ADDED = "user-added",
    //USER_CHANGED = "user-changed",
    USER_REMOVED = "user-added",

    //ROUTER_ADDED = "router-added",
    //ROUTER_CHANGED = "router-changed",
    ROUTER_REMOVED = "router-removed",
}

namespace Model {
    const listeners: {
        [event: string]: Event<any>[]
    } = {};

    export function getListeners(event: string): Event<any>[] {
        return listeners[event] || [];
    }

    export function addListener<T>(event: string, listener: Event<T>) {
        if (listeners[event]) {
            listeners[event] = [...listeners[event], listener];
        } else {
            listeners[event] = [listener];
        }
    }

    export function removeListener<T>(event: string, listener: Event<T>) {
        listeners[event] = listeners[event].filter(l => listener !== l);
    }

    function BeforeStageRemoved(this: StageType, next: HookNextFunction) {
        console.log("OnStageRemoved");
        return Promise.all(getListeners(ModelEvents.STAGE_REMOVED).map(listener => listener(this)))
            .then(() => console.log("Listeners performed"))
            .then(() => StageMemberModel.find({stageId: this.id}).exec().then(
                stageMembers => {
                    if (stageMembers)
                        return stageMembers.map(stageMember => stageMember.remove())
                }
            ))
            .then(() => GroupModel.find({stageId: this._id}).exec().then(
                groups => {
                    if (groups)
                        return groups.map(group => group.remove())
                }
            ))
            .then(() => "ready to remove stage")
            .then(() => next());
    }

    function OnGroupRemoved(this: GroupType) {
        console.log("OnGroupRemoved");
        return Promise.all([
            mongoose.model('CustomGroupVolume').deleteMany({groupId: this._id}).exec(),
            mongoose.model('StageMember').deleteMany({groupId: this._id}).exec()
        ]).then(
            () => {
                console.log("GROUP REMOVED: " + this.name);
                console.log(this);
                getListeners(ModelEvents.GROUP_REMOVED).forEach(listener => listener(this));
            });
    }

    function OnGroupMemberRemoved(this: StageMemberType, next: HookNextFunction) {
        console.log("OnGroupMemberRemoved");
        getListeners(ModelEvents.GROUP_MEMBER_REMOVED).forEach(listener => listener(this));
        return Promise.all([
            mongoose.model('User').updateMany({stageMembers: this._id}, {$pull: {stageMembers: this._id}}).exec(),
            mongoose.model('CustomStageMemberVolume').deleteMany({stageMemberId: this._id}).exec()
        ])
            .then(() => next());
    }

    function OnCustomGroupVolumeRemoved(this: CustomGroupVolumeType, next: HookNextFunction) {
        getListeners(ModelEvents.CUSTOM_GROUP_VOLUME_REMOVED).forEach(listener => listener(this));
        next();
    }

    function OnCustomGroupMemberVolumeRemoved(this: CustomStageMemberVolumeType, next: HookNextFunction) {
        getListeners(ModelEvents.CUSTOM_GROUP_MEMBER_VOLUME_REMOVED).forEach(listener => listener(this));
        next();
    }

    function OnDeviceRemoved(this: DeviceType) {
        getListeners(ModelEvents.DEVICE_REMOVED).forEach(listener => listener(this));
        return Promise.all([
            mongoose.model('Producer').deleteMany({deviceId: this._id}).exec()
        ])
    }

    function OnProducerRemoved(this: ProducerType, next: HookNextFunction) {
        getListeners(ModelEvents.PRODUCER_REMOVED).forEach(listener => listener(this));
        next();
    }

    function OnUserRemoved(this: UserType) {
        getListeners(ModelEvents.USER_REMOVED).forEach(listener => listener(this));
        return Promise.all([
            mongoose.model('Device').deleteMany({userId: this._id}).exec(),
            mongoose.model('StageMember').deleteMany({userId: this._id}).exec(),
            mongoose.model('Stage').deleteMany({$and: [{admins: this._id}, {admins: {$size: 1}}]}).exec()
        ])
    }

    function OnRouterRemoved(this: RouterType) {
        getListeners(ModelEvents.ROUTER_REMOVED).forEach(listener => listener(this));
        return Promise.all([
            mongoose.model('Producer').deleteMany({routerId: this._id}).exec()
        ]);
    }

    StageSchema.pre<StageType>('remove', BeforeStageRemoved);
    //StageSchema.pre<StageType>('findOneAndRemove', BeforeStageRemoved);
    GroupSchema.pre<GroupType>('remove', OnGroupRemoved);
    //GroupSchema.pre<GroupType>('findOneAndRemove', OnGroupRemoved);
    StageMemberSchema.pre<StageMemberType>('remove', OnGroupMemberRemoved);
    //StageMemberSchema.pre<StageMemberType>('findOneAndRemove', OnGroupMemberRemoved);
    CustomGroupVolumeSchema.pre<CustomGroupVolumeType>('remove', OnCustomGroupVolumeRemoved);
    //CustomGroupVolumeSchema.pre<CustomGroupVolumeType>('findOneAndRemove', OnCustomGroupVolumeRemoved);
    CustomStageMemberVolumeSchema.pre<CustomStageMemberVolumeType>('remove', OnCustomGroupMemberVolumeRemoved);
    //CustomStageMemberVolumeSchema.pre<CustomStageMemberVolumeType>('findOneAndRemove', OnCustomGroupMemberVolumeRemoved);
    DeviceSchema.pre<DeviceType>('remove', OnDeviceRemoved);
    //DeviceSchema.pre<DeviceType>('findOneAndRemove', OnDeviceRemoved);
    ProducerSchema.pre<ProducerType>('remove', OnProducerRemoved);
    //ProducerSchema.pre<ProducerType>('findOneAndRemove', OnProducerRemoved);
    UserSchema.pre<UserType>('remove', OnUserRemoved);
    //UserSchema.pre<UserType>('findOneAndRemove', OnUserRemoved);
    RouterSchema.pre<RouterType>('remove', OnRouterRemoved);
    //RouterSchema.pre<RouterType>('findOneAndRemove', OnRouterRemoved);

    export const StageModel = mongoose.model<StageType>('Stage', StageSchema);
    export const GroupModel = mongoose.model<GroupType>('Group', GroupSchema);
    export const CustomGroupVolumeModel = mongoose.model<CustomGroupVolumeType>('CustomGroupVolume', CustomGroupVolumeSchema);
    export const StageMemberModel = mongoose.model<StageMemberType>('StageMember', StageMemberSchema);
    export const CustomStageMemberVolumeModel = mongoose.model<CustomStageMemberVolumeType>('CustomStageMemberVolume', CustomStageMemberVolumeSchema);
    export const UserModel = mongoose.model<UserType>('User', UserSchema);
    export const DeviceModel = mongoose.model<DeviceType>('Device', DeviceSchema);
    export const ProducerModel = mongoose.model<ProducerType>('Producer', ProducerSchema);
    export const RouterModel = mongoose.model<RouterType>('Router', RouterSchema);
}

export default Model;