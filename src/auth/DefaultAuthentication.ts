import fetch from 'node-fetch';
import { HttpRequest } from 'teckos/uws';
import debug from 'debug';
import { IRealtimeDatabase } from '../database/IRealtimeDatabase';
import { User } from '../model.server';
import { IAuthentication } from './IAuthentication';

const d = debug('server').extend('auth');
const err = d.extend('err');

export interface DefaultAuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const getUserByToken = (token: string): Promise<DefaultAuthUser> => fetch(`${process.env.AUTH_URL}/profile`, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
})
  .then((result) => {
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
    if (reqToken.length > 7 && reqToken.substring(0, 7) === 'Bearer ') {
      token = reqToken.substring(7);
    }
    return getUserByToken(token)
      .then((authUser) => this.database.readUserByUid(authUser._id)
        .then((user) => {
          if (!user) {
            d(`[AUTH] Creating new user ${authUser.name}`);
            return this.database.createUser({
              uid: authUser._id,
              name: authUser.name,
              avatarUrl: authUser.avatarUrl,
            })
              .then((createdUser) => createdUser);
          }
          return user;
        }))
      .catch((error) => {
        err('[AUTH] Invalid token delivered');
        err(error);
        throw new Error('Invalid credentials');
      });
  }

  authorizeRequest(req: HttpRequest): Promise<User> {
    const authorization: string = req.getHeader('authorization');
    if (!authorization) {
      throw new Error('Missing authorization');
    }
    if (!authorization.startsWith('Bearer ')) {
      throw new Error('Invalid authorization');
    }
    const token = authorization.substr(7);
    return this.verifyWithToken(token);
  }
}

export default DefaultAuthentication;
