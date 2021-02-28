import debug, { IDebugger } from "debug";
import * as Sentry from "@sentry/node";
import uncaught from "uncaught";
import { USE_SENTRY } from "./env";

const d = debug("server");

uncaught.start();

if (USE_SENTRY) {
  Sentry.init({
    dsn:
      "https://ef973e3c21114d5bbef27d6a49e4a0db@o403353.ingest.sentry.io/5655472",

    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
  });

  d.log = Sentry.captureMessage.bind(Sentry);

  uncaught.addListener((e) => {
    Sentry.captureException(e);
  });
} else {
  const reportError = d.extend("error");
  uncaught.addListener((e) => {
    reportError("Uncaught error or rejection: ", e.message);
  });
}

const logger = (
  context: string
): {
  info: IDebugger;
  trace: IDebugger;
  warn: IDebugger;
  error: IDebugger;
} => {
  let namespace = context;
  if (namespace.length > 0) {
    namespace += ":";
  }
  const info = d.extend(`${namespace}info`);
  const trace = d.extend(`${namespace}trace`);
  const warn = d.extend(`${namespace}warn`);
  const error = d.extend(`${namespace}error`);
  return {
    info,
    trace,
    warn,
    error,
  };
};

export default logger;
