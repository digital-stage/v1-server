/* eslint-disable no-console */
import debug, { Debugger } from "debug";
import * as Sentry from "@sentry/node";
import * as uncaught from "uncaught";
import * as Tracing from "@sentry/tracing";
import { CaptureConsole, RewriteFrames } from "@sentry/integrations";
import { SENTRY_DSN, USE_SENTRY } from "./env";

const d = debug("server");

uncaught.start();

if (USE_SENTRY) {
  d("Using Sentry for logging");
  Sentry.init({
    dsn: SENTRY_DSN,
    release: process.env.RELEASE,

    integrations: [
      new Tracing.Integrations.Mongo(),
      new CaptureConsole({
        levels: ["warn", "error"],
      }),
      new RewriteFrames({
        root: global.__rootdir__,
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
  d("Using console for logging");
  const reportError = d.extend("error");
  reportError.log = console.error.bind(console);
  uncaught.addListener((e) => {
    reportError("Uncaught error or rejection: ", e.message);
  });
}

const logger = (
  context: string
): {
  info: Debugger;
  trace: Debugger;
  warn: Debugger;
  error: Debugger;
} => {
  let namespace = context;
  if (namespace.length > 0) {
    namespace += ":";
  }
  const info = d.extend(`${namespace}info`);
  info.log = console.info.bind(console);
  const trace = d.extend(`${namespace}trace`);
  trace.log = console.debug.bind(console);
  let warn;
  let error;
  if (USE_SENTRY) {
    warn = (message) => console.warn(`${namespace}:warm ${message}`);
    error = (message) => console.error(`${namespace}:error ${message}`);
  } else {
    warn = d.extend(`${namespace}warn`);
    warn.log = console.warn.bind(console);
    error = d.extend(`${namespace}error`);
    error.log = console.error.bind(console);
  }
  return {
    info,
    trace,
    warn,
    error,
  };
};

export default logger;
