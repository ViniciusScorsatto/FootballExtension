import { createMatchImpactRouter } from "./matchImpactRoutes.js";

export function registerRoutes(app, controller) {
  app.use("/", createMatchImpactRouter(controller));
}
