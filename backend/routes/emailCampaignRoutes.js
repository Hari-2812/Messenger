const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getCampaigns,
  getDashboardStats,
  createCampaign,
  getCampaignById,
  deleteCampaign
} = require('../controllers/emailCampaign.controller');
const { protect, admin } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

router.use(protect); // Require auth for all email campaign routes
// You could apply `admin` middleware here if they strictly need to be admin. We will just use `protect` for now unless `admin` is fully integrated everywhere.

router.get('/dashboard-stats', getDashboardStats);

router.route('/')
  .get(getCampaigns)
  .post(upload.single('attachment'), createCampaign);

router.route('/:id')
  .get(getCampaignById)
  .delete(deleteCampaign);

module.exports = router;
