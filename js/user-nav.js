/**
 * Automarinikas - Universal User Navigation
 * Injects login/account/cart links on EVERY page.
 * Include this script on all pages for consistent navigation.
 */
(function() {
    'use strict';

    const API_BASE = (window.SHOP_CONFIG && window.SHOP_CONFIG.API_BASE) || 'https://shop.expanding.land/api';

    // Create the user nav bar
    function createUserNav() {
        let bar = document.getElementById('am-user-nav');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'am-user-nav';
            document.body.appendChild(bar);
        }

        bar.innerHTML = `
            <a href="/cart/" id="am-cart-link" style="color:#e7ff00;text-decoration:none;display:inline-flex;align-items:center;position:relative;" title="Καλάθι">
                <img src="/icons/basket.png" alt="Καλάθι" style="width:24px;height:auto;max-height:22px;object-fit:contain;filter:brightness(0) invert(1);display:block;">
                <span id="am-cart-count" style="display:none;background:#e7ff00;color:#0f1d7b;border-radius:50%;width:18px;height:18px;align-items:center;justify-content:center;font-size:10px;font-weight:800;position:absolute;top:-6px;right:-9px;"></span>
            </a>
            <span style="color:rgba(255,255,255,0.3);margin:0 2px;">|</span>
            <span id="am-user-link"></span>
        `;

        updateUserState();
        updateCartCount();
    }

    function updateUserState() {
        const container = document.getElementById('am-user-link');
        if (!container) return;

        const token = localStorage.getItem('user_token');
        if (token) {
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

        const sid = localStorage.getItem('shop_session');
        const headers = sid ? { 'X-Session-ID': sid } : {};

        fetch(API_BASE + '/cart', { credentials: 'include', headers: headers })
            .then(r => r.json())
            .then(data => {
                const count = (data.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
                if (count > 0) {
                    countEl.textContent = count;
                    countEl.style.display = 'inline-flex';
                } else {
                    countEl.style.display = 'none';
                }
            })
            .catch(() => {
                countEl.style.display = 'none';
            });
    }

    // Listen for login/logout or cart events
    window.addEventListener('storage', (e) => {
        if (e.key === 'user_token' || e.key === 'user_data') {
            updateUserState();
        }
        if (e.key === 'shop_session' || e.key === 'cart_updated') {
            updateCartCount();
        }
    });

    window.addEventListener('cartUpdated', updateCartCount);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUserNav);
    } else {
        createUserNav();
    }
})();
