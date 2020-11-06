import ISocket from './ISocket';

export interface AuthRequest {
  getHeader(key: string): string;
}

export type ISocketHandler = (socket: ISocket) => any;
export type Authentication = (req: AuthRequest) => Promise<NodeJS.Dict<any>>;

interface IProvider {
  onConnection(handler: ISocketHandler);

  toAll(event: string, payload: any);

  to(group: string, event: string, payload: any);

  setAuthentication(authentication: Authentication)
}

export default IProvider;
