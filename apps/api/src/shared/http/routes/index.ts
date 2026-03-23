import type { Express } from "express";
import { Router } from "express";

import { appointmentController } from "../../../modules/appointments/interface/controllers/appointment.controller.js";
import { authController } from "../../../modules/auth/interface/controllers/auth.controller.js";
import { googleCalendarController } from "../../../modules/google-calendar/interface/controllers/google-calendar.controller.js";
import { scheduleController } from "../../../modules/schedules/interface/controllers/schedule.controller.js";
import { userController } from "../../../modules/users/interface/controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth-middleware.js";

export function registerRoutes(app: Express) {
  const publicRouter = Router();
  const privateRouter = Router();

  publicRouter.get("/health", (_request, response) => response.json({ status: "ok" }));
  publicRouter.post("/auth/login", authController.login);
  publicRouter.get("/google-calendar/callback", googleCalendarController.callback);

  privateRouter.use(authMiddleware);
  privateRouter.get("/auth/me", authController.me);
  privateRouter.get("/users", userController.listAssignable);

  privateRouter.get("/schedules", scheduleController.list);
  privateRouter.get("/schedules/:scheduleId", scheduleController.get);
  privateRouter.post("/schedules", scheduleController.create);
  privateRouter.put("/schedules/:scheduleId", scheduleController.update);
  privateRouter.delete("/schedules/:scheduleId", scheduleController.remove);
  privateRouter.delete("/schedules/:scheduleId/google", scheduleController.unlinkGoogle);

  privateRouter.get("/appointments", appointmentController.list);
  privateRouter.get("/appointments/summary", appointmentController.summary);
  privateRouter.get("/appointments/:appointmentId", appointmentController.get);
  privateRouter.post("/appointments", appointmentController.create);
  privateRouter.put("/appointments/:appointmentId", appointmentController.update);
  privateRouter.delete("/appointments/:appointmentId", appointmentController.remove);
  privateRouter.post("/appointments/sync-google", appointmentController.syncGoogle);

  privateRouter.get("/google-calendar/auth-url", googleCalendarController.getAuthUrl);

  app.use("/api", publicRouter);
  app.use("/api", privateRouter);
}
