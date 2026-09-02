/**
 * Automarinikas - Universal User Navigation
 * Injects login/account/cart links on EVERY page.
 * Include this script on all pages for consistent navigation.
 */
(function() {
    'use strict';

    const API_BASE = (window.SHOP_CONFIG && window.SHOP_CONFIG.API_BASE) || 'https://shop.expanding.land/api';

    // Create the floating user nav bar
    function createUserNav() {
        const bar = document.createElement('div');
        bar.id = 'am-user-nav';
        bar.style.cssText = 'position:fixed;top:0;right:0;z-index:99999;display:flex;align-items:center;gap:10px;padding:8px 18px;background:rgba(15,29,123,0.95);border-bottom-left-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.2);font-family:Open Sans Condensed,sans-serif;font-size:14px;font-weight:700;';

        bar.innerHTML = `
            <a href="/cart/" id="am-cart-link" style="color:#e7ff00;text-decoration:none;display:flex;align-items:center;gap:4px" title="Καλάθι">
                🛒 <span id="am-cart-count" style="background:#e7ff00;color:#0f1d7b;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">0</span>
            </a>
            <span style="color:rgba(255,255,255,0.3)">|</span>
            <span id="am-user-link"></span>
        `;

        document.body.appendChild(bar);
        updateUserState();
        updateCartCount();
    }

    function updateUserState() {
        const container = document.getElementById('am-user-link');
        if (!container) return;

        const token = localStorage.getItem('user_token');
        if (token) {
            // Try to get user data
            const userData = localStorage.getItem('user_data');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    const firstName = (user.name || 'User').split(' ')[0];
                    container.innerHTML = `<a href="/my-account/" style="color:#fff;text-decoration:none" title="Ο Λογαριασμός μου">👤 ${firstName}</a>`;
                } catch(e) {
                    container.innerHTML = `<a href="/my-account/" style="color:#fff;text-decoration:none">👤 Λογαριασμός</a>`;
                }
            } else {
                container.innerHTML = `<a href="/my-account/" style="color:#fff;text-decoration:none">👤 Λογαριασμός</a>`;
            }
        } else {
            container.innerHTML = `<a href="/my-account/" style="color:#fff;text-decoration:none" title="Σύνδεση / Εγγραφή">🔑 Σύνδεση</a>`;
        }
    }

    function updateCartCount() {
        const countEl = document.getElementById('am-cart-count');
        if (!countEl) return;

        fetch(API_BASE + '/cart', { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                const count = (data.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
                countEl.textContent = count;
                countEl.style.display = count > 0 ? 'inline-flex' : 'none';
            })
            .catch(() => {
                countEl.style.display = 'none';
            });
    }

    // Listen for login/logout events
    window.addEventListener('storage', (e) => {
        if (e.key === 'user_token' || e.key === 'user_data') {
            updateUserState();
        }
    });

    // Init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUserNav);
    } else {
        createUserNav();
    }
})();
