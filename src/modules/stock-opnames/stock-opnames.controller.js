const service = require("./stock-opnames.service");

const getAll = async (req, res, next) => {
  try {
    const { storeId, status, search, startDate, endDate, page, limit } =
      req.query;
    const storeFilter =
      req.user.role === "KARYAWAN" ? req.user.storeId : storeId;
    const data = await service.getAll({
      storeId: storeFilter,
      status,
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
    const data = await service.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const storeId =
      req.user.role === "KARYAWAN" ? req.user.storeId : req.body.storeId;
    const data = await service.create({
      ...req.body,
      storeId,
      userId: req.user.userId,
    });
    res
      .status(201)
      .json({ success: true, message: "Stock opname berhasil dibuat", data });
  } catch (err) {
    next(err);
  }
};

const selesai = async (req, res, next) => {
  try {
    const data = await service.selesai(req.params.id, req.user.role);
    res.json({
      success: true,
      message: "Stock opname berhasil diselesaikan",
      data,
    });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user.role);
    res.json({ success: true, message: "Stock opname berhasil dihapus" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, selesai, remove };
