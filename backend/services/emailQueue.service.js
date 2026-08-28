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
    // 0. Recover stuck emails
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recovered = await EmailLog.updateMany(
      { status: 'sending', updatedAt: { $lt: tenMinutesAgo } },
      { $set: { status: 'pending' }, $inc: { retryCount: 1 } }
    );
    if (recovered.modifiedCount > 0) {
      console.log(`[Queue] Recovered ${recovered.modifiedCount} stuck emails.`);
    }

    // 0.5 Activate scheduled campaigns
    const scheduledCampaigns = await EmailCampaign.find({
      status: 'Scheduled',
      scheduledAt: { $lte: new Date() }
    });

    if (scheduledCampaigns.length > 0) {
      console.log(`[EmailQueue] Found ${scheduledCampaigns.length} scheduled campaigns to activate.`);
      const Contact = require('../models/Contact');
      
      for (const campaign of scheduledCampaigns) {
        try {
          const validContacts = await Contact.find({
            _id: { $in: campaign.recipients },
            email: { $ne: null, $ne: '', $type: 'string' },
            status: { $ne: 'Unsubscribed' }
          }).select('_id name email');

          if (validContacts.length > 0) {
            const emailLogsToInsert = validContacts.map(contact => ({
              campaignId: campaign._id,
              contactId: contact._id,
              recipientName: contact.name || '',
              recipientEmail: contact.email,
              status: 'pending',
              retryCount: 0
            }));
            await EmailLog.insertMany(emailLogsToInsert, { ordered: false });
            console.log(`[EmailQueue] Created ${emailLogsToInsert.length} jobs for scheduled campaign ${campaign._id}`);
          }
          
          campaign.status = 'Active';
          await campaign.save();
        } catch (err) {
          console.error(`[EmailQueue] Failed to activate scheduled campaign ${campaign._id}`, err);
          campaign.status = 'Failed';
          await campaign.save();
        }
      }
    }

    // 1. Calculate how many emails have been sent today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sentTodayCount = await EmailLog.countDocuments({
      status: 'sent',
      sentAt: { $gte: startOfDay }
    });

    console.log(`[EmailQueue] Daily limit: ${DAILY_LIMIT}`);
    console.log(`[EmailQueue] Emails sent today: ${sentTodayCount}`);

    const allowance = DAILY_LIMIT - sentTodayCount;
    console.log(`[EmailQueue] Remaining capacity: ${allowance}`);

    if (allowance <= 0) {
      console.log('[EmailQueue] Daily limit reached. Queue processor stopping for today.');
      return;
    }

    // 2. Fetch pending emails up to the allowance
    // Use a simple query to ensure we don't miss jobs due to retryCount type casting
    let pendingEmails = await EmailLog.find({
      status: 'pending'
    })
    .sort({ createdAt: 1 })
    .populate('campaignId');

    // Filter retryCount in memory for safety
    pendingEmails = pendingEmails.filter(log => log.retryCount == null || log.retryCount < 3).slice(0, allowance);

    if (pendingEmails.length === 0) {
      console.log('[EmailQueue] No pending emails in the queue.');
      return;
    }

    console.log(`[EmailQueue] Pending jobs found: ${pendingEmails.length}`);

    // We'll keep track of campaigns touched to update their status later
    const touchedCampaignIds = new Set();

    // 3. Process each email
    for (const pendingDoc of pendingEmails) {
      try {
        // ATOMIC CLAIM: Lock the job so no other worker can process it
        const log = await EmailLog.findOneAndUpdate(
          { _id: pendingDoc._id, status: 'pending' },
          { $set: { status: 'sending', updatedAt: new Date() } },
          { new: true }
        ).populate('campaignId');

        if (!log) {
          // Another worker claimed it
          continue;
        }

        console.log(`[EmailQueue] Processing job: ${log._id}`);
        console.log(`[EmailQueue] Campaign: ${log.campaignId?._id}`);
        console.log(`[EmailQueue] Recipient: ${log.recipientEmail}`);
        
        const campaign = log.campaignId;
        if (!campaign) {
          console.error(`[Queue] Campaign not found for log ${log._id}`);
          log.status = 'failed';
          log.failedReason = 'Campaign not found';
          await log.save();
          continue;
        }

        touchedCampaignIds.add(campaign._id.toString());

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

        console.log(`[EmailQueue] Sending through Brevo`);
        console.log(`[EmailProvider] Brevo request started`);
        
        const result = await sendEmail({
          to: log.recipientEmail,
          subject: campaign.subject,
          htmlContent: content,
          attachment: campaign.attachmentUrl ? [
            {
              url: campaign.attachmentUrl,
              name: campaign.attachmentUrl.split('/').pop()
            }
          ] : []
        });

        if (!result.success) {
          throw new Error(result.error || 'Unknown Brevo Error');
        }

        console.log(`[EmailProvider] Brevo accepted email`);
        console.log(`Message ID: ${result.messageId}`);
        console.log(`[EmailQueue] Job marked SENT`);
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
        // log might not be defined if claim failed, but it's safe since it's the pendingDoc context
        // we need to refetch to update it
        const logToUpdate = await EmailLog.findById(pendingDoc._id);
        if (!logToUpdate) continue;
        
        console.log(`[EmailProvider] Brevo send failed`);
        console.log(`Error: ${err.message}`);
        console.log(`[EmailQueue] Job marked FAILED`);
        if (err.response) {
          console.error(`- Status: ${err.response.status}`);
          console.error(`- Data: ${JSON.stringify(err.response.data)}`);
        }
        
        logToUpdate.failedReason = err.message;
        logToUpdate.retryCount = (logToUpdate.retryCount || 0) + 1;
        
        // If it's a retryable error and retryCount < 3, set back to Pending
        if (logToUpdate.retryCount < 3) {
           logToUpdate.status = 'pending';
           await logToUpdate.save();
        } else {
           // Permanent failure
           logToUpdate.status = 'failed';
           await logToUpdate.save();
           
           if (logToUpdate.campaignId) {
             touchedCampaignIds.add(logToUpdate.campaignId.toString());
             // Only increment permanent failure count
             await EmailCampaign.findByIdAndUpdate(logToUpdate.campaignId, {
               $inc: { 'stats.failed': 1 }
             });
           }
        }
      }
    }

    // 4. Update status for all touched campaigns
    for (const campaignIdStr of touchedCampaignIds) {
      const remainingCount = await EmailLog.countDocuments({
        campaignId: campaignIdStr,
        status: { $in: ['pending', 'sending'] }
      });
      
      if (remainingCount === 0) {
        // Check if there are any failures to determine Completed vs Completed_with_errors
        const failedCount = await EmailLog.countDocuments({
           campaignId: campaignIdStr,
           status: 'failed'
        });
        
        const newStatus = failedCount > 0 ? 'Completed_with_errors' : 'Completed';
        await EmailCampaign.findByIdAndUpdate(campaignIdStr, { status: newStatus });
        console.log(`[Queue] Campaign ${campaignIdStr} updated to status: ${newStatus}`);
      } else {
        await EmailCampaign.findByIdAndUpdate(campaignIdStr, { status: 'Active' });
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
