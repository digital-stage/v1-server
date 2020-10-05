import * as mongoose from "mongoose";
import Server from "../../../src/model.server";

export type StageType = Server.Stage & mongoose.Document;
export type GroupType = Server.Group & mongoose.Document;
export type CustomGroupVolumeType = Server.CustomGroupVolume & mongoose.Document;
export type StageMemberType = Server.StageMember & mongoose.Document;
export type CustomStageMemberVolumeType = Server.CustomStageMemberVolume & mongoose.Document;
export type UserType = User & mongoose.Document;
export type DeviceType = Device & mongoose.Document;
export type ProducerType = Producer & mongoose.Document;
export type RouterType = Router & mongoose.Document;