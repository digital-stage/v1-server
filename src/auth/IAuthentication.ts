import { HttpRequest } from 'teckos/uws';
import { User } from '../model.server';

export interface IAuthentication {
  verifyWithToken(token: string): Promise<User>;

  authorizeRequest(req: HttpRequest): Promise<User>;
}
