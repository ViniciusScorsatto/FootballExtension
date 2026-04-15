import app from "./app.js";
import { env } from "./config/env.js";

async function start() {
  await app.locals.bootstrapPromise;

  app.listen(env.port, () => {
    console.info(`Live Match Impact backend listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
