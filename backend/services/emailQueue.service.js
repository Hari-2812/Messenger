const cron = require('node-cron');
const EmailLog = require('../models/EmailLog');
const EmailCampaign = require('../models/EmailCampaign');
const User = require('../models/User');
const { sendEmail } = require('./brevo.service');
const { decrypt } = require('../utils/crypto');

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

    // 1. Group pending jobs by Campaign to process per employee
    const activeCampaigns = await EmailCampaign.find({
      status: { $in: ['Active', 'Partially Sent', 'Sending'] }
    }).select('_id createdBy senderUserId subject htmlContent attachmentUrl');

    const touchedCampaignIds = new Set();
    const todayStr = new Date().toISOString().split('T')[0];

    for (const campaign of activeCampaigns) {
      // Find the user who owns this campaign (specifically the senderUserId)
      const targetUserId = campaign.senderUserId || campaign.createdBy;
      const user = await User.findById(targetUserId);
      if (!user) {
        console.error(`[Queue] User not found for campaign ${campaign._id}`);
        continue;
      }

      // Check Brevo config
      if (!user.brevo || !user.brevo.connected || !user.brevo.apiKeyEncrypted) {
        console.error(`[Queue] User ${user._id} has no valid Brevo connection`);
        campaign.status = 'Failed';
        campaign.error = 'Brevo account not connected or invalid API key. Please reconnect your Brevo account.';
        await campaign.save();
        continue;
      }

      console.log(`[Queue] Employee Brevo connection found`);
      console.log(`[Queue] Sender configured: true`);
      console.log(`[Queue] API key configured: true`);

      const apiKey = decrypt(user.brevo.apiKeyEncrypted);
      if (!apiKey) {
        console.error(`[Queue] Failed to decrypt API key for user ${user._id}`);
        continue;
      }

      const credentials = {
        apiKey,
        senderName: user.brevo.senderName,
        senderEmail: user.brevo.senderEmail
      };

      // Handle daily limits reset
      if (!user.brevo.usageDate || user.brevo.usageDate !== todayStr) {
        user.brevo.emailsSentToday = 0;
        user.brevo.usageDate = todayStr;
        await user.save();
      }

      const dailyLimit = user.brevo.dailyLimit || 300;
      let emailsSentToday = user.brevo.emailsSentToday || 0;
      const allowance = dailyLimit - emailsSentToday;

      if (allowance <= 0) {
        console.log(`[EmailQueue] User ${user._id} limit reached (${dailyLimit}). Skipping campaign ${campaign._id}.`);
        continue;
      }

      // 2. Fetch pending emails for THIS campaign up to the allowance
      let pendingEmails = await EmailLog.find({
        campaignId: campaign._id,
        status: 'pending'
      }).sort({ createdAt: 1 }).limit(allowance);

      // Filter out max retries
      pendingEmails = pendingEmails.filter(log => log.retryCount == null || log.retryCount < 3);

      if (pendingEmails.length === 0) continue;
      
      touchedCampaignIds.add(campaign._id.toString());
      console.log(`[EmailQueue] Processing ${pendingEmails.length} jobs for campaign ${campaign._id} (User: ${user._id})`);

      for (const pendingDoc of pendingEmails) {
        // Stop if we hit the limit during this loop
        if (emailsSentToday >= dailyLimit) {
          console.log(`[EmailQueue] User ${user._id} hit limit during processing.`);
          break;
        }

        try {
          const log = await EmailLog.findOneAndUpdate(
            { _id: pendingDoc._id, status: 'pending' },
            { $set: { status: 'sending', updatedAt: new Date() } },
            { new: true }
          );

          if (!log) continue;

          let content = campaign.htmlContent;
          const recipientName = log.recipientName?.trim() || 'Student';
          
          const variables = {
            name: recipientName,
            email: log.recipientEmail || '',
            phone: log.customFields?.Phone || '',
            college: log.customFields?.College || '',
            department: log.customFields?.Department || ''
          };

          for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'gi');
            content = content.replace(regex, value);
          }

          const result = await sendEmail({
            to: log.recipientEmail,
            subject: campaign.subject,
            htmlContent: content,
            attachment: campaign.attachmentUrl ? [
              {
                url: campaign.attachmentUrl,
                name: campaign.attachmentUrl.split('/').pop()
              }
            ] : [],
            credentials
          });

          if (!result.success) {
            throw new Error(result.error || 'Unknown Brevo Error');
          }

          log.status = 'sent';
          log.messageId = result.messageId;
          log.sentAt = new Date();
          await log.save();

          await EmailCampaign.findByIdAndUpdate(campaign._id, {
            $inc: { 'stats.totalSent': 1, 'stats.pending': -1 }
          });

          // Increment user limit
          emailsSentToday++;
          user.brevo.emailsSentToday = emailsSentToday;
          await user.save();

        } catch (err) {
          const logToUpdate = await EmailLog.findById(pendingDoc._id);
          if (!logToUpdate) continue;
          
          logToUpdate.failedReason = err.message;
          logToUpdate.retryCount = (logToUpdate.retryCount || 0) + 1;
          
          if (logToUpdate.retryCount < 3) {
             logToUpdate.status = 'pending';
             await logToUpdate.save();
          } else {
             logToUpdate.status = 'failed';
             await logToUpdate.save();
             
             await EmailCampaign.findByIdAndUpdate(campaign._id, {
               $inc: { 'stats.failed': 1, 'stats.pending': -1 }
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
      
      const failedCount = await EmailLog.countDocuments({
         campaignId: campaignIdStr,
         status: 'failed'
      });

      const sentCount = await EmailLog.countDocuments({
         campaignId: campaignIdStr,
         status: 'sent'
      });
      
      let newStatus = 'Active';
      if (remainingCount === 0) {
        newStatus = failedCount > 0 ? 'Completed_with_errors' : 'Completed';
      } else if (sentCount > 0) {
        newStatus = 'Partially Sent';
      }

      await EmailCampaign.findByIdAndUpdate(campaignIdStr, { status: newStatus });
      console.log(`[Queue] Campaign ${campaignIdStr} updated to status: ${newStatus}`);
    }

    console.log('--- Email Queue Processor Finished ---');
  } catch (error) {
    console.error('Error in processEmailQueue:', error);
  }
};

const initCronJobs = () => {
  cron.schedule('0 0 * * *', () => {
    processEmailQueue();
  });
  
  cron.schedule('*/5 * * * *', () => {
    processEmailQueue();
  });

  console.log('Cron jobs initialized: Email Queue Processor active.');
};

module.exports = {
  processEmailQueue,
  initCronJobs
};
