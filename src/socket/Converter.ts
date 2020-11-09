const encodeArray = (...args): Buffer => Buffer.from(JSON.stringify(args));
const decodeArray = (buffer: ArrayBuffer): any[] => JSON.parse(Buffer.from(buffer).toString());

export {
  encodeArray,
  decodeArray,
};
