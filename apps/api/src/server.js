import app from "./app.js";
import { env } from "./config/env.js";

async function start() {
  app.listen(env.port, () => {
    console.info(`Live Match Impact backend listening on port ${env.port}`);
  });

  await app.locals.bootstrapPromise;
}

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
