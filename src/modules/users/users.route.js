const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload.middleware');
const {
  getMe,
  getAll,
  getById,
  create,
  update,
  remove,
  uploadMyAvatar,
  deleteMyAvatar,
  uploadUserAvatar,
  deleteUserAvatar,
} = require('./users.controller');

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Manajemen user & foto profile
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Ambil data profile sendiri
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data profile user
 */
router.get('/me', getMe);

/**
 * @swagger
 * /api/users/me/avatar:
 *   patch:
 *     summary: Upload/ganti foto profile sendiri
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: File foto (JPG/PNG/WEBP, max 2MB)
 *     responses:
 *       200:
 *         description: Foto profile berhasil diperbarui
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     avatar:
 *                       type: string
 *                       example: uploads/avatars/avatar-clxyz-1234567890.jpg
 *       400:
 *         description: Format file tidak didukung atau ukuran melebihi 2MB
 */
router.patch('/me/avatar', upload.single('avatar'), uploadMyAvatar);

/**
 * @swagger
 * /api/users/me/avatar:
 *   delete:
 *     summary: Hapus foto profile sendiri (kembali ke default)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Foto profile berhasil dihapus
 */
router.delete('/me/avatar', deleteMyAvatar);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Ambil semua user (OWNER only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [OWNER, KARYAWAN]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Daftar user
 */
router.get('/', authorize('OWNER'), getAll);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Ambil detail user (OWNER only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detail user
 *       404:
 *         description: User tidak ditemukan
 */
router.get('/:id', authorize('OWNER'), getById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Buat user baru (OWNER only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               jabatan:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [OWNER, KARYAWAN]
 *               storeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User berhasil dibuat
 */
router.post('/', authorize('OWNER'), create);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (OWNER only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               jabatan:
 *                 type: string
 *               role:
 *                 type: string
 *               storeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User berhasil diperbarui
 */
router.put('/:id', authorize('OWNER'), update);

/**
 * @swagger
 * /api/users/{id}/avatar:
 *   patch:
 *     summary: Upload foto profile user lain (OWNER only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Foto profile berhasil diperbarui
 *       404:
 *         description: User tidak ditemukan
 */
router.patch('/:id/avatar', authorize('OWNER'), upload.single('avatar'), uploadUserAvatar);

/**
 * @swagger
 * /api/users/{id}/avatar:
 *   delete:
 *     summary: Hapus foto profile user lain (OWNER only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Foto profile berhasil dihapus
 */
router.delete('/:id/avatar', authorize('OWNER'), deleteUserAvatar);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Hapus user (OWNER only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User berhasil dihapus
 */
router.delete('/:id', authorize('OWNER'), remove);

module.exports = router;