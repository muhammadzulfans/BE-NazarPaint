const express = require("express");
const router = express.Router();
const controller = require("./stock-opnames.controller");
const { authenticate, authorize } = require("../../middleware/auth.middleware");

router.get(
  "/",
  authenticate,
  authorize("OWNER", "KARYAWAN"),
  controller.getAll,
);
router.get(
  "/:id",
  authenticate,
  authorize("OWNER", "KARYAWAN"),
  controller.getById,
);
router.post(
  "/",
  authenticate,
  authorize("OWNER", "KARYAWAN"),
  controller.create,
);
router.put(
  "/:id",
  authenticate,
  authorize("OWNER", "KARYAWAN"),
  controller.update,
);

router.patch(
  "/:id/selesai",
  authenticate,
  authorize("OWNER"),
  controller.selesai,
);
// router.delete("/:id", authenticate, authorize("OWNER"), controller.remove);

module.exports = router;
