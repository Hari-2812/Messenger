const express = require('express');
const router = express.Router();
const appsScriptController = require('../controllers/appsScriptController');

// For apps script, we might want a simple API key auth instead of standard JWT
// because apps script will call this automatically. We can use a custom middleware.
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.APPS_SCRIPT_API_KEY) {
    next();
  } else {
    // If not set in env, allow it for local testing/dev, but warn.
    if (!process.env.APPS_SCRIPT_API_KEY) {
      console.warn('APPS_SCRIPT_API_KEY is not set. Allowing request.');
      next();
    } else {
      res.status(401).json({ success: false, message: 'Invalid API Key' });
    }
  }
};

router.use(verifyApiKey);

router.get('/campaigns/:id/queue', appsScriptController.getPendingQueue);
router.post('/campaigns/:id/status', appsScriptController.updateStatus);

module.exports = router;
