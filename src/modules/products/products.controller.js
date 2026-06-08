const productService = require('./products.service');

const getAll = async (req, res, next) => {
  try {
    const { type, search } = req.query;
    const data = await productService.getAll({ type, search });
    res.json({ success: true, total: data.length, data });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await productService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await productService.create(req.body);
    res.status(201).json({ success: true, message: 'Produk berhasil dibuat', data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await productService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Produk berhasil diupdate', data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await productService.remove(req.params.id);
    res.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };