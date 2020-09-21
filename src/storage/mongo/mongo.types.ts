import Client from "../../model.client";
import * as mongoose from "mongoose";
import {Device, Producer, Router, User} from "../../model.common";

export type StageType = Client.StagePrototype & mongoose.Document;
export type GroupType = Client.GroupPrototype & mongoose.Document;
export type CustomGroupVolumeType = Client.CustomGroupVolume & mongoose.Document;
export type StageMemberType = Client.StageMemberPrototype & mongoose.Document;
export type CustomStageMemberVolumeType = Client.CustomStageMemberVolume & mongoose.Document;
export type UserType = User & mongoose.Document;
export type DeviceType = Device & mongoose.Document;
export type ProducerType = Producer & mongoose.Document;
export type RouterType = Router & mongoose.Document;