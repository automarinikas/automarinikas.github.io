/**
 * Auto Marinikas — Simple app script
 * Handles: mobile menu toggle, header scroll effect, smooth scroll, price filter
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      // Toggle icon between bars and times
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });

    // Close menu when clicking a nav link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        const icon = mobileToggle.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-times');
          icon.classList.add('fa-bars');
        }
      });
    });
  }

  // Header Scroll Effect
  const siteHeader = document.getElementById('site-header');
  if (siteHeader) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    });
  }

  // ==================== PRICE FILTER ====================
  initPriceFilter();
});

function initPriceFilter() {
  const priceSlider = document.querySelector('.price_slider_wrapper');
  if (!priceSlider) return;

  const minInput = document.getElementById('min_price');
  const maxInput = document.getElementById('max_price');
  if (!minInput || !maxInput) return;

  const dataMin = parseFloat(minInput.getAttribute('data-min')) || 0;
  const dataMax = parseFloat(maxInput.getAttribute('data-max')) || 50000;

  // Read URL params for initial values
  const params = new URLSearchParams(window.location.search);
  let currentMin = parseFloat(params.get('min_price')) || dataMin;
  let currentMax = parseFloat(params.get('max_price')) || dataMax;

  // Find all product cards
  const products = document.querySelectorAll('.thrv_woocommerce_shop_products li.product, ul.products li.product');
  
  // If no standard product list, try to find Thrive-rendered products
  let productCards = [];
  if (products.length === 0) {
    // Look for product containers with prices
    document.querySelectorAll('.woocommerce-loop-product__title').forEach(title => {
      // Walk up to find the product container (usually an <li> or a wrapper div)
      let card = title.closest('li.product') || title.closest('.product') || title.parentElement;
      if (card) {
        const priceEl = card.querySelector('.woocommerce-Price-amount bdi');
        if (priceEl) {
          const priceText = priceEl.textContent.replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.');
          const price = parseFloat(priceText);
          productCards.push({ el: card, price: price, name: title.textContent });
        }
      }
    });
  } else {
    products.forEach(p => {
      const priceEl = p.querySelector('.woocommerce-Price-amount bdi');
      const titleEl = p.querySelector('.woocommerce-loop-product__title');
      if (priceEl) {
        const priceText = priceEl.textContent.replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.');
        productCards.push({ el: p, price: parseFloat(priceText), name: titleEl ? titleEl.textContent : '' });
      }
    });
  }

  if (productCards.length === 0) return;

  // Replace the WooCommerce slider with a working HTML range slider
  const sliderDiv = priceSlider.querySelector('.price_slider');
  const amountDiv = priceSlider.querySelector('.price_slider_amount');
  const labelDiv = priceSlider.querySelector('.price_label');

  if (sliderDiv) {
    sliderDiv.style.display = 'none';
  }

  // Create dual range slider
  const sliderHTML = `
    <div class="custom-price-slider" style="padding: 10px 0;">
      <div style="position:relative;height:30px;margin-bottom:5px;">
        <input type="range" id="price-range-min" min="${dataMin}" max="${dataMax}" value="${currentMin}" step="50"
          style="position:absolute;width:100%;pointer-events:none;appearance:none;-webkit-appearance:none;background:transparent;z-index:2;">
        <input type="range" id="price-range-max" min="${dataMin}" max="${dataMax}" value="${currentMax}" step="50"
          style="position:absolute;width:100%;pointer-events:none;appearance:none;-webkit-appearance:none;background:transparent;z-index:3;">
        <div style="position:absolute;left:0;right:0;top:12px;height:6px;background:#ddd;border-radius:3px;">
          <div id="price-track" style="position:absolute;height:100%;background:#1a4b8c;border-radius:3px;"></div>
        </div>
      </div>
    </div>
  `;

  if (amountDiv) {
    amountDiv.insertAdjacentHTML('afterbegin', sliderHTML);
  }

  // Show the label
  if (labelDiv) {
    labelDiv.style.display = 'block';
    const fromSpan = labelDiv.querySelector('.from');
    const toSpan = labelDiv.querySelector('.to');
    if (fromSpan) fromSpan.textContent = formatEUR(currentMin);
    if (toSpan) toSpan.textContent = formatEUR(currentMax);
  }

  // Style the range inputs for cross-browser
  const style = document.createElement('style');
  style.textContent = `
    .custom-price-slider input[type="range"] { pointer-events: none; }
    .custom-price-slider input[type="range"]::-webkit-slider-thumb { pointer-events: all; cursor: pointer; -webkit-appearance: none; width: 20px; height: 20px; background: #1a4b8c; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    .custom-price-slider input[type="range"]::-moz-range-thumb { pointer-events: all; cursor: pointer; width: 20px; height: 20px; background: #1a4b8c; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  `;
  document.head.appendChild(style);

  const rangeMin = document.getElementById('price-range-min');
  const rangeMax = document.getElementById('price-range-max');
  const track = document.getElementById('price-track');

  function updateTrack() {
    const min = parseInt(rangeMin.value);
    const max = parseInt(rangeMax.value);
    const range = dataMax - dataMin;
    const left = ((min - dataMin) / range) * 100;
    const right = ((max - dataMin) / range) * 100;
    if (track) {
      track.style.left = left + '%';
      track.style.width = (right - left) + '%';
    }
  }

  function filterProducts() {
    let min = parseInt(rangeMin.value);
    let max = parseInt(rangeMax.value);

    // Ensure min <= max
    if (min > max) {
      [min, max] = [max, min];
    }

    // Update hidden inputs
    minInput.value = min;
    maxInput.value = max;

    // Update label
    if (labelDiv) {
      const fromSpan = labelDiv.querySelector('.from');
      const toSpan = labelDiv.querySelector('.to');
      if (fromSpan) fromSpan.textContent = formatEUR(min);
      if (toSpan) toSpan.textContent = formatEUR(max);
    }

    updateTrack();

    // Filter product cards
    productCards.forEach(p => {
      if (p.price >= min && p.price <= max) {
        p.el.style.display = '';
      } else {
        p.el.style.display = 'none';
      }
    });
  }

  if (rangeMin && rangeMax) {
    rangeMin.addEventListener('input', filterProducts);
    rangeMax.addEventListener('input', filterProducts);
  }

  // Intercept the filter button to prevent page reload
  const filterForm = priceSlider.closest('form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      filterProducts();
    });
  }

  // Initial filter
  updateTrack();
  if (params.has('min_price') || params.has('max_price')) {
    filterProducts();
  }
}

function formatEUR(n) {
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
