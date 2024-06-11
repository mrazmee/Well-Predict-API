const express = require("express");
const router = express.Router();
const { register, login, token, logout, getSymptoms } = require("../controllers/userController");
const { authenticateRefreshToken, authenticateAccesToken } = require("../middleware/authenticate");

router.post('/register', register);
router.post('/login', login);
router.post('/token', authenticateRefreshToken ,token);
router.post('/logout', authenticateRefreshToken ,logout);
router.get('/symptoms', authenticateAccesToken, getSymptoms);

module.exports = router