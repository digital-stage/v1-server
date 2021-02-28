import fetch from "node-fetch";
import { HttpRequest } from "teckos/uws";
import { IRealtimeDatabase } from "../database/IRealtimeDatabase";
import { User } from "../types";
import { IAuthentication } from "./IAuthentication";
import { AUTH_URL } from "../env";
import logger from "../logger";

const { error, trace } = logger("auth");

export interface DefaultAuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const getUserByToken = (token: string): Promise<DefaultAuthUser> =>
  fetch(`${AUTH_URL}/profile`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }).then((result) => {
    if (result.ok) {
      return result.json();
    }
    throw new Error(result.statusText);
  });

class DefaultAuthentication implements IAuthentication {
  private readonly database;

  constructor(database: IRealtimeDatabase) {
    this.database = database;
  }

  verifyWithToken(reqToken: string): Promise<User> {
    let token = reqToken;
    if (reqToken.length > 7 && reqToken.substring(0, 7) === "Bearer ") {
      token = reqToken.substring(7);
    }
    return getUserByToken(token)
      .then((authUser) =>
        this.database.readUserByUid(authUser._id).then((user) => {
          if (!user) {
            trace(`Creating new user ${authUser.name}`);
            return this.database
              .createUser({
                uid: authUser._id,
                name: authUser.name,
                avatarUrl: authUser.avatarUrl,
              })
              .then((createdUser) => createdUser);
          }
          return user;
        })
      )
      .catch((e) => {
        error("Invalid token delivered");
        error(e);
        throw new Error("Invalid credentials");
      });
  }

  authorizeRequest(req: HttpRequest): Promise<User> {
    const authorization: string = req.getHeader("authorization");
    if (!authorization) {
      throw new Error("Missing authorization");
    }
    if (!authorization.startsWith("Bearer ")) {
      throw new Error("Invalid authorization");
    }
    const token = authorization.substr(7);
    return this.verifyWithToken(token);
  }
}

export default DefaultAuthentication;
