// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  exportUsersPdf
} = require('../../controllers/Usercontroller');

// GET    /api/users           → liste tous les users (avec ?search=&status=)
// GET    /api/users/:id       → un user par ID
// POST   /api/users           → créer un user
// PUT    /api/users/:id       → modifier un user
// DELETE /api/users/:id       → supprimer un user

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/export/pdf', exportUsersPdf);

module.exports = router;