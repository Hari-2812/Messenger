const express = require('express');
const {
  getCampaigns,
  createCampaign,
  previewCampaign,
  sendCampaign,
} = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getCampaigns).post(createCampaign);
router.post('/preview', previewCampaign);
router.post('/:id/send', sendCampaign);

module.exports = router;
