/**
 * Automarinikas - Dynamic Vehicle Loader & Live Price Filter
 * Loads vehicles from data/vehicles.json, renders product cards,
 * and provides smooth, instantaneous real-time price filtering.
 */
(function() {
    'use strict';

    const VEHICLES_JSON_URL = (window.SHOP_CONFIG && window.SHOP_CONFIG.VEHICLES_JSON) || '/data/vehicles.json';
    let loadedVehicles = [];

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

    function formatPriceInt(price) {
        return new Intl.NumberFormat('el-GR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    // Create HTML for a single product card
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
                    <span class="screen-reader-text">Original price: ${formatPrice(vehicle.price)}&euro;</span>
                    <ins aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi>${formatPrice(vehicle.sale_price)}&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi></span></ins>
                </span>`;
        } else {
            priceHTML = `
                <span class="price">
                    <span class="woocommerce-Price-amount amount"><bdi>${formatPrice(vehicle.price)}&nbsp;<span class="woocommerce-Price-currencySymbol">&euro;</span></bdi></span>
                </span>`;
        }

        const saleTag = vehicle.on_offer ? '<span class="onsale" style="position:absolute;top:10px;left:10px;background:#e7ff00;color:#0f1d7b;padding:4px 12px;font-weight:700;font-size:14px;z-index:2;border-radius:3px">Προσφορά!</span>' : '';

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

    function renderVehicleList(vehicles) {
        let productContainer = document.querySelector('ul.products') 
            || document.querySelector('.products')
            || document.querySelector('.thrv_woocommerce_shop_products ul')
            || document.querySelector('.thrv_woocommerce_shop_products');

        if (!productContainer) return;

        productContainer.innerHTML = '';
        productContainer.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:30px;list-style:none;padding:0;margin:20px 0;';

        if (vehicles.length === 0) {
            productContainer.innerHTML = '<li style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#666;font-size:18px;background:#f9f9f9;border-radius:8px">Δεν βρέθηκαν οχήματα σε αυτό το εύρος τιμών.</li>';
            return;
        }

        vehicles.forEach(v => {
            productContainer.insertAdjacentHTML('beforeend', createProductCard(v));
        });
    }

    // Initialize live interactive price filter
    function setupPriceFilter(vehicles) {
        if (vehicles.length === 0) return;

        const prices = vehicles.map(v => v.sale_price || v.price);
        const minBoundary = Math.floor(Math.min(...prices) / 100) * 100;
        const maxBoundary = Math.ceil(Math.max(...prices) / 100) * 100;

        // Find filter widgets
        const filterWrappers = document.querySelectorAll('.price_slider_wrapper');
        if (filterWrappers.length === 0) return;

        // Hide duplicate filter widgets if any exist in the page
        filterWrappers.forEach((w, idx) => {
            if (idx > 0) {
                const parentSection = w.closest('section') || w.closest('.thrv_woocommerce_price_filter');
                if (parentSection) parentSection.style.display = 'none';
            }
        });

        const wrapper = filterWrappers[0];
        
        // Hide default static woo slider elements
        const oldSlider = wrapper.querySelector('.price_slider');
        if (oldSlider) oldSlider.style.display = 'none';

        // Check if our custom slider is already inserted
        let customBox = wrapper.querySelector('.am-custom-price-slider');
        if (!customBox) {
            customBox = document.createElement('div');
            customBox.className = 'am-custom-price-slider';
            customBox.style.cssText = 'padding: 15px 0 10px; user-select: none;';
            
            customBox.innerHTML = `
                <div style="position:relative;height:28px;margin-bottom:12px;">
                    <div style="position:absolute;left:0;right:0;top:11px;height:6px;background:#e2e8f0;border-radius:3px;">
                        <div id="am-filter-track" style="position:absolute;height:100%;background:#0f1d7b;border-radius:3px;left:0%;width:100%"></div>
                    </div>
                    <input type="range" id="am-range-min" min="${minBoundary}" max="${maxBoundary}" value="${minBoundary}" step="50"
                        style="position:absolute;width:100%;appearance:none;-webkit-appearance:none;background:transparent;pointer-events:none;z-index:10;margin:0;top:2px;">
                    <input type="range" id="am-range-max" min="${minBoundary}" max="${maxBoundary}" value="${maxBoundary}" step="50"
                        style="position:absolute;width:100%;appearance:none;-webkit-appearance:none;background:transparent;pointer-events:none;z-index:11;margin:0;top:2px;">
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:14px;color:#333;font-weight:700;">
                    <span>Τιμή: <span id="am-label-from" style="color:#0f1d7b">${formatPriceInt(minBoundary)} €</span> &mdash; <span id="am-label-to" style="color:#0f1d7b">${formatPriceInt(maxBoundary)} €</span></span>
                </div>
            `;

            // Insert at top of wrapper
            wrapper.insertBefore(customBox, wrapper.firstChild);

            // Add styles for slider thumbs
            if (!document.getElementById('am-slider-styles')) {
                const style = document.createElement('style');
                style.id = 'am-slider-styles';
                style.textContent = `
                    .am-custom-price-slider input[type="range"]::-webkit-slider-thumb {
                        pointer-events: all;
                        cursor: grab;
                        -webkit-appearance: none;
                        width: 22px;
                        height: 22px;
                        border-radius: 50%;
                        background: #0f1d7b;
                        border: 3px solid #e7ff00;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        transition: transform 0.1s;
                    }
                    .am-custom-price-slider input[type="range"]::-webkit-slider-thumb:active {
                        cursor: grabbing;
                        transform: scale(1.15);
                    }
                    .am-custom-price-slider input[type="range"]::-moz-range-thumb {
                        pointer-events: all;
                        cursor: grab;
                        width: 22px;
                        height: 22px;
                        border-radius: 50%;
                        background: #0f1d7b;
                        border: 3px solid #e7ff00;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    }
                `;
                document.head.appendChild(style);
            }
        }

        const rangeMin = document.getElementById('am-range-min');
        const rangeMax = document.getElementById('am-range-max');
        const track = document.getElementById('am-filter-track');
        const labelFrom = document.getElementById('am-label-from');
        const labelTo = document.getElementById('am-label-to');

        // Dynamic z-index handling to prevent thumbs from blocking each other
        rangeMin.addEventListener('input', () => {
            if (parseInt(rangeMin.value) > parseInt(rangeMax.value) - 100) {
                rangeMin.value = parseInt(rangeMax.value) - 100;
            }
            rangeMin.style.zIndex = '12';
            rangeMax.style.zIndex = '11';
            onFilterChange();
        });

        rangeMax.addEventListener('input', () => {
            if (parseInt(rangeMax.value) < parseInt(rangeMin.value) + 100) {
                rangeMax.value = parseInt(rangeMin.value) + 100;
            }
            rangeMax.style.zIndex = '12';
            rangeMin.style.zIndex = '11';
            onFilterChange();
        });

        function onFilterChange() {
            const minVal = parseInt(rangeMin.value);
            const maxVal = parseInt(rangeMax.value);

            // Update Track
            const total = maxBoundary - minBoundary || 1;
            const leftPercent = ((minVal - minBoundary) / total) * 100;
            const rightPercent = ((maxVal - minBoundary) / total) * 100;
            if (track) {
                track.style.left = leftPercent + '%';
                track.style.width = (rightPercent - leftPercent) + '%';
            }

            // Update Labels
            if (labelFrom) labelFrom.textContent = formatPriceInt(minVal) + ' €';
            if (labelTo) labelTo.textContent = formatPriceInt(maxVal) + ' €';

            // Filter loaded vehicles instantly
            const filtered = loadedVehicles.filter(v => {
                const p = v.sale_price || v.price;
                return p >= minVal && p <= maxVal;
            });
            renderVehicleList(filtered);
        }

        // Intercept form submission so button also filters smoothly without reload
        const form = wrapper.closest('form');
        if (form) {
            form.onsubmit = function(e) {
                e.preventDefault();
                onFilterChange();
                return false;
            };
        }

        // Initial setup
        onFilterChange();
    }

    // Main: load and render
    async function loadVehicles() {
        const category = getCurrentCategory();
        if (!category) return;

        try {
            const cacheBust = '?t=' + Math.floor(Date.now() / 60000);
            const response = await fetch(VEHICLES_JSON_URL + cacheBust);
            if (!response.ok) throw new Error('Failed to load vehicles');
            
            const data = await response.json();
            const vehicles = data[category] || [];

            // Sort vehicles cheapest first
            loadedVehicles = vehicles
                .filter(v => v.in_stock !== false)
                .sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));

            renderVehicleList(loadedVehicles);
            setupPriceFilter(loadedVehicles);

            console.log(`Dynamic vehicles: Successfully loaded & initialized filter for ${loadedVehicles.length} items`);
        } catch (err) {
            console.error('Dynamic vehicles: Error loading', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadVehicles);
    } else {
        loadVehicles();
    }
})();
