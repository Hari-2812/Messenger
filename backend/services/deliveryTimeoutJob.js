/**
 * Delivery Timeout Job
 *
 * Runs every 60 seconds. Finds MessageLog records that have been in
 * "sent" status longer than DELIVERY_TIMEOUT_MINUTES without a delivery
 * confirmation from Meta, then marks them as "failed".
 *
 * Also updates Campaign.failedCount for affected campaigns.
 *
 * WHY THIS EXISTS:
 * Meta accepts messages to non-approved/unregistered numbers with a 200 OK
 * but silently drops them — no delivery webhook ever fires. Without this job,
 * those messages stay "sent" forever, giving users false impressions of success.
 *
 * Default: 30 minutes (configurable via DELIVERY_TIMEOUT_MINUTES env var).
 */

const MessageLog = require('../models/MessageLog');
const Campaign = require('../models/Campaign');

const DELIVERY_TIMEOUT_MINUTES = parseInt(
  process.env.DELIVERY_TIMEOUT_MINUTES || '30', // Default: 30min (was 5min — too aggressive)
  10
);

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

let jobTimer = null;

const runTimeoutCheck = async () => {
  try {
    const cutoff = new Date(Date.now() - DELIVERY_TIMEOUT_MINUTES * 60 * 1000);

    // Find all "sent" messages older than the cutoff
    const staleLogs = await MessageLog.find({
      status: 'sent',
      sentAt: { $lt: cutoff, $ne: null },
    }).select('_id campaignId');

    if (staleLogs.length === 0) return;

    const staleIds = staleLogs.map((l) => l._id);

    // Mark all stale messages as failed
    await MessageLog.updateMany(
      { _id: { $in: staleIds } },
      {
        $set: {
          status: 'failed',
          failureReason: `No delivery confirmation from Meta within ${DELIVERY_TIMEOUT_MINUTES} minutes`,
        },
      }
    );

    console.log(
      `[DeliveryTimeout] Marked ${staleLogs.length} message(s) as failed` +
      ` (no delivery after ${DELIVERY_TIMEOUT_MINUTES}min)`
    );

    // Update Campaign.failedCount for each affected campaign
    const campaignCounts = staleLogs.reduce((acc, log) => {
      if (log.campaignId) {
        const key = log.campaignId.toString();
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {});

    const campaignUpdates = Object.entries(campaignCounts).map(([campaignId, count]) =>
      Campaign.findByIdAndUpdate(campaignId, { $inc: { failedCount: count } })
    );

    await Promise.all(campaignUpdates);

    if (Object.keys(campaignCounts).length > 0) {
      console.log(
        `[DeliveryTimeout] Updated failedCount for ${Object.keys(campaignCounts).length} campaign(s)`
      );
    }
  } catch (error) {
    console.error('[DeliveryTimeout] Error during timeout check:', error.message);
  }
};

const startDeliveryTimeoutJob = () => {
  if (jobTimer) {
    console.warn('[DeliveryTimeout] Job already running — skipping duplicate start');
    return;
  }

  console.log(
    `[DeliveryTimeout] Job started — checking every 60s, timeout threshold: ${DELIVERY_TIMEOUT_MINUTES} minutes`
  );

  // Run immediately on startup to catch leftover stale messages
  runTimeoutCheck();

  jobTimer = setInterval(runTimeoutCheck, CHECK_INTERVAL_MS);
  if (jobTimer.unref) jobTimer.unref();
};

const stopDeliveryTimeoutJob = () => {
  if (jobTimer) {
    clearInterval(jobTimer);
    jobTimer = null;
    console.log('[DeliveryTimeout] Job stopped');
  }
};

module.exports = { startDeliveryTimeoutJob, stopDeliveryTimeoutJob, runTimeoutCheck };
