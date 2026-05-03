const { Router } = require('express');
const { getAllUsers, getUserById, createUser, updateUser, deleteUser } = require('./users.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware')

const router = Router();

router.use(authenticate);

// Hanya ADMIN yang bisa melihat list user, user by id dan membuat user baru
router.get('/', authenticate, authorize('ADMIN'), getAllUsers);
router.get('/:id', authenticate, authorize('ADMIN'), getUserById);
router.post('/', authorize('ADMIN'), createUser); // untuk Admin membuat akun karyawan

// Bisa diakses Admin atau user itu sendiri (opsional, tergantung kebutuhan)
router.put('/:id', authorize('ADMIN'), updateUser);
router.delete('/:id', authorize('ADMIN'), deleteUser);

module.exports = router;