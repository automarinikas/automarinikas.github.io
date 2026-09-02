/**
 * Automarinikas - Dynamic Vehicle Loader
 * Loads vehicles from data/vehicles.json and renders them on category pages
 * This makes the site update instantly when admin adds/edits/deletes vehicles
 */
(function() {
    'use strict';

    const VEHICLES_JSON_URL = (window.SHOP_CONFIG && window.SHOP_CONFIG.VEHICLES_JSON) || '/data/vehicles.json';

    // Detect which category page we're on
    function getCurrentCategory() {
        const path = window.location.pathname;
        if (path.includes('μεταχειρισμένα-αυτοκίνητα') || path.includes('%CE%BC%CE%B5%CF%84%CE%B1%CF%87%CE%B5%CE%B9%CF%81%CE%B9%CF%83%CE%BC%CE%AD%CE%BD%CE%B1-%CE%B1%CF%85%CF%84%CE%BF%CE%BA%CE%AF%CE%BD%CE%B7%CF%84%CE%B1')) {
            return 'cars';
        }
        if (path.includes('μεταχειρισμένες-μοτοσυκλέτες') || path.includes('%CE%BC%CE%B5%CF%84%CE%B1%CF%87%CE%B5%CE%B9%CF%81%CE%B9%CF%83%CE%BC%CE%AD%CE%BD%CE%B5%CF%82-%CE%BC%CE%BF%CF%84%CE%BF%CF%83%CF%85%CE%BA%CE%BB%CE%AD%CF%84%CE%B5%CF%82')) {
            return 'motorcycles';
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

    // Create HTML for a single product card (matches WooCommerce structure)
    function createProductCard(vehicle) {
        const imgSrc = vehicle.images && vehicle.images.length > 0
            ? '../../' + vehicle.images[0]
            : '../../wp-content/uploads/2021/11/automarinikas-logo.jpg';

        const productUrl = '../../product/' + vehicle.slug + '/';

        let priceHTML;
        if (vehicle.sale_price) {
            priceHTML = `
                <span class="price">
                    <del aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi>${formatPrice(vehicle.price)}&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi></span></del>
                    <span class="screen-reader-text">Original price was: ${formatPrice(vehicle.price)}&nbsp;&euro;.</span>
                    <ins aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi>${formatPrice(vehicle.sale_price)}&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi></span></ins>
                    <span class="screen-reader-text">Current price is: ${formatPrice(vehicle.sale_price)}&nbsp;&euro;.</span>
                </span>`;
        } else {
            priceHTML = `
                <span class="price">
                    <span class="woocommerce-Price-amount amount"><bdi>${formatPrice(vehicle.price)}&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi></span>
                </span>`;
        }

        const saleTag = vehicle.sale_price ? '<span class="onsale" style="position:absolute;top:10px;left:10px;background:#d4e600;color:#1a1a2e;padding:4px 12px;font-weight:700;font-size:14px;z-index:2;border-radius:3px">Προσφορά!</span>' : '';

        return `
            <li class="product type-product" data-vehicle-id="${vehicle.id}" data-price="${vehicle.sale_price || vehicle.price}" style="list-style:none;position:relative;margin-bottom:30px;">
                ${saleTag}
                <a href="${productUrl}" class="woocommerce-LoopProduct-link">
                    <img src="${imgSrc}" alt="${vehicle.name}" class="attachment-woocommerce_thumbnail" style="width:100%;height:auto;border-radius:4px" loading="lazy" onerror="this.src='../../wp-content/uploads/2021/11/automarinikas-logo.jpg'" />
                    <h2 class="woocommerce-loop-product__title" style="font-size:16px;font-weight:600;margin:10px 0 5px;color:#333">${vehicle.name}</h2>
                </a>
                ${priceHTML}
                <p style="font-size:13px;color:#666;margin:5px 0">${vehicle.description || ''}</p>
                <a href="${productUrl}" class="button add_to_cart_button" style="display:inline-block;background:#fff;border:2px solid #333;color:#333;padding:8px 20px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px;cursor:pointer;transition:all 0.2s;border-radius:4px" onmouseover="this.style.background='#333';this.style.color='#fff'" onmouseout="this.style.background='#fff';this.style.color='#333'">Προσθήκη στο καλάθι</a>
            </li>`;
    }

    // Find and replace the product listing area
    function renderVehicles(vehicles) {
        // Find the existing product listing - try multiple selectors
        let productContainer = document.querySelector('ul.products') 
            || document.querySelector('.products')
            || document.querySelector('.thrv_woocommerce_shop_products ul')
            || document.querySelector('.thrv_woocommerce_shop_products');

        if (!productContainer) {
            console.warn('Dynamic vehicles: No product container found');
            return;
        }

        // Clear existing products and render new ones
        productContainer.innerHTML = '';
        productContainer.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:30px;list-style:none;padding:0;margin:20px 0;';

        if (vehicles.length === 0) {
            productContainer.innerHTML = '<li style="grid-column:1/-1;text-align:center;padding:40px;color:#666;font-size:18px">Δεν βρέθηκαν οχήματα</li>';
            return;
        }

        // Only show in-stock vehicles
        const inStock = vehicles.filter(v => v.in_stock !== false);
        inStock.forEach(vehicle => {
            productContainer.insertAdjacentHTML('beforeend', createProductCard(vehicle));
        });

        // Update the price filter min/max
        updatePriceFilterRange(inStock);

        console.log(`Dynamic vehicles: Rendered ${inStock.length} vehicles`);
    }

    function updatePriceFilterRange(vehicles) {
        if (vehicles.length === 0) return;
        const prices = vehicles.map(v => v.sale_price || v.price);
        const minPrice = Math.floor(Math.min(...prices));
        const maxPrice = Math.ceil(Math.max(...prices));

        const minInput = document.getElementById('min_price');
        const maxInput = document.getElementById('max_price');
        if (minInput) {
            minInput.setAttribute('data-min', minPrice);
            if (!new URLSearchParams(window.location.search).has('min_price')) {
                minInput.value = minPrice;
            }
        }
        if (maxInput) {
            maxInput.setAttribute('data-max', maxPrice);
            if (!new URLSearchParams(window.location.search).has('max_price')) {
                maxInput.value = maxPrice;
            }
        }
    }

    // Main: load and render
    async function loadVehicles() {
        const category = getCurrentCategory();
        if (!category) return; // Not on a category page

        try {
            // Add cache buster to get latest data
            const cacheBust = '?t=' + Math.floor(Date.now() / 60000); // Cache for 1 minute
            const response = await fetch(VEHICLES_JSON_URL + cacheBust);
            if (!response.ok) throw new Error('Failed to load vehicles');
            
            const data = await response.json();
            const vehicles = data[category] || [];
            renderVehicles(vehicles);
        } catch (err) {
            console.error('Dynamic vehicles: Error loading', err);
            // Don't remove existing static content on error
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadVehicles);
    } else {
        loadVehicles();
    }
})();
