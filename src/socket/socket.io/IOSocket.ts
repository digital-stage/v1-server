import * as socketIO from 'socket.io';
import ISocket from '../ISocket';

type IOSocket = socketIO.Socket & ISocket;
export default IOSocket;
