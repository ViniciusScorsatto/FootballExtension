import app from "./app.js";
import { env } from "./config/env.js";

function start() {
  app.listen(env.port, () => {
    console.info(`Live Match Impact backend listening on port ${env.port}`);
  });

  if (app.locals.bootstrapPromise?.catch) {
    app.locals.bootstrapPromise.catch((error) => {
      console.error("Cache bootstrap failed, continuing without blocking startup:", error);
    });
  }
}

try {
  start();
} catch (error) {
  console.error("Failed to start backend:", error);
  process.exit(1);
}
