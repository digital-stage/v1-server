interface BaseSocketEvents {
  reconnect: 'reconnect',
  disconnect: 'disconnect',
}

 type SocketEvent = BaseSocketEvents[keyof BaseSocketEvents] | string;

export default SocketEvent;
