/**
 * Automarinikas - Centralized Configuration
 * Single source of truth for all settings.
 * Change values HERE — all JS files read from this.
 */
window.SHOP_CONFIG = {
    // API endpoint (VPS server)
    API_BASE: 'https://shop.expanding.land/api',

    // Data source (GitHub Pages)
    VEHICLES_JSON: '/data/vehicles.json',

    // Cache duration for vehicles.json (ms) — 1 minute
    CACHE_TTL: 60000,

    // Site info
    SITE_NAME: 'Automarinikas',
    SITE_EMAIL: 'automarinikasgr@gmail.com',
    SITE_PHONE: '6932794575',

    // Currency
    CURRENCY: 'EUR',
    LOCALE: 'el-GR'
};
