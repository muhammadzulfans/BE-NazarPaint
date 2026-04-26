const { Router } = require('express');
const { getAllUsers, getUserById } = require('./users.controller');

const router = Router();

router.get('/', getAllUsers);       // GET all users
router.get('/:id', getUserById);   // GET users by id

module.exports = router;