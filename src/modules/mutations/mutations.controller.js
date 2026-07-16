const mutationService = require("./mutations.service");

const getAll = async (req, res, next) => {
  try {
    const { status, type, search, startDate, endDate, page, limit } = req.query;
    const storeId =
      req.user.role === "KARYAWAN" ? req.user.storeId : req.query.storeId;

    const data = await mutationService.getAll({
      storeId,
      status,
      type,
      search,
      startDate,
      endDate,
      page,
      limit,
    });

    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await mutationService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const fromStoreId =
      req.user.role === "KARYAWAN" ? req.user.storeId : req.body.fromStoreId;
    const data = await mutationService.create({
      ...req.body,
      fromStoreId,
      userId: req.user.userId,
    });
    res
      .status(201)
      .json({ success: true, message: "Mutasi stok berhasil dibuat", data });
  } catch (err) {
    next(err);
  }
};

const send = async (req, res, next) => {
  try {
    const data = await mutationService.send(
      req.params.id,
      req.user.userId,
      req.user.role,
      req.user.storeId   // NEW: pass storeId untuk validasi cabang
    );
    res.json({ success: true, message: 'Mutasi berhasil dikirim', data });
  } catch (err) { next(err); }
};

const receive = async (req, res, next) => {
  try {
    const data = await mutationService.receive(
      req.params.id,
      req.user.userId,
      req.user.role,
      req.user.storeId   // NEW: pass storeId untuk validasi cabang
    );
    res.json({ success: true, message: 'Mutasi berhasil diterima', data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await mutationService.update(
      req.params.id,
      req.body,
      req.user.role,
    );
    res.json({ success: true, message: "Mutasi berhasil diperbarui", data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await mutationService.remove(req.params.id, req.user.role);
    res.json({ success: true, message: "Data mutasi berhasil dihapus" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, send, receive, update, remove };
