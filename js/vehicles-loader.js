/**
 * Automarinikas - Dynamic Vehicle Loader, Live Search & Price Filter
 * Loads vehicles from data/vehicles.json, renders product cards,
 * and provides smooth, instantaneous real-time search & price filtering.
 */
(function() {
    'use strict';

    const VEHICLES_JSON_URL = (window.SHOP_CONFIG && window.SHOP_CONFIG.VEHICLES_JSON) || '/data/vehicles.json';
    let loadedVehicles = [];
    let currentSearchQuery = '';
    let currentSortOrder = 'price'; // default: cheapest first

    // Detect which page/category we're on
    function getCurrentCategory() {
        const path = window.location.pathname;
        if (path.includes('μεταχειρισμένα-αυτοκίνητα') || path.includes('%CE%BC%CE%B5%CF%84%CE%B1%CF%87%CE%B5%CE%B9%CF%81%CE%B9%CF%83%CE%BC%CE%AD%CE%BD%CE%B1-%CE%B1%CF%85%CF%84%CE%BF%CE%BA%CE%AF%CE%BD%CE%B7%CF%84%CE%B1')) {
            return 'cars';
        }
        if (path.includes('μεταχειρισμένες-μοτοσυκλέτες') || path.includes('%CE%BC%CE%B5%CF%84%CE%B1%CF%87%CE%B5%CE%B9%CF%81%CE%B9%CF%83%CE%BC%CE%AD%CE%BD%CE%B5%CF%82-%CE%BC%CE%BF%CF%84%CE%BF%CF%83%CF%85%CE%BA%CE%BB%CE%AD%CF%84%CE%B5%CF%82')) {
            return 'motorcycles';
        }
        if (path.includes('/product/')) {
            return 'related';
        }
        // Homepage / Root
        return 'all';
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

    // Clean / normalize string for fuzzy search
    function cleanStr(s) {
        return (s || '').toLowerCase()
            .replace(/[άαΆΑ]/g, 'α')
            .replace(/[έεΈΕ]/g, 'ε')
            .replace(/[ήηΉΗ]/g, 'η')
            .replace(/[ίιϊΐΊΙΪ]/g, 'ι')
            .replace(/[όοΌΟ]/g, 'ο')
            .replace(/[ύυϋΰΎΥΫ]/g, 'υ')
            .replace(/[ώωΏΩ]/g, 'ω');
    }

    function matchesSearch(vehicle, query) {
        if (!query) return true;
        const q = cleanStr(query.trim());
        if (!q) return true;
        const haystack = cleanStr(`${vehicle.name} ${vehicle.description || ''} ${vehicle.slug}`);
        const words = q.split(/\s+/);
        return words.every(w => haystack.includes(w));
    }

    // Create HTML for a single product card
    function createProductCard(vehicle) {
        const firstImg = vehicle.images && vehicle.images.length > 0 ? vehicle.images[0] : '';
        const imgSrc = firstImg
            ? (firstImg.startsWith('http') ? firstImg : '/' + firstImg.replace(/^\//, ''))
            : '/wp-content/uploads/2021/11/automarinikas-logo.jpg';

        const productUrl = '/product/' + vehicle.slug + '/';

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

        const isOnOffer = vehicle.on_offer || (vehicle.sale_price && vehicle.sale_price < vehicle.price);
        const saleTag = isOnOffer ? '<span class="onsale" style="position:absolute;top:10px;left:10px;background:#e7ff00;color:#0f1d7b;padding:4px 12px;font-weight:700;font-size:14px;z-index:2;border-radius:3px">Προσφορά!</span>' : '';

        return `
            <li class="product type-product" data-vehicle-id="${vehicle.id}" data-price="${vehicle.sale_price || vehicle.price}">
                ${saleTag}
                <a href="${productUrl}" class="woocommerce-LoopProduct-link">
                    <img src="${imgSrc}" alt="${vehicle.name}" class="attachment-woocommerce_thumbnail" loading="lazy" onerror="this.src='/wp-content/uploads/2021/11/automarinikas-logo.jpg'" />
                    <h2 class="woocommerce-loop-product__title" style="font-size:16px;font-weight:600;margin:10px 0 5px;color:#333">${vehicle.name}</h2>
                </a>
                ${priceHTML}
                <p style="font-size:13px;color:#666;margin:5px 0">${vehicle.description || ''}</p>
                <a href="${productUrl}" class="button add_to_cart_button" style="display:inline-block;background:#fff;border:2px solid #333;color:#333;padding:8px 20px;text-decoration:none;font-size:14px;font-weight:600;margin-top:auto;cursor:pointer;transition:all 0.2s;border-radius:4px;text-align:center" onmouseover="this.style.background='#333';this.style.color='#fff'" onmouseout="this.style.background='#fff';this.style.color='#333'">Προσθήκη στο καλάθι</a>
            </li>`;
    }

    function renderVehicleList(vehicles) {
        let productContainer = document.getElementById('am-homepage-products')
            || document.querySelector('ul.products') 
            || document.querySelector('.products')
            || document.querySelector('.thrv_woocommerce_shop_products ul')
            || document.querySelector('.thrv_woocommerce_shop_products');

        if (!productContainer) return;

        productContainer.innerHTML = '';
        productContainer.classList.add('am-vehicle-grid');

        // Update result count if present
        const resultCount = document.getElementById('am-result-count')
            || document.querySelector('.woocommerce-result-count');
        if (resultCount) {
            resultCount.textContent = vehicles.length > 0 
                ? `Προβάλλονται όλα - ${vehicles.length} αποτελέσματα`
                : '';
        }

        if (vehicles.length === 0) {
            productContainer.innerHTML = '<li style="grid-column:1/-1;text-align:center;padding:50px 20px;color:#666;font-size:18px;background:#f9f9f9;border-radius:8px">Δεν βρέθηκαν οχήματα που να ταιριάζουν στα κριτήρια αναζήτησης.</li>';
            return;
        }

        vehicles.forEach(v => {
            productContainer.insertAdjacentHTML('beforeend', createProductCard(v));
        });
    }

    // Sort vehicles based on current sort order
    function sortVehicles(vehicles) {
        const sorted = [...vehicles];
        switch (currentSortOrder) {
            case 'price':
                sorted.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
                break;
            case 'price-desc':
                sorted.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
                break;
            case 'date':
                sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
                break;
            case 'popularity':
            default:
                sorted.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
                break;
        }
        return sorted;
    }

    // Setup the WooCommerce ordering dropdown to sort dynamically
    function setupSortDropdown() {
        const orderForms = document.querySelectorAll('form.woocommerce-ordering');
        orderForms.forEach(form => {
            form.addEventListener('submit', e => { e.preventDefault(); });
            const select = form.querySelector('select.orderby');
            if (select) {
                // Check URL for initial sort
                const urlParams = new URLSearchParams(window.location.search);
                const urlSort = urlParams.get('orderby');
                if (urlSort) {
                    select.value = urlSort;
                    currentSortOrder = urlSort;
                }
                select.addEventListener('change', function() {
                    currentSortOrder = this.value;
                    if (window.__amApplyFilter) {
                        window.__amApplyFilter();
                    } else {
                        renderVehicleList(sortVehicles(loadedVehicles));
                    }
                    // Update URL without reload
                    const url = new URL(window.location);
                    url.searchParams.set('orderby', this.value);
                    window.history.replaceState({}, '', url);
                });
            }
        });
    }

    // Setup interactive search input (prevents page redirect, filters instantly on typing)
    function setupLiveSearch() {
        const searchForms = document.querySelectorAll('form.woocommerce-product-search, form[role="search"], form.search-form');
        searchForms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                return false;
            });
        });

        const searchInputs = document.querySelectorAll('.am-live-search-input, input.search-field, input[type="search"], input[name="s"], textarea.search-field');
        searchInputs.forEach(input => {
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('spellcheck', 'false');
            input.placeholder = '🔍 Αναζήτηση οχήματος...';

            const onInput = function() {
                currentSearchQuery = this.value;
                if (window.__amApplyFilter) window.__amApplyFilter();
            };

            input.addEventListener('input', onInput);
            input.addEventListener('keyup', onInput);
            input.addEventListener('change', onInput);
            input.addEventListener('search', onInput);
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            });
        });
    }

    // Initialize smooth, glitch-free, 100% instant dual-range price slider
    function setupPriceFilter(vehicles) {
        if (!vehicles || vehicles.length === 0) return;

        const prices = vehicles.map(v => v.sale_price || v.price);
        let minPrice = Math.min(...prices);
        let maxPrice = Math.max(...prices);

        let minBoundary = Math.floor(minPrice / 100) * 100;
        let maxBoundary = Math.ceil(maxPrice / 100) * 100;

        if (maxBoundary <= minBoundary) {
            minBoundary = Math.max(0, minBoundary - 500);
            maxBoundary = maxBoundary + 500;
        }

        // Locate widget target
        const widgetContainer = document.getElementById('am-price-filter-root')
            || document.querySelector('.thrv_woocommerce_price_filter') 
            || document.querySelector('.widget_price_filter') 
            || document.querySelector('.price_slider_wrapper');
        
        if (!widgetContainer) return;

        // Render clean custom HTML with Dual Range Slider
        widgetContainer.innerHTML = `
            <div class="am-filter-card">
                <div class="am-filter-header">
                    <span class="am-filter-title">Εύρος Τιμής</span>
                    <button type="button" class="am-reset-btn" id="am-reset-filters">Επαναφορά</button>
                </div>
                
                <div class="am-price-badge-row">
                    <span class="am-price-val" id="am-val-min">${formatPriceInt(minBoundary)} €</span>
                    <span class="am-price-sep">έως</span>
                    <span class="am-price-val" id="am-val-max">${formatPriceInt(maxBoundary)} €</span>
                </div>

                <div class="am-range-slider-container">
                    <div class="am-range-track"></div>
                    <div class="am-range-selected" id="am-range-selected"></div>
                    <input type="range" id="am-slider-min" min="${minBoundary}" max="${maxBoundary}" value="${minBoundary}" step="50">
                    <input type="range" id="am-slider-max" min="${minBoundary}" max="${maxBoundary}" value="${maxBoundary}" step="50">
                </div>
            </div>
        `;

        const sliderMin = document.getElementById('am-slider-min');
        const sliderMax = document.getElementById('am-slider-max');
        const rangeSelected = document.getElementById('am-range-selected');
        const valMin = document.getElementById('am-val-min');
        const valMax = document.getElementById('am-val-max');
        const resetBtn = document.getElementById('am-reset-filters');

        function updateSliderVisuals(minVal, maxVal) {
            const total = maxBoundary - minBoundary || 1;
            const leftPct = Math.max(0, Math.min(100, ((minVal - minBoundary) / total) * 100));
            const rightPct = Math.max(0, Math.min(100, ((maxVal - minBoundary) / total) * 100));
            
            if (rangeSelected) {
                rangeSelected.style.left = leftPct + '%';
                rangeSelected.style.width = Math.max(0, rightPct - leftPct) + '%';
            }
            if (valMin) valMin.textContent = formatPriceInt(minVal) + ' €';
            if (valMax) valMax.textContent = formatPriceInt(maxVal) + ' €';
        }

        function applyFilterAndSearch() {
            const minVal = parseInt(sliderMin ? sliderMin.value : minBoundary);
            const maxVal = parseInt(sliderMax ? sliderMax.value : maxBoundary);

            updateSliderVisuals(minVal, maxVal);

            // Filter vehicles by price AND search query instantaneously
            const filtered = loadedVehicles.filter(v => {
                const p = v.sale_price || v.price;
                const matchesPrice = p >= minVal && p <= maxVal;
                return matchesPrice && matchesSearch(v, currentSearchQuery);
            });
            renderVehicleList(sortVehicles(filtered));
        }

        window.__amApplyFilter = applyFilterAndSearch;

        // Instant live slider handlers
        if (sliderMin && sliderMax) {
            sliderMin.addEventListener('input', function() {
                let minVal = parseInt(this.value);
                let maxVal = parseInt(sliderMax.value);
                if (minVal > maxVal - 50) {
                    this.value = maxVal - 50;
                }
                this.style.zIndex = '5';
                sliderMax.style.zIndex = '4';
                applyFilterAndSearch();
            });

            sliderMax.addEventListener('input', function() {
                let minVal = parseInt(sliderMin.value);
                let maxVal = parseInt(this.value);
                if (maxVal < minVal + 50) {
                    this.value = minVal + 50;
                }
                this.style.zIndex = '5';
                sliderMin.style.zIndex = '4';
                applyFilterAndSearch();
            });
        }

        // Reset button
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                if (sliderMin) sliderMin.value = minBoundary;
                if (sliderMax) sliderMax.value = maxBoundary;
                currentSearchQuery = '';
                document.querySelectorAll('.am-live-search-input, input.search-field, input[type="search"]').forEach(inp => inp.value = '');
                applyFilterAndSearch();
            });
        }

        // Initial apply
        applyFilterAndSearch();
    }

    // Main: load and render
    async function loadVehicles() {
        const category = getCurrentCategory();
        if (!category) return;

        try {
            const cacheBust = '?t=' + Date.now();
            const response = await fetch(VEHICLES_JSON_URL + cacheBust);
            if (!response.ok) throw new Error('Failed to load vehicles');
            const data = await response.json();
            
            let vehicles = [];
            if (category === 'cars') {
                vehicles = data.cars || [];
            } else if (category === 'motorcycles') {
                vehicles = data.motorcycles || [];
            } else if (category === 'all') {
                vehicles = [...(data.cars || []), ...(data.motorcycles || [])];
            } else if (category === 'related') {
                const currentSlug = window.location.pathname.split('/').filter(Boolean).pop();
                const allVehicles = [...(data.cars || []), ...(data.motorcycles || [])];
                vehicles = allVehicles.filter(v => v.slug !== currentSlug).slice(0, 4);
            }

            // Exclude sold/deleted (in_stock === false)
            loadedVehicles = vehicles.filter(v => v.in_stock !== false);

            // Check URL for initial sort order
            const urlParams = new URLSearchParams(window.location.search);
            const urlSort = urlParams.get('orderby');
            if (urlSort) currentSortOrder = urlSort;

            renderVehicleList(sortVehicles(loadedVehicles));
            setupSortDropdown();
            setupLiveSearch();
            setupPriceFilter(loadedVehicles);

            console.log(`Dynamic vehicles: Loaded & initialized ${loadedVehicles.length} vehicles for ${category}`);
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
