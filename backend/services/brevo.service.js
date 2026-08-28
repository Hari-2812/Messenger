const axios = require('axios');

class BrevoService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderName = process.env.BREVO_SENDER_NAME;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL;
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    
    this.sendEmail = this.sendEmail.bind(this);
    this.sendBulkEmail = this.sendBulkEmail.bind(this);
    this.getHeaders = this.getHeaders.bind(this);
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
   */
  async sendBulkEmail({ toList, subject, htmlContent, attachment }) {
    if (!this.apiKey || !this.senderName || !this.senderEmail) {
      return { success: false, error: 'Brevo configuration missing. Check BREVO_API_KEY, BREVO_SENDER_NAME, BREVO_SENDER_EMAIL in .env' };
    }

    try {
      const payload = {
        sender: {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: toList, 
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
    return { success: false, error: 'Not implemented. Please use Brevo Webhooks for real-time status.' };
  }
}

module.exports = new BrevoService();
