/* eslint-disable no-console */
import debug, { IDebugger } from "debug";
import * as Sentry from "@sentry/node";
import * as uncaught from "uncaught";
import * as Tracing from "@sentry/tracing";
import { CaptureConsole } from "@sentry/integrations";
import { USE_SENTRY } from "./env";

const d = debug("server");

uncaught.start();

if (USE_SENTRY) {
  d.log("Using Sentry for logging");
  Sentry.init({
    dsn:
      "https://ef973e3c21114d5bbef27d6a49e4a0db@o403353.ingest.sentry.io/5655472",

    integrations: [
      new Tracing.Integrations.Mongo(),
      new CaptureConsole({
        levels: ["info", "warn", "error"],
      }),
    ],

    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,
  });
  Sentry.startTransaction({
    op: "test",
    name: "My First Test Transaction",
  });

  uncaught.addListener((e) => {
    Sentry.captureException(e);
  });
} else {
  const reportError = d.extend("error");
  reportError.log = console.error.bind(console);
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
  info.log = console.info.bind(console);
  const trace = d.extend(`${namespace}trace`);
  trace.log = console.debug.bind(console);
  const warn = d.extend(`${namespace}warn`);
  warn.log = console.warn.bind(console);
  const error = d.extend(`${namespace}error`);
  error.log = console.error.bind(console);
  return {
    info,
    trace,
    warn,
    error,
  };
};

export default logger;
