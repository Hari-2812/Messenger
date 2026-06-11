/**
 * Meta WhatsApp Templates Controller
 * Fetches message templates directly from Meta Graph API.
 * Two endpoints:
 *   GET /api/meta/templates       — APPROVED only (for Campaign creation dropdown)
 *   GET /api/meta/templates/all   — All statuses (for Templates page dashboard)
 */

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_API_URL = 'https://graph.facebook.com';

/**
 * Fetch templates from Meta with optional status filter
 */
const fetchFromMeta = async (statusFilter = null) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !businessAccountId) {
    throw new Error(
      'Meta credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in .env'
    );
  }

  const fields = 'name,category,language,status,components,rejected_reason';
  const url =
    `${GRAPH_API_URL}/${GRAPH_API_VERSION}/${businessAccountId}/message_templates` +
    `?fields=${fields}&limit=100`;

  console.log(`[Meta Templates] Fetching from ${GRAPH_API_URL}/${GRAPH_API_VERSION}/${businessAccountId}/message_templates`);

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
    console.error(`[Meta Templates] API error: ${errorMessage}`);
    throw new Error(`Meta API Error: ${errorMessage}`);
  }

  const data = await response.json();
  let templates = data.data || [];

  // Optionally filter by status
  if (statusFilter) {
    templates = templates.filter((t) => t.status === statusFilter);
  }

  // Extract body text from components for preview
  return templates.map((t) => {
    const bodyComponent = (t.components || []).find((c) => c.type === 'BODY');
    const bodyText = bodyComponent?.text || null;

    return {
      name: t.name,
      category: t.category,
      language: t.language,
      status: t.status,
      bodyText,
      rejectedReason: t.rejected_reason || null,
    };
  });
};

/**
 * GET /api/meta/templates
 * Returns only APPROVED templates — used by Campaign creation dropdown
 */
const getMetaTemplates = async (req, res) => {
  try {
    const approvedTemplates = await fetchFromMeta('APPROVED');
    console.log(`[Meta Templates] Returning ${approvedTemplates.length} APPROVED templates`);
    res.json({ success: true, templates: approvedTemplates, total: approvedTemplates.length });
  } catch (error) {
    console.error('[Meta Templates] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/meta/templates/all
 * Returns ALL templates with all statuses — used by Templates page dashboard
 */
const getAllMetaTemplates = async (req, res) => {
  try {
    const allTemplates = await fetchFromMeta(null); // no filter
    console.log(`[Meta Templates] Returning ${allTemplates.length} total templates (all statuses)`);
    res.json({ success: true, templates: allTemplates, total: allTemplates.length });
  } catch (error) {
    console.error('[Meta Templates] Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMetaTemplates, getAllMetaTemplates };
