const { Router } = require("express");
const { authenticate, authorize } = require("../../middleware/auth.middleware");
const {
  getAll,
  getById,
  create,
  send,
  receive,
  update,
  remove,
} = require("./mutations.controller");

const router = Router();

router.use(authenticate);

router.get("/", authorize("OWNER", "KARYAWAN"), getAll);
router.get("/:id", authorize("OWNER", "KARYAWAN"), getById);
router.post("/", authorize("OWNER", "KARYAWAN"), create); // KARYAWAN bisa create dari cabangnya
router.patch("/:id/send", authorize("OWNER", "KARYAWAN"), send); // cabang asal konfirmasi kirim
router.patch("/:id/receive", authorize("OWNER", "KARYAWAN"), receive); // cabang tujuan konfirmasi terima
router.put("/:id", authorize("OWNER", "KARYAWAN"), update); // hanya PENDING
router.delete("/:id", authorize("OWNER"), remove); // hanya OWNER, hanya PENDING

module.exports = router;
