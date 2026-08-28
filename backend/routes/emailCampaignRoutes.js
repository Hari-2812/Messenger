const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getCampaigns,
  getDashboardStats,
  createCampaign,
  getCampaignById,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,
  getQueueStatus,
  sendTestEmail,
  checkHealth
} = require('../controllers/emailCampaign.controller');
const { protect } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

router.use(protect); // Require auth for all email campaign routes
// You could apply `admin` middleware here if they strictly need to be admin. We will just use `protect` for now unless `admin` is fully integrated everywhere.

router.get('/dashboard-stats', getDashboardStats);
router.get('/queue-status', getQueueStatus);
router.get('/health', checkHealth);
router.post('/test-email', sendTestEmail);

router.route('/')
  .get(getCampaigns)
  .post(upload.single('attachment'), createCampaign);

router.route('/:id')
  .get(getCampaignById)
  .delete(deleteCampaign);

router.put('/:id/pause', pauseCampaign);
router.put('/:id/resume', resumeCampaign);

module.exports = router;
