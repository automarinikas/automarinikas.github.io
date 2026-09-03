/**
 * Automarinikas - Product Detail Dynamic Loader
 * Fetches vehicle data from vehicles.json and overrides hardcoded
 * title, price, description on product detail pages.
 * If vehicle is sold (in_stock: false) or not found, redirects to homepage.
 */
(function() {
    'use strict';

    const VEHICLES_JSON_URL = (window.SHOP_CONFIG && window.SHOP_CONFIG.VEHICLES_JSON) || '/data/vehicles.json';

    // Get the product slug from the URL path
    function getProductSlug() {
        const path = window.location.pathname;
        // Path is like /product/peugeot-107-2007/ or /product/peugeot-107-2007
        const parts = path.split('/').filter(Boolean);
        const productIdx = parts.indexOf('product');
        if (productIdx >= 0 && parts[productIdx + 1]) {
            return decodeURIComponent(parts[productIdx + 1]);
        }
        return null;
    }

    // Format price in Greek Euro format
    function formatPrice(price) {
        return new Intl.NumberFormat('el-GR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    }

    // Build price HTML
    function buildPriceHTML(vehicle) {
        if (vehicle.sale_price) {
            return `
                <del aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi>${formatPrice(vehicle.price)}&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi></span></del>
                <ins aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi>${formatPrice(vehicle.sale_price)}&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi></span></ins>
            `;
        }
        return `<span class="woocommerce-Price-amount amount"><bdi>${formatPrice(vehicle.price)}&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi></span>`;
    }

    async function loadProductData() {
        const slug = getProductSlug();
        if (!slug) return;

        try {
            const cacheBust = '?t=' + Date.now();
            const response = await fetch(VEHICLES_JSON_URL + cacheBust);
            if (!response.ok) return;

            const data = await response.json();
            const allVehicles = [...(data.cars || []), ...(data.motorcycles || [])];
            const vehicle = allVehicles.find(v => v.slug === slug);

            if (!vehicle) {
                console.warn('Product not found in vehicles.json:', slug);
                return; // Keep hardcoded data as fallback
            }

            // If vehicle is sold/deleted, redirect
            if (vehicle.in_stock === false) {
                window.location.href = '/';
                return;
            }

            // --- Override Title ---
            const titleEl = document.querySelector('.product_title, h1.entry-title');
            if (titleEl) {
                titleEl.textContent = vehicle.name;
            }
            // Update page <title>
            document.title = vehicle.name + ' – Automarinikas';

            // Update breadcrumb leaf
            const breadcrumbLeaf = document.querySelector('.thrive-breadcrumb-leaf span');
            if (breadcrumbLeaf) {
                breadcrumbLeaf.textContent = vehicle.name;
            }

            // --- Override Price ---
            const priceEl = document.querySelector('.summary .price, .entry-summary .price, p.price');
            if (priceEl) {
                priceEl.innerHTML = buildPriceHTML(vehicle);
            }

            // --- Override Short Description ---
            const descEl = document.querySelector('.woocommerce-product-details__short-description');
            if (descEl && vehicle.description) {
                descEl.innerHTML = '<p>' + vehicle.description + '</p>';
            }

            // --- Override extra description tab if present ---
            const descTabContent = document.querySelector('#tab-description');
            if (descTabContent && vehicle.full_description) {
                descTabContent.innerHTML = '<h2>Περιγραφή</h2><p>' + vehicle.full_description + '</p>';
            }

            // --- Override extra info tab if present ---
            const extraTabContent = document.querySelector('#tab-additional_information');
            if (extraTabContent && vehicle.extra_info) {
                extraTabContent.innerHTML = '<h2>Επιπλέον Πληροφορίες</h2><p>' + vehicle.extra_info + '</p>';
            }

            // --- Update Add to Cart button with correct product ID ---
            const cartBtn = document.querySelector('.single_add_to_cart_button, button[name="add-to-cart"]');
            if (cartBtn) {
                cartBtn.setAttribute('data-product-id', vehicle.id);
                cartBtn.value = vehicle.id;
            }
            const addToCartInput = document.querySelector('input[name="add-to-cart"]');
            if (addToCartInput) {
                addToCartInput.value = vehicle.id;
            }

            // --- Update related products section ---
            // (already handled by vehicles-loader.js)

            console.log('Product detail: Dynamically loaded data for', vehicle.name);
        } catch (err) {
            console.error('Product detail: Error loading vehicle data', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadProductData);
    } else {
        loadProductData();
    }
})();
