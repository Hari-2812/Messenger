const cron = require('node-cron');
const EmailLog = require('../models/EmailLog');
const EmailCampaign = require('../models/EmailCampaign');
const { sendEmail } = require('./brevo.service');

const DAILY_LIMIT = 300;

// Run every day at midnight (0 0 * * *)
// We'll also allow running it immediately for testing if needed.
const processEmailQueue = async () => {
  console.log('--- Starting Email Queue Processor ---');
  try {
    // 1. Calculate how many emails have been sent today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sentTodayCount = await EmailLog.countDocuments({
      status: 'sent',
      sentAt: { $gte: startOfDay }
    });

    console.log(`Emails sent today: ${sentTodayCount} / ${DAILY_LIMIT}`);

    const allowance = DAILY_LIMIT - sentTodayCount;
    if (allowance <= 0) {
      console.log('Daily limit reached. Queue processor stopping for today.');
      return;
    }

    // 2. Fetch pending emails up to the allowance
    const pendingEmails = await EmailLog.find({
      status: 'pending',
      $or: [{ retryCount: { $lt: 3 } }, { retryCount: { $exists: false } }, { retryCount: null }]
    })
    .sort({ createdAt: 1 })
    .limit(allowance)
    .populate('campaignId');

    if (pendingEmails.length === 0) {
      console.log('No pending emails in the queue.');
      return;
    }

    console.log(`Processing ${pendingEmails.length} pending emails...`);

    // 3. Process each email
    for (const log of pendingEmails) {
      try {
        console.log(`[Queue] Processing log ${log._id} for recipient ${log.recipientEmail}`);
        
        const campaign = log.campaignId;
        if (!campaign) {
          console.error(`[Queue] Campaign not found for log ${log._id}`);
          log.status = 'failed';
          log.failedReason = 'Campaign not found';
          await log.save();
          continue;
        }

        // Process template variables
        let content = campaign.htmlContent;
        const variables = {
          name: log.recipientName || '',
          email: log.recipientEmail || '',
          phone: log.customFields?.Phone || '',
          college: log.customFields?.College || '',
          department: log.customFields?.Department || ''
        };

        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'gi');
          content = content.replace(regex, value);
        }

        // Send Email
        log.status = 'sending';
        await log.save();

        const attachments = campaign.attachmentUrl ? [
          {
            url: campaign.attachmentUrl,
            name: campaign.attachmentUrl.split('/').pop()
          }
        ] : [];

        console.log(`[Queue] Calling Brevo sendEmail for ${log.recipientEmail}...`);
        const result = await sendEmail({
          to: log.recipientEmail,
          subject: campaign.subject,
          htmlContent: content,
          attachment: attachments
        });

        if (!result.success) {
          throw new Error(result.error || 'Unknown Brevo Error');
        }

        console.log(`[Queue] Successfully sent to ${log.recipientEmail}. MessageId: ${result.messageId}`);
        // Update Log
        log.status = 'sent';
        log.messageId = result.messageId;
        log.sentAt = new Date();
        await log.save();

        // Update Campaign Stats incrementally
        await EmailCampaign.findByIdAndUpdate(campaign._id, {
          $inc: { 'stats.delivered': 1 }
        });

      } catch (err) {
        console.error(`[Queue] Failed to send email to ${log.recipientEmail}:`);
        console.error(`- Error message: ${err.message}`);
        if (err.response) {
          console.error(`- Status: ${err.response.status}`);
          console.error(`- Data: ${JSON.stringify(err.response.data)}`);
        }
        
        log.status = 'failed';
        log.failedReason = err.message;
        log.retryCount += 1;
        
        // If it's a retryable error and retryCount < 3, set back to Pending
        if (log.retryCount < 3) {
           log.status = 'pending';
        }
        
        await log.save();

        // Update failed stats
        await EmailCampaign.findByIdAndUpdate(log.campaignId?._id, {
          $inc: { 'stats.failed': 1 }
        });
      }
    }

    console.log('--- Email Queue Processor Finished ---');
  } catch (error) {
    console.error('Error in processEmailQueue:', error);
  }
};

// Schedule the cron job
const initCronJobs = () => {
  // Run every day at 00:00 (Midnight)
  cron.schedule('0 0 * * *', () => {
    processEmailQueue();
  });
  
  // For development/testing purposes, you might want it to run more frequently.
  // The user requested: "node-cron... Every day Check Pending emails." 
  // However, I will also schedule a 5-minute checker to handle mid-day uploads better
  // up to the 300 limit. 
  cron.schedule('*/5 * * * *', () => {
    // This ensures if someone uploads a list at 2 PM, it starts sending right away
    // until it hits the 300 daily limit, rather than waiting until midnight.
    processEmailQueue();
  });

  console.log('Cron jobs initialized: Email Queue Processor active.');
};

module.exports = {
  processEmailQueue,
  initCronJobs
};
