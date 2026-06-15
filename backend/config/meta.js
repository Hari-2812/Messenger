/**
 * Meta WhatsApp Cloud API — Central Configuration
 * Single source of truth for Graph API version.
 * Import from here — never hardcode the version in service files.
 */

const GRAPH_API_VERSION = 'v23.0';
const GRAPH_API_URL = 'https://graph.facebook.com';

module.exports = { GRAPH_API_VERSION, GRAPH_API_URL };
