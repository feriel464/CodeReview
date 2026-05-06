const express = require('express');
const router  = express.Router();
const {
  getCodeReviews,
  getCodeReviewsStats,
  getCodeReviewDetail,
  deleteCodeReview,
} = require('../../controllers/codeReviewsController');

router.get('/',        getCodeReviews);
router.get('/stats',   getCodeReviewsStats);
router.get('/:id',     getCodeReviewDetail);
router.delete('/:id',  deleteCodeReview);

module.exports = router;
