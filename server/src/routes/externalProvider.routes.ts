// import { Router } from "express";
// import { authenticate, authorize } from "../middlewares/auth.middleware";
// import ExternalProviderController from "../controllers/externalProvider.controller";

// const externalProviderRouter = Router();

// externalProviderRouter.get(
//   "/",
//   authenticate,
// //   authorize("admin"),
//   ExternalProviderController.getProvider
// );

// externalProviderRouter.post(
//   "/",
//   authenticate,
// //   authorize("admin"),
//   ExternalProviderController.upsertProvider
// );

// export default externalProviderRouter;

import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import ExternalProviderController from "../controllers/externalProvider.controller";

const externalProviderRouter = Router();

/* ================================
   GET ALL
================================ */
externalProviderRouter.get(
  "/",
  authenticate,
  // authorize("admin"),
  ExternalProviderController.getAll
);

/* ================================
   CREATE
================================ */
externalProviderRouter.post(
  "/",
  authenticate,
  // authorize("admin"),
  ExternalProviderController.create
);

/* ================================
   UPDATE
================================ */
externalProviderRouter.put(
  "/:id",
  authenticate,
  // authorize("admin"),
  ExternalProviderController.update
);

/* ================================
   DELETE
================================ */
externalProviderRouter.delete(
  "/:id",
  authenticate,
  // authorize("admin"),
  ExternalProviderController.remove
);

export default externalProviderRouter;

externalProviderRouter.post(
  "/:id/test",
  authenticate,
  ExternalProviderController.testProvider
);
