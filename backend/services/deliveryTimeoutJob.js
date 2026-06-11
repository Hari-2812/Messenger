/**
 * Delivery Timeout Job
 *
 * Runs every 60 seconds. Finds MessageLog records that have been in
 * "sent" status for longer than DELIVERY_TIMEOUT_MINUTES without receiving
 * a webhook delivery confirmation from Meta, then marks them as "failed".
 *
 * WHY THIS EXISTS:
 * Meta accepts messages to non-approved / unregistered numbers and returns
 * a 200 OK with a message ID, but silently drops the message — no delivery
 * webhook ever fires. Without this job, those messages stay "sent" forever,
 * giving users a false impression of success.
 *
 * No external packages required — uses native setInterval.
 */

const MessageLog = require('../models/MessageLog');

// How long (minutes) before a "sent" message with no delivery confirmation
// is considered undeliverable. Can be overridden via env var.
const DELIVERY_TIMEOUT_MINUTES = parseInt(
  process.env.DELIVERY_TIMEOUT_MINUTES || '5',
  10
);

// How often the job checks (milliseconds). Default: every 60 seconds.
const CHECK_INTERVAL_MS = 60 * 1000;

let jobTimer = null;

/**
 * Run one pass of the timeout check.
 * Exported separately so it can be called/tested directly.
 */
const runTimeoutCheck = async () => {
  try {
    const cutoff = new Date(Date.now() - DELIVERY_TIMEOUT_MINUTES * 60 * 1000);

    // Find all "sent" messages where sentAt is older than the cutoff
    // AND status is still "sent" (not yet delivered/read/failed by webhook)
    const result = await MessageLog.updateMany(
      {
        status: 'sent',
        sentAt: { $lt: cutoff, $ne: null },
      },
      {
        $set: {
          status: 'failed',
          failureReason: `No delivery confirmation received from Meta within ${DELIVERY_TIMEOUT_MINUTES} minutes`,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[DeliveryTimeout] Marked ${result.modifiedCount} message(s) as failed` +
        ` — no delivery confirmation after ${DELIVERY_TIMEOUT_MINUTES}m`
      );
    }
  } catch (error) {
    // Log but never crash the process — this is a background job
    console.error('[DeliveryTimeout] Error during timeout check:', error.message);
  }
};

/**
 * Start the delivery timeout job.
 * Call this once after the database connection is established.
 */
const startDeliveryTimeoutJob = () => {
  if (jobTimer) {
    console.warn('[DeliveryTimeout] Job already running — skipping duplicate start');
    return;
  }

  console.log(
    `[DeliveryTimeout] Job started — checking every 60s,` +
    ` timeout threshold: ${DELIVERY_TIMEOUT_MINUTES} minutes`
  );

  // Run immediately on startup to catch any leftover stale messages
  // from a previous server session (e.g. Render restart)
  runTimeoutCheck();

  // Then repeat on schedule
  jobTimer = setInterval(runTimeoutCheck, CHECK_INTERVAL_MS);

  // Prevent the interval from blocking graceful shutdown
  if (jobTimer.unref) jobTimer.unref();
};

/**
 * Stop the job (used for testing / graceful shutdown).
 */
const stopDeliveryTimeoutJob = () => {
  if (jobTimer) {
    clearInterval(jobTimer);
    jobTimer = null;
    console.log('[DeliveryTimeout] Job stopped');
  }
};

module.exports = { startDeliveryTimeoutJob, stopDeliveryTimeoutJob, runTimeoutCheck };
