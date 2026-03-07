/**
 * Doit être importé en premier dans main.ts pour instrumenter correctement
 * les appels MongoDB, HTTP, etc. pour Datadog APM.
 */
import tracer from "dd-trace";

tracer.init({
  service: process.env.DD_SERVICE ?? "syncora-permissions-service",
  env: process.env.DD_ENV ?? process.env.NODE_ENV ?? "development",
  version: process.env.DD_VERSION,
  logInjection: process.env.NODE_ENV === "production"
});

export default tracer;
