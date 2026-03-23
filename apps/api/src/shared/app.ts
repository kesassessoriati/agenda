import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { errorHandler } from "./errors/error-handler.js";
import { registerRoutes } from "./http/routes/index.js";
import { logger } from "./lib/logger.js";

export function createApp() {
  const app = express();
  const requestLogger = (pinoHttp as unknown as (options: { logger: typeof logger }) => express.RequestHandler)({
    logger,
  });

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  registerRoutes(app);
  app.use(errorHandler);

  return app;
}
