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

module.exports = { getAllUsers, getUserById };