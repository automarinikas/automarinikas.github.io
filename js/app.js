/**
 * Auto Marinikas — App script
 * Handles: mobile menu toggle, header scroll effect, price filter
 * Uses design tokens from shared.css (no hardcoded colors)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = mobileToggle.querySelector('i');
      if (icon) { icon.classList.toggle('fa-bars'); icon.classList.toggle('fa-times'); }
    });
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        const icon = mobileToggle.querySelector('i');
        if (icon) { icon.classList.remove('fa-times'); icon.classList.add('fa-bars'); }
      });
    });
  }

  // Header Scroll Effect
  const siteHeader = document.getElementById('site-header');
  if (siteHeader) {
    window.addEventListener('scroll', () => {
      siteHeader.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // ==================== PRICE FILTER ====================
  // Wait a bit for vehicles-loader.js to populate the products
  setTimeout(initPriceFilter, 500);
});

function initPriceFilter() {
  // Find ONLY the first price_slider_wrapper (avoid duplicate)
  const allSliders = document.querySelectorAll('.price_slider_wrapper');
  if (allSliders.length === 0) return;

  // Use first one, hide any extras
  const priceSlider = allSliders[0];
  for (let i = 1; i < allSliders.length; i++) {
    const section = allSliders[i].closest('section') || allSliders[i].closest('.thrv_woocommerce_price_filter');
    if (section) section.style.display = 'none';
  }

  const minInput = document.getElementById('min_price');
  const maxInput = document.getElementById('max_price');
  if (!minInput || !maxInput) return;

  // Find all product cards (rendered by vehicles-loader.js)
  let productCards = [];
  document.querySelectorAll('li.product[data-price], li.product[data-vehicle-id]').forEach(li => {
    let price = parseFloat(li.getAttribute('data-price'));
    if (!price) {
      const priceEl = li.querySelector('ins .woocommerce-Price-amount bdi') || li.querySelector('.woocommerce-Price-amount bdi');
      if (priceEl) {
        price = parseFloat(priceEl.textContent.replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.'));
      }
    }
    if (price) productCards.push({ el: li, price });
  });

  if (productCards.length === 0) return;

  // Calculate min/max from actual vehicle prices
  const prices = productCards.map(p => p.price);
  const dataMin = Math.floor(Math.min(...prices) / 100) * 100;
  const dataMax = Math.ceil(Math.max(...prices) / 100) * 100;

  minInput.setAttribute('data-min', dataMin);
  maxInput.setAttribute('data-max', dataMax);
  minInput.value = dataMin;
  maxInput.value = dataMax;

  // Sort products low-to-high by price
  const container = productCards[0].el.parentElement;
  if (container) {
    productCards.sort((a, b) => a.price - b.price);
    productCards.forEach(p => container.appendChild(p.el));
  }

  // Replace WooCommerce slider with a working HTML range slider (single slider for simplicity)
  const sliderDiv = priceSlider.querySelector('.price_slider');
  if (sliderDiv) sliderDiv.style.display = 'none';

  const amountDiv = priceSlider.querySelector('.price_slider_amount');
  const labelDiv = priceSlider.querySelector('.price_label');

  // Remove any existing custom sliders
  priceSlider.querySelectorAll('.custom-price-slider').forEach(el => el.remove());

  const sliderHTML = `
    <div class="custom-price-slider" style="padding: 10px 0;">
      <div style="position:relative;height:30px;margin-bottom:5px;">
        <input type="range" id="price-range-min" min="${dataMin}" max="${dataMax}" value="${dataMin}" step="100"
          style="position:absolute;width:100%;pointer-events:none;appearance:none;-webkit-appearance:none;background:transparent;z-index:2;">
        <input type="range" id="price-range-max" min="${dataMin}" max="${dataMax}" value="${dataMax}" step="100"
          style="position:absolute;width:100%;pointer-events:none;appearance:none;-webkit-appearance:none;background:transparent;z-index:3;">
        <div style="position:absolute;left:0;right:0;top:12px;height:6px;background:rgba(15,29,123,0.15);border-radius:3px;">
          <div id="price-track" style="position:absolute;height:100%;background:#0f1d7b;border-radius:3px;"></div>
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
    if (fromSpan) fromSpan.textContent = formatEUR(dataMin);
    if (toSpan) toSpan.textContent = formatEUR(dataMax);
  }

  // Style thumbs
  const style = document.createElement('style');
  style.textContent = `
    .custom-price-slider input[type="range"] { pointer-events: none; }
    .custom-price-slider input[type="range"]::-webkit-slider-thumb { pointer-events: all; cursor: pointer; -webkit-appearance: none; width: 20px; height: 20px; background: #0f1d7b; border-radius: 50%; border: 2px solid #e7ff00; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    .custom-price-slider input[type="range"]::-moz-range-thumb { pointer-events: all; cursor: pointer; width: 20px; height: 20px; background: #0f1d7b; border-radius: 50%; border: 2px solid #e7ff00; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
  `;
  document.head.appendChild(style);

  const rangeMin = document.getElementById('price-range-min');
  const rangeMax = document.getElementById('price-range-max');
  const track = document.getElementById('price-track');

  function updateTrack() {
    const min = parseInt(rangeMin.value);
    const max = parseInt(rangeMax.value);
    const range = dataMax - dataMin || 1;
    const left = ((min - dataMin) / range) * 100;
    const right = ((max - dataMin) / range) * 100;
    if (track) { track.style.left = left + '%'; track.style.width = (right - left) + '%'; }
  }

  function filterProducts() {
    let min = parseInt(rangeMin.value);
    let max = parseInt(rangeMax.value);
    if (min > max) [min, max] = [max, min];

    minInput.value = min;
    maxInput.value = max;

    if (labelDiv) {
      const fromSpan = labelDiv.querySelector('.from');
      const toSpan = labelDiv.querySelector('.to');
      if (fromSpan) fromSpan.textContent = formatEUR(min);
      if (toSpan) toSpan.textContent = formatEUR(max);
    }

    updateTrack();

    // Filter product cards live
    productCards.forEach(p => {
      p.el.style.display = (p.price >= min && p.price <= max) ? '' : 'none';
    });
  }

  if (rangeMin && rangeMax) {
    rangeMin.addEventListener('input', filterProducts);
    rangeMax.addEventListener('input', filterProducts);
  }

  // Intercept the filter button
  const filterForm = priceSlider.closest('form');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      filterProducts();
    });
  }

  updateTrack();
}

function formatEUR(n) {
  return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
