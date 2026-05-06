// routes/dashboardRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getDashboardStats,
  getRecentAnalyses,
  getPopularLanguages,
  getIssuesStats,
  getCodeVersion
} = require('../../controllers/dashboardController');

// const authMiddleware = require('../Middleware/Auth'); // décommente si JWT

router.get('/stats',            /* authMiddleware, */ getDashboardStats);
router.get('/recent-analyses',  /* authMiddleware, */ getRecentAnalyses);
router.get('/languages',        /* authMiddleware, */ getPopularLanguages);
router.get('/issues',           /* authMiddleware, */ getIssuesStats);
router.get('/code/:codeVersionId', getCodeVersion);

module.exports = router;
