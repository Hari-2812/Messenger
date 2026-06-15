/**
 * Meta WhatsApp Templates Controller
 * Fetches message templates directly from Meta Graph API.
 *
 * GET /api/meta/templates       — APPROVED only (Campaign creation dropdown)
 * GET /api/meta/templates/all   — All statuses (Templates page dashboard)
 */

const { GRAPH_API_VERSION, GRAPH_API_URL } = require('../config/meta');

/**
 * Fetch all templates from Meta with cursor-based pagination
 * Handles businesses with >100 templates correctly
 */
const fetchFromMeta = async (statusFilter = null) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !businessAccountId) {
    throw new Error(
      'Meta credentials not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID'
    );
  }

  const fields = 'name,category,language,status,components,rejected_reason';
  let allTemplates = [];
  let nextCursor = null;
  let pageCount = 0;
  const MAX_PAGES = 20; // Safety guard — prevents infinite loops

  do {
    const cursorParam = nextCursor ? `&after=${nextCursor}` : '';
    const url =
      `${GRAPH_API_URL}/${GRAPH_API_VERSION}/${businessAccountId}/message_templates` +
      `?fields=${fields}&limit=100${cursorParam}`;

    console.log(`[Meta Templates] Fetching page ${pageCount + 1} from Meta...`);

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
    const pageTemplates = data.data || [];
    allTemplates = allTemplates.concat(pageTemplates);

    // Check for next page cursor
    nextCursor = data.paging?.cursors?.after || null;
    const hasNextPage = !!data.paging?.next;
    if (!hasNextPage) nextCursor = null;

    pageCount++;
  } while (nextCursor && pageCount < MAX_PAGES);

  console.log(`[Meta Templates] Fetched ${allTemplates.length} templates (${pageCount} page(s))`);

  // Optionally filter by status
  let templates = statusFilter
    ? allTemplates.filter((t) => t.status === statusFilter)
    : allTemplates;

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
 * Returns only APPROVED templates — Campaign creation dropdown
 */
const getMetaTemplates = async (req, res) => {
  const approvedTemplates = await fetchFromMeta('APPROVED');
  console.log(`[Meta Templates] Returning ${approvedTemplates.length} APPROVED templates`);
  res.json({ success: true, templates: approvedTemplates, total: approvedTemplates.length });
};

/**
 * GET /api/meta/templates/all
 * Returns ALL templates with all statuses — Templates page dashboard
 */
const getAllMetaTemplates = async (req, res) => {
  const allTemplates = await fetchFromMeta(null);
  console.log(`[Meta Templates] Returning ${allTemplates.length} total templates (all statuses)`);
  res.json({ success: true, templates: allTemplates, total: allTemplates.length });
};

module.exports = { getMetaTemplates, getAllMetaTemplates };
