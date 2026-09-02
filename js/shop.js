/**
 * Automarinikas Shop - Cart & API Client
 * Auto-loads product data from vehicles.json — no hardcoded IDs needed
 */
(function() {
    'use strict';
    
    const API_BASE = 'https://shop.expanding.land/api';
    
    // Product ID mapping - loaded dynamically from vehicles.json
    let PRODUCT_SLUGS = {};
    
    // Load slug→ID mapping from vehicles.json
    async function loadProductSlugs() {
        try {
            const resp = await fetch('/data/vehicles.json?t=' + Math.floor(Date.now() / 60000));
            const data = await resp.json();
            const all = [...(data.cars || []), ...(data.motorcycles || [])];
            all.forEach(v => { PRODUCT_SLUGS[v.slug] = v.id; });
        } catch (e) { console.warn('Could not load vehicles.json for slugs'); }
    }
    
    // Session management via localStorage (since cross-origin cookies are tricky)
    function getSessionId() {
        let sid = localStorage.getItem('shop_session');
        if (!sid) {
            sid = 'sess-' + Math.random().toString(36).substr(2, 12) + '-' + Date.now();
            localStorage.setItem('shop_session', sid);
        }
        return sid;
    }
    
    // API call helper
    async function apiCall(endpoint, method, body) {
        const opts = {
            method: method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': getSessionId()
            }
        };
        if (body) opts.body = JSON.stringify(body);
        
        try {
            const resp = await fetch(API_BASE + endpoint, opts);
            return await resp.json();
        } catch (err) {
            console.error('Shop API error:', err);
            return null;
        }
    }
    
    // Show notification banner (like WooCommerce)
    function showNotification(message, type) {
        // Remove existing notifications
        document.querySelectorAll('.shop-notification').forEach(el => el.remove());
        
        const div = document.createElement('div');
        div.className = 'shop-notification';
        div.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            padding: 15px 30px;
            border-radius: 5px;
            font-size: 16px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideDown 0.3s ease;
            max-width: 90%;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        if (type === 'success') {
            div.style.background = '#4CAF50';
            div.style.color = '#fff';
            div.innerHTML = '<span style="font-size:20px">✓</span> ' + message;
        } else if (type === 'error') {
            div.style.background = '#f44336';
            div.style.color = '#fff';
            div.innerHTML = '<span style="font-size:20px">✕</span> ' + message;
        }
        
        // Add cart link
        const cartLink = document.createElement('a');
        cartLink.href = '/cart/';
        cartLink.textContent = 'Καλάθι';
        cartLink.style.cssText = 'color: #fff; text-decoration: underline; margin-left: 15px; font-weight: bold;';
        div.appendChild(cartLink);
        
        document.body.appendChild(div);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transition = 'opacity 0.3s';
            setTimeout(() => div.remove(), 300);
        }, 5000);
    }
    
    // Update cart count badge in header
    async function updateCartBadge() {
        const data = await apiCall('/cart?session_id=' + getSessionId());
        if (!data) return;
        
        const count = data.count || 0;
        let badge = document.getElementById('shop-cart-badge');
        
        if (!badge) {
            // Create cart icon in the header navigation
            const nav = document.querySelector('.thrv-page-section .tve-cb .thrv_wrapper.thrv_text_element');
            if (nav) {
                badge = document.createElement('span');
                badge.id = 'shop-cart-badge';
                badge.style.cssText = `
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    background: #f44336;
                    color: white;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: bold;
                    z-index: 9999;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                `;
                badge.title = 'Καλάθι αγορών';
                badge.onclick = function() { window.location.href = '/cart/'; };
                document.body.appendChild(badge);
            }
        }
        
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }
    
    // Get product ID from the current page URL or a product link
    function getProductIdFromSlug(slug) {
        // Clean up slug
        slug = slug.replace(/\/$/, '').split('/').pop();
        return PRODUCT_SLUGS[slug] || null;
    }
    
    // Handle "Add to Cart" button clicks
    function setupAddToCartButtons() {
        // WooCommerce-style "add to cart" buttons on category pages
        document.querySelectorAll('a.add_to_cart_button, a[href*="add-to-cart"]').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Find product ID from the data attribute or nearest product link
                let productId = null;
                const productLink = btn.closest('.product, .thrv_wrapper')?.querySelector('a[href*="/product/"]');
                if (productLink) {
                    const slug = productLink.getAttribute('href').replace(/\/$/, '').split('/').pop();
                    productId = getProductIdFromSlug(slug);
                }
                
                // Also check data-product_id attribute
                if (!productId) {
                    const dpid = btn.getAttribute('data-product_id');
                    if (dpid) productId = parseInt(dpid);
                }
                
                if (!productId) {
                    // Try to get from parent elements
                    const wrapper = btn.closest('[class*="product"]');
                    if (wrapper) {
                        const link = wrapper.querySelector('a[href*="/product/"]');
                        if (link) {
                            const slug = link.getAttribute('href').replace(/\/$/, '').split('/').pop();
                            productId = getProductIdFromSlug(slug);
                        }
                    }
                }
                
                if (productId) {
                    btn.textContent = '⏳';
                    const result = await apiCall('/cart/add', 'POST', {
                        product_id: productId,
                        quantity: 1,
                        session_id: getSessionId()
                    });
                    
                    if (result && result.success) {
                        showNotification(result.message, 'success');
                        btn.textContent = '✓ Προστέθηκε';
                        updateCartBadge();
                        setTimeout(() => { btn.textContent = 'Προσθήκη στο καλάθι'; }, 2000);
                    } else {
                        showNotification('Σφάλμα: ' + (result?.error || 'Δεν ήταν δυνατή η προσθήκη'), 'error');
                        btn.textContent = 'Προσθήκη στο καλάθι';
                    }
                }
            });
        });
        
        // Also handle the WooCommerce single product page button
        const singleBtn = document.querySelector('.single_add_to_cart_button');
        if (singleBtn) {
            singleBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                
                const slug = window.location.pathname.replace('/product/', '').replace(/\/$/, '');
                const productId = getProductIdFromSlug(slug);
                const qty = parseInt(document.querySelector('.quantity input[name="quantity"]')?.value || '1');
                
                if (productId) {
                    singleBtn.textContent = '⏳';
                    const result = await apiCall('/cart/add', 'POST', {
                        product_id: productId,
                        quantity: qty,
                        session_id: getSessionId()
                    });
                    
                    if (result && result.success) {
                        showNotification(result.message, 'success');
                        updateCartBadge();
                        singleBtn.textContent = 'Προσθήκη στο καλάθι';
                    }
                }
            });
        }
    }
    
    // Add CSS animation
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', async function() {
        addStyles();
        await loadProductSlugs();
        setupAddToCartButtons();
        updateCartBadge();
    });
    
    // Expose for cart page
    window.ShopAPI = {
        apiCall: apiCall,
        getSessionId: getSessionId,
        updateCartBadge: updateCartBadge,
        showNotification: showNotification
    };
})();
