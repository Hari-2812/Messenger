/**
 * Meta WhatsApp Templates Controller
 * Fetches message templates directly from Meta Graph API
 */

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_API_URL = 'https://graph.facebook.com';

/**
 * GET /api/meta/templates
 * Returns all APPROVED message templates from Meta Business Account
 */
const getMetaTemplates = async (req, res) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !businessAccountId) {
    return res.status(500).json({
      message: 'Meta credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in .env',
    });
  }

  try {
    const url = `${GRAPH_API_URL}/${GRAPH_API_VERSION}/${businessAccountId}/message_templates?fields=name,category,language,status&limit=100`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      return res.status(response.status).json({
        message: `Meta API Error: ${errorMessage}`,
        details: errorData.error || null,
      });
    }

    const data = await response.json();

    // Only return APPROVED templates, map to required fields
    const approvedTemplates = (data.data || [])
      .filter((t) => t.status === 'APPROVED')
      .map((t) => ({
        name: t.name,
        category: t.category,
        language: t.language,
        status: t.status,
      }));

    res.json({
      success: true,
      templates: approvedTemplates,
      total: approvedTemplates.length,
    });
  } catch (error) {
    console.error('Error fetching Meta templates:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMetaTemplates };
