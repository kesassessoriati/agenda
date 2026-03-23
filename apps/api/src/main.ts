import "dotenv/config";

import { env } from "./shared/config/env.js";
import { createApp } from "./shared/app.js";
import { logger } from "./shared/lib/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`HTTP server listening on port ${env.PORT}`);
});
