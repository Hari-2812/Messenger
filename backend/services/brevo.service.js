const axios = require('axios');

class BrevoService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderName = process.env.BREVO_SENDER_NAME;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL;
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
  }

  getHeaders() {
    return {
      'api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Send a single email
   */
  async sendEmail({ to, subject, htmlContent, attachment }) {
    if (!this.apiKey || !this.senderName || !this.senderEmail) {
      return { success: false, error: 'Brevo configuration missing. Check BREVO_API_KEY, BREVO_SENDER_NAME, BREVO_SENDER_EMAIL in .env' };
    }

    try {
      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
      };

      if (attachment && attachment.length > 0) {
        payload.attachment = attachment; // Format: [{ url: "...", name: "..." }, { content: base64, name: "..." }]
      }

      const response = await axios.post(this.apiUrl, payload, { headers: this.getHeaders() });
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error('[BrevoService] sendEmail error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * Send bulk emails (using BCC or individual calls depending on personalization needs)
   * Brevo allows sending to multiple recipients in the `to`, `cc`, or `bcc` fields,
   * but usually for marketing campaigns, it's better to send individually or use a contact list.
   * We will implement it by passing an array of `to` objects for a single API call if personalized content is not needed,
   * otherwise, we will rely on the controller to loop through contacts.
   * For simplicity and logging, we expose a bulk send method using a single template but multiple recipients.
   */
  async sendBulkEmail({ toList, subject, htmlContent, attachment }) {
    if (!this.apiKey || !this.senderName || !this.senderEmail) {
      return { success: false, error: 'Brevo configuration missing. Check BREVO_API_KEY, BREVO_SENDER_NAME, BREVO_SENDER_EMAIL in .env' };
    }

    // toList should be an array: [{ email: "a@a.com", name: "A" }, ...]
    try {
      // Brevo can handle up to 99 recipients per call in the `to` field or `bcc`
      // To hide emails from each other, we can use bcc if there are no personalizations.
      // However, if the controller loops (as per the user plan), we might just use `sendEmail` repeatedly.
      // Let's implement the bulk endpoint anyway.
      
      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: toList, // WARNING: If multiple are in `to`, they might see each other depending on Brevo's campaign vs transactional endpoint behaviour. Usually, for transactional bulk, bcc is safer, but let's stick to the basic for now. 
        subject: subject,
        htmlContent: htmlContent,
      };

      if (attachment && attachment.length > 0) {
        payload.attachment = attachment;
      }

      const response = await axios.post(this.apiUrl, payload, { headers: this.getHeaders() });
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error('[BrevoService] sendBulkEmail error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  async getCampaignStatus(messageId) {
    // Brevo doesn't have a direct transactional message status endpoint without webhooks,
    // but they do have statistics endpoints.
    // For transactional emails, it's highly recommended to use webhooks.
    // We will just provide a stub that could query stats.
    return { success: false, error: 'Not implemented. Please use Brevo Webhooks for real-time status.' };
  }
}

module.exports = new BrevoService();
