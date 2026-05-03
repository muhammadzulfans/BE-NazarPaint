const userService = require('./users.service');

const getAllUsers = async (req, res, next) => {
    try {
        const result = await userService.getAllUsers();
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
    try {
        const result = await userService.getUserById(req.params.id);
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
    try {
        const result = await userService.createUser(req.body);
        res.status(201).json({ success: true, message: 'User berhasil dibuat oleh Admin', data: result });
    } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
    try {
        const result = await userService.updateUser(req.params.id, req.body);
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
    try {
        await userService.deleteUser(req.params.id);
        res.status(200).json({ success: true, message: 'User berhasil dihapus' });
    } catch (err) { next(err); }
};


module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };


