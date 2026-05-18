// ═══════════════════════════════════════════════
//  SHOPCOTTO — script.js v4.0
//  ★ Real images · Multi-item orders · Receipt
// ═══════════════════════════════════════════════

const API = 'api/api.php';

// ── LOCAL IMAGE MAP (uploaded real photos) ──────
// Maps product name keywords → local image filename
// Place images in /images/ folder on your server
const LOCAL_IMAGES = {
  'angel':           'images/angel.jpg',
  'christmas angel': 'images/angel.jpg',
  'attack on titan': 'images/attack.jpg',
  'mikasa':          'images/attack.jpg',
  'black widow':     'images/black_widow.jpg',
  'bleach':          'images/bleach.jpg',
  'ichigo':          'images/bleach.jpg',
  'bugs bunny':      'images/bugs_bunny.jpg',
  'devil':           'images/demon.jpg',
  'demon':           'images/demon.jpg',
  'elsa':            'images/elsa.jpg',
  'frozen':          'images/elsa.jpg',
  'flash':           'images/flash.jpg',
  'frankenstein':    'images/frank.jpg',
  'ghost':           'images/ghost.jpg',
  'phantom':         'images/ghost.jpg',
  'grim reaper':     'images/grimreaper.jpg',
  'reaper':          'images/grimreaper.jpg',
  'hero academia':   'images/heroacademia.jpg',
  'bakugo':          'images/heroacademia.jpg',
  'midoriya':        'images/heroacademia.jpg',
  'jack':            'images/jack.jpg',
  'frost':           'images/jack.jpg',
  'jujutsu':         'images/jujutsu.jpg',
  'gojo':            'images/jujutsu.jpg',
  'luffy':           'images/luffy.jpg',
  'one piece':       'images/luffy.jpg',
  'mickey':          'images/mickey.jpg',
  'mrs. claus':      'images/mrsclaude.jpg',
  'mrs claus':       'images/mrsclaude.jpg',
  'naruto':          'images/naruto.jpg',
  'uzumaki':         'images/naruto.jpg',
  'nutcracker':      'images/nutcraker.jpg',
  'pikachu':         'images/pikachu.jpg',
  // Local-only images (from your server path)
  'powerpuff':       'images/power puff girls.jpg',
  'power puff':      'images/power puff girls.jpg',
  'sailor':          'images/sailor.jpg',
  'santa claus':     'images/santa.jpg',
  'scooby':          'images/scooby.jpg',
  'shrek':           'images/shrek.jpg',
  'tokyo':           'images/tokyo.jpg',
  'tomcat':          'images/tomvat.jpg',
  'christmas tree':  'images/tree.jpg',
  'tree suit':       'images/tree.jpg',
  'witch':           'images/witch.jpg',
  'zombie':          'images/Zombienurse.jpg',
};

// Resolve image URL for a product
function resolveImage(p) {
  const name = (p.name || '').toLowerCase();
  const desc = (p.description || '').toLowerCase();
  const combined = name + ' ' + desc;
  for (const [key, path] of Object.entries(LOCAL_IMAGES)) {
    if (combined.includes(key)) return path;
  }
  return p.image_url || '';
}

let cart        = JSON.parse(localStorage.getItem('shopcotto_cart') || '[]');
let allProducts = [];
let themes      = [];
let currentUser = null;
let selProduct  = null;
let detailQty   = 1;
let selRating   = 0;
let wishlist    = JSON.parse(localStorage.getItem('shopcotto_wish') || '[]');

// Multi-item order list: [{product_id, name, price, size, color, design, qty, image}]
let orderItems  = [];

// ── INIT ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initScrollNav();
  initMobileNav();
  initSearchBtn();
  setMinDate();
  loadThemes();
  loadProducts();
  updateCartBadge();
  checkSession();
});

// ── LOADER ──────────────────────────────────────
function initLoader() {
  const el = document.getElementById('pageLoader');
  if (!el) return;
  function hideLoader() {
    el.style.transition = 'opacity 0.6s ease, visibility 0.6s ease';
    el.style.opacity    = '0';
    el.style.visibility = 'hidden';
    el.style.pointerEvents = 'none';
    setTimeout(() => { el.style.display = 'none'; }, 650);
  }
  if (document.readyState === 'complete') setTimeout(hideLoader, 900);
  else {
    window.addEventListener('load', () => setTimeout(hideLoader, 900));
    setTimeout(hideLoader, 4500);
  }
}

// ── CUSTOM CURSOR ────────────────────────────────
function initCursor() {
  const cur = document.getElementById('cursor');
  const fol = document.getElementById('cursorFollower');
  if (!cur || !fol) return;
  let mx = 0, my = 0, fx = 0, fy = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.style.left = mx + 'px'; cur.style.top = my + 'px';
  });
  (function animFol() {
    fx += (mx - fx) * 0.15; fy += (my - fy) * 0.15;
    fol.style.left = fx + 'px'; fol.style.top = fy + 'px';
    requestAnimationFrame(animFol);
  })();
  document.querySelectorAll('button,a,.product-card,.theme-card').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.style.transform = 'translate(-50%,-50%) scale(2)'; });
    el.addEventListener('mouseleave', () => { cur.style.transform = 'translate(-50%,-50%) scale(1)'; });
  });
}

// ── NAV SCROLL ───────────────────────────────────
function initScrollNav() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 50);
    const sections = ['home','themes','shop'];
    let current = '';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) current = id;
    });
    document.querySelectorAll('.nav-link').forEach(l =>
      l.classList.toggle('active', l.getAttribute('href') === '#' + current)
    );
  });
}

function initMobileNav() { document.getElementById('navToggle')?.addEventListener('click', toggleNav); }
function toggleNav() { document.getElementById('navLinks')?.classList.toggle('open'); }
function closeNav()  { document.getElementById('navLinks')?.classList.remove('open'); }
function scrollToSection(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }
function setMinDate() {
  const el = document.getElementById('of_date');
  if (el) el.min = new Date().toISOString().split('T')[0];
}

// ── LOGIN GATE ───────────────────────────────────
function requireLogin(action) {
  if (!currentUser) { openModal('loginRequiredModal'); return false; }
  if (action) action();
  return true;
}

// ── SESSION CHECK ────────────────────────────────
async function checkSession() {
  try {
    const res  = await fetch(`${API}?action=check_session`);
    const data = await res.json();
    if (data.logged_in) { currentUser = data.customer; renderAuthArea(true); updateCartBadge(); }
  } catch (e) {}
}

function renderAuthArea(loggedIn) {
  const area = document.getElementById('authArea');
  if (!area) return;
  if (loggedIn && currentUser) {
    area.innerHTML = `
      <div class="user-dropdown" id="userDropdown">
        <button class="user-dd-btn" onclick="toggleDD()">
          👤 ${esc(currentUser.name.split(' ')[0])} ▾
        </button>
        <div class="user-dd-menu">
          <button class="dd-item" onclick="loadMyOrders(); closeDD()">📦 My Orders</button>
          <div class="dd-divider"></div>
          <button class="dd-item danger" onclick="doLogout()">🚪 Logout</button>
        </div>
      </div>`;
  } else {
    area.innerHTML = `
      <button class="btn-nav-login"    onclick="openAuth('login')">Login</button>
      <button class="btn-nav-register" onclick="openAuth('register')">Sign Up</button>`;
  }
}

function toggleDD() { document.getElementById('userDropdown')?.classList.toggle('open'); }
function closeDD()  { document.getElementById('userDropdown')?.classList.remove('open'); }
document.addEventListener('click', e => { if (!e.target.closest('#userDropdown')) closeDD(); });

// ── THEMES ───────────────────────────────────────
async function loadThemes() {
  try {
    const res  = await fetch(`${API}?action=get_themes`);
    const data = await res.json();
    themes = data.themes || [];
  } catch (e) {
    themes = [
      { id:1, name:'Halloween',   slug:'halloween',  icon:'🎃', description:'Spooky & scary costumes' },
      { id:2, name:'Anime',       slug:'anime',      icon:'⚡', description:'Iconic anime characters' },
      { id:3, name:'Superhero',   slug:'superhero',  icon:'🦸', description:'Marvel, DC & more' },
      { id:4, name:'Cartoons',    slug:'cartoons',   icon:'🎨', description:'Fun cartoon characters' },
      { id:5, name:'Christmas',   slug:'christmas',  icon:'🎄', description:'Festive holiday outfits' },
      { id:6, name:"Valentine's", slug:'valentines', icon:'❤️', description:'Romantic sweet looks' },
    ];
  }
  renderThemes();
  renderFilterTabs();
}

const THEME_COLORS = {
  halloween:  ['#FF6B35','#8B2500'],
  anime:      ['#6C63FF','#3F3CD8'],
  superhero:  ['#E53935','#1565C0'],
  cartoons:   ['#FFD600','#FF6F00'],
  christmas:  ['#2E7D32','#B71C1C'],
  valentines: ['#E91E63','#880E4F'],
};

function renderThemes() {
  const grid = document.getElementById('themesGrid');
  if (!grid) return;
  grid.innerHTML = themes.map(t => {
    const [a, b] = THEME_COLORS[t.slug] || ['#1E5C2A','#C9922A'];
    return `
    <div class="theme-card" onclick="filterByTheme('${t.slug}')" style="--tc-a:${a};--tc-b:${b}">
      <span class="tc-emoji">${t.icon || '🎭'}</span>
      <div class="tc-name">${t.name}</div>
      <div class="tc-desc">${t.description}</div>
      <div class="tc-footer">
        <span class="tc-count">10 costumes</span>
        <button class="tc-btn">View <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 14 0M12 5l7 7-7 7"/></svg></button>
      </div>
    </div>`;
  }).join('');
}

function renderFilterTabs() {
  const tabs = document.getElementById('filterTabs');
  if (!tabs) return;
  const btns = themes.map(t =>
    `<button class="fchip" data-theme="${t.slug}" onclick="filterByTheme('${t.slug}')">${t.icon || ''} ${t.name}</button>`
  ).join('');
  tabs.innerHTML = `<button class="fchip active" data-theme="" onclick="filterByTheme('')">All</button>${btns}`;
}

function filterByTheme(slug) {
  document.querySelectorAll('.fchip').forEach(b => b.classList.toggle('active', b.dataset.theme === slug));
  const th    = themes.find(t => t.slug === slug);
  const title = document.getElementById('shopTitle');
  if (title) title.innerHTML = slug ? `${th?.icon || ''} ${th?.name || ''} <em>Costumes</em>` : 'All <em>Costumes</em>';
  renderProducts(slug);
  scrollToSection('shop');
  closeNav();
}

// ── PRODUCTS ─────────────────────────────────────
async function loadProducts() {
  try {
    const res  = await fetch(`${API}?action=get_products`);
    const data = await res.json();
    allProducts = (data.products || []).map(p => ({
      ...p,
      sizes:   tryParse(p.sizes,   []),
      colors:  tryParse(p.colors,  []),
      designs: tryParse(p.designs, []),
    }));
  } catch (e) {
    allProducts = getDemoProducts();
  }
  renderProducts('');
}

function tryParse(val, fallback) {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val || '[]'); } catch { return fallback; }
}

function renderProducts(themeFilter = '') {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  let list = themeFilter ? allProducts.filter(p => p.theme_slug === themeFilter) : [...allProducts];
  const sort = document.getElementById('sortSelect')?.value;
  if (sort) list = sortList(list, sort);
  const countEl = document.getElementById('productCount');
  if (countEl) countEl.textContent = `${list.length} item${list.length !== 1 ? 's' : ''}`;
  if (!list.length) { grid.innerHTML = `<div class="no-results"><span>🎭</span><p>No costumes found.</p></div>`; return; }
  grid.innerHTML = list.map(p => buildProductCard(p)).join('');
}

function buildProductCard(p) {
  const oos    = p.stock === 0;
  const low    = p.stock > 0 && p.stock <= 5;
  const stars  = starsHtml(p.avg_rating || 0);
  const imgSrc = resolveImage(p);
  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'pc-img-placeholder\\'><span>🎭</span><p>Image coming soon</p></div>'">`
    : `<div class="pc-img-placeholder"><span>🎭</span><p>Image coming soon</p></div>`;
  const badge = oos
    ? `<span class="pc-badge out">Out of Stock</span>`
    : low ? `<span class="pc-badge low">Only ${p.stock} left!</span>`
          : `<span class="pc-badge">${p.theme_name || ''}</span>`;
  const inWish = wishlist.includes(p.id);
  const cartBtnLabel = oos ? 'Sold Out' : (currentUser ? '+ Add' : '🔑 Login');
  return `
  <div class="product-card" onclick="openProduct(${p.id})">
    <div class="pc-img">
      ${imgHtml}${badge}
      <button class="pc-fav" onclick="event.stopPropagation(); toggleWish(${p.id}, this)" title="Wishlist">
        ${inWish ? '❤️' : '🤍'}
      </button>
    </div>
    <div class="pc-info">
      <div class="pc-theme">${p.theme_name || ''}</div>
      <div class="pc-name">${esc(p.name)}</div>
      <div class="pc-desc">${esc(p.description || '')}</div>
      <div class="pc-rating">
        <span class="pc-stars">${stars}</span>
        <span class="pc-rcount">(${p.rating_count || 0})</span>
      </div>
      <div class="pc-footer">
        <div>
          <div class="pc-price">₱${fmtNum(p.price)}</div>
          <div class="pc-stock ${oos ? 'out' : low ? 'low' : ''}">
            ${oos ? 'Out of Stock' : `${p.stock} in stock`}
          </div>
        </div>
        <button class="btn-add-cart" onclick="event.stopPropagation(); quickCart(${p.id})" ${oos ? 'disabled' : ''}>
          🛒 ${cartBtnLabel}
        </button>
      </div>
    </div>
  </div>`;
}

function sortProducts(v) {
  const slug = document.querySelector('.fchip.active')?.dataset?.theme || '';
  renderProducts(slug);
}
function sortList(list, sort) {
  switch (sort) {
    case 'price_asc':  return [...list].sort((a,b) => a.price - b.price);
    case 'price_desc': return [...list].sort((a,b) => b.price - a.price);
    case 'name':       return [...list].sort((a,b) => a.name.localeCompare(b.name));
    case 'rating':     return [...list].sort((a,b) => (b.avg_rating||0) - (a.avg_rating||0));
    default: return list;
  }
}

// ── WISHLIST ─────────────────────────────────────
function toggleWish(id, btn) {
  const idx = wishlist.indexOf(id);
  if (idx > -1) { wishlist.splice(idx,1); btn.textContent='🤍'; toast('Removed from wishlist'); }
  else { wishlist.push(id); btn.textContent='❤️'; toast('Added to wishlist ❤️','success'); }
  localStorage.setItem('shopcotto_wish', JSON.stringify(wishlist));
}

// ── PRODUCT DETAIL ────────────────────────────────
async function openProduct(id) {
  const detail = document.getElementById('productDetail');
  if (detail) detail.innerHTML = `<div class="pd-loading"><div class="dots-loader"><span></span><span></span><span></span></div></div>`;
  openModal('productModal');
  detailQty = 1;
  let p = null;
  try {
    const res  = await fetch(`${API}?action=get_product&id=${id}`);
    const data = await res.json();
    if (data.success) p = { ...data.product, sizes: tryParse(data.product.sizes,[]), colors: tryParse(data.product.colors,[]), designs: tryParse(data.product.designs,[]) };
  } catch (e) {}
  if (!p) p = allProducts.find(x => x.id == id);
  if (!p) { closeModal('productModal'); toast('Product not found','error'); return; }
  selProduct = p;
  renderProductDetail(p);
}

function renderProductDetail(p) {
  const detail = document.getElementById('productDetail');
  if (!detail) return;
  const oos     = p.stock === 0;
  const reviews = p.ratings || [];
  const imgSrc  = resolveImage(p);
  const stockHtml = oos
    ? `<span class="pd-stock out">❌ Out of Stock</span>`
    : p.stock <= 5 ? `<span class="pd-stock low">⚠️ Only ${p.stock} left!</span>`
                   : `<span class="pd-stock ok">✅ ${p.stock} in stock</span>`;
  const imgHtml = imgSrc
    ? `<img src="${imgSrc}" alt="${esc(p.name)}" onerror="this.parentElement.innerHTML='<div class=\\'pd-img-placeholder\\'><span>🎭</span></div>'">`
    : `<div class="pd-img-placeholder"><span>🎭</span><p>Image coming soon</p></div>`;
  const chipsHtml = (arr, id) => arr.map(v =>
    `<button class="opt-chip" onclick="selChip(this,'${id}')">${esc(v)}</button>`
  ).join('');
  const revHtml = reviews.length
    ? reviews.map(r => `
      <div class="review-item">
        <div class="review-hd">
          <span class="review-stars">${starsHtml(r.rating)}</span>
          <span class="review-name">${esc(r.full_name || 'Customer')}</span>
        </div>
        <p class="review-text">${esc(r.review || '')}</p>
      </div>`).join('')
    : `<p style="color:rgba(250,244,230,0.35);font-size:14px">No reviews yet — be the first!</p>`;

  const cartBtnHtml = oos
    ? `<button class="btn-pd-cart" disabled>❌ Out of Stock</button>`
    : currentUser
      ? `<button class="btn-pd-cart" onclick="addFromDetail(${p.id})">🛒 Add to Cart</button>`
      : `<button class="btn-pd-cart" onclick="closeModal('productModal'); openModal('loginRequiredModal')">🔑 Login to Add to Cart</button>`;

  detail.innerHTML = `
    <div class="pd-img-side">${imgHtml}</div>
    <div class="pd-info">
      <div class="pd-theme">${esc(p.theme_name || '')}</div>
      <div class="pd-name">${esc(p.name)}</div>
      <div class="pd-rating">
        <span class="pc-stars">${starsHtml(p.avg_rating || 0)}</span>
        <span class="pc-rcount">(${reviews.length} reviews)</span>
      </div>
      <div class="pd-price">₱${fmtNum(p.price)}</div>
      ${stockHtml}
      <p class="pd-desc">${esc(p.description || '')}</p>
      <div class="pd-opts">
        ${p.sizes.length   ? `<label>Size</label><div class="chips-row" id="sz-chips">${chipsHtml(p.sizes,'size')}</div>` : ''}
        ${p.colors.length  ? `<label>Color</label><div class="chips-row" id="cl-chips">${chipsHtml(p.colors,'color')}</div>` : ''}
        ${p.designs.length ? `<label>Design</label><div class="chips-row" id="ds-chips">${chipsHtml(p.designs,'design')}</div>` : ''}
      </div>
      <div class="qty-row">
        <label>Qty</label>
        <button class="qty-btn" onclick="chgQty(-1)">−</button>
        <span class="qty-num" id="detailQtyNum">1</span>
        <button class="qty-btn" onclick="chgQty(1)">+</button>
      </div>
      ${cartBtnHtml}
      <div class="pd-reviews">
        <h4>Customer Reviews</h4>
        ${revHtml}
      </div>
    </div>`;
}

function selChip(el, type) {
  const parent = el.closest('.chips-row');
  parent?.querySelectorAll('.opt-chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}
function chgQty(d) {
  detailQty = Math.max(1, detailQty + d);
  const el = document.getElementById('detailQtyNum');
  if (el) el.textContent = detailQty;
}

function addFromDetail(id) {
  if (!requireLogin()) return;
  const p = selProduct;
  if (!p) return;
  const size   = document.querySelector('#sz-chips .sel')?.textContent || '';
  const color  = document.querySelector('#cl-chips .sel')?.textContent || '';
  const design = document.querySelector('#ds-chips .sel')?.textContent || '';
  if (p.sizes.length   && !size)   { toast('Please select a size','error');   return; }
  if (p.colors.length  && !color)  { toast('Please select a color','error');  return; }
  if (p.designs.length && !design) { toast('Please select a design','error'); return; }
  addToCart({
    product_id: p.id, product_name: p.name,
    price: parseFloat(p.price), size, color, design,
    quantity: detailQty, image_url: resolveImage(p),
  });
  detailQty = 1;
  closeModal('productModal');
}

function quickCart(id) {
  if (!requireLogin()) return;
  const p = allProducts.find(x => x.id == id);
  if (!p) return;
  if (p.sizes?.length > 0) { openProduct(id); return; }
  addToCart({
    product_id: p.id, product_name: p.name,
    price: parseFloat(p.price), size: '', color: '', design: '',
    quantity: 1, image_url: resolveImage(p),
  });
}

// ── CART ─────────────────────────────────────────
function addToCart(item) {
  const exist = cart.find(c =>
    c.product_id === item.product_id && c.size === item.size &&
    c.color === item.color && c.design === item.design
  );
  if (exist) exist.quantity += item.quantity;
  else cart.push(item);
  saveCart(); updateCartBadge();
  toast(`🛒 ${item.product_name} added to cart!`, 'success');
}
function saveCart() { localStorage.setItem('shopcotto_cart', JSON.stringify(cart)); }
function updateCartBadge() {
  const total = cart.reduce((s,i) => s + i.quantity, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = total;
}

function openCart() {
  if (!requireLogin()) return;
  renderCart(); openModal('cartModal');
}

function renderCart() {
  const body = document.getElementById('cartItems');
  const foot = document.getElementById('cartFooter');
  if (!body || !foot) return;
  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty"><span>🛒</span><p>Your cart is empty</p><small>Browse our costumes above!</small></div>`;
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div class="ci-img">
        ${item.image_url ? `<img src="${item.image_url}" alt="${esc(item.product_name)}" onerror="this.parentElement.innerHTML='🎭'">` : '🎭'}
      </div>
      <div class="ci-info">
        <div class="ci-name">${esc(item.product_name)}</div>
        <div class="ci-meta">
          ${[item.size?`Size: ${item.size}`:'', item.color?`Color: ${item.color}`:'', item.design?`Design: ${item.design}`:'', `Qty: ${item.quantity}`].filter(Boolean).join(' · ')}
        </div>
        <div class="ci-price">₱${fmtNum(item.price * item.quantity)}</div>
      </div>
      <button class="ci-rm" onclick="removeFromCart(${i})" title="Remove">✕</button>
    </div>`).join('');
  const total = cart.reduce((s,i) => s + i.price * i.quantity, 0);
  foot.innerHTML = `
    <div class="cart-total-row">
      <span style="font-weight:600">Total</span>
      <strong>₱${fmtNum(total)}</strong>
    </div>
    <button class="btn-proceed" onclick="proceedToOrder()">📋 Proceed to Order</button>`;
}

function removeFromCart(idx) {
  cart.splice(idx, 1); saveCart(); updateCartBadge(); renderCart();
  toast('Item removed from cart');
}

// ════════════════════════════════════════════════
//  ★ ORDER — Multi-item with Add More feature
// ════════════════════════════════════════════════

function proceedToOrder() {
  if (!requireLogin()) return;
  if (!cart.length) { toast('Cart is empty','error'); return; }

  // Initialize orderItems from cart
  orderItems = cart.map(c => ({
    product_id:   c.product_id,
    product_name: c.product_name,
    price:        c.price,
    size:         c.size,
    color:        c.color,
    design:       c.design,
    quantity:     c.quantity,
    image_url:    c.image_url,
  }));

  renderOrderForm();
  closeModal('cartModal');
  openModal('orderModal');
}

function renderOrderForm() {
  renderOrderItemsList();
  renderOrderTotal();
  const nameField = document.getElementById('of_name');
  if (nameField && currentUser?.name) nameField.value = currentUser.name;
}

function renderOrderItemsList() {
  const box = document.getElementById('orderSummaryBox');
  if (!box) return;

  const total = orderItems.reduce((s,i) => s + i.price * i.quantity, 0);

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(250,244,230,0.45);">Order Items</span>
      <button onclick="openAddMoreModal()" style="
        padding:5px 14px;border-radius:100px;font-size:11px;font-weight:700;
        background:rgba(201,146,42,0.15);border:1px solid rgba(201,146,42,0.4);
        color:#E5B04A;cursor:pointer;transition:all 0.2s;font-family:inherit;
      " onmouseover="this.style.background='rgba(201,146,42,0.25)'" onmouseout="this.style.background='rgba(201,146,42,0.15)'">
        ＋ Add More Items
      </button>
    </div>
    <div id="orderItemRows">
      ${orderItems.map((item,i) => `
        <div class="order-sum-row" style="align-items:center;padding:6px 0;border-bottom:1px solid rgba(201,146,42,0.08);">
          <div style="flex:1">
            <span style="font-weight:600;color:rgba(250,244,230,0.85);font-size:13px;">${esc(item.product_name)}</span>
            <span style="color:rgba(250,244,230,0.40);font-size:11px;margin-left:6px;">
              ${[item.size?item.size:'',item.color?item.color:''].filter(Boolean).join(' · ')}
            </span>
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
              <button onclick="changeOrderItemQty(${i},-1)" style="width:22px;height:22px;border-radius:50%;border:1px solid rgba(201,146,42,0.3);background:transparent;color:#E5B04A;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;">−</button>
              <span style="font-size:13px;color:rgba(250,244,230,0.80);min-width:16px;text-align:center;">${item.quantity}</span>
              <button onclick="changeOrderItemQty(${i},1)" style="width:22px;height:22px;border-radius:50%;border:1px solid rgba(201,146,42,0.3);background:transparent;color:#E5B04A;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;">+</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:#E5B04A;">₱${fmtNum(item.price * item.quantity)}</span>
            <button onclick="removeOrderItem(${i})" style="background:none;border:none;color:rgba(250,244,230,0.30);font-size:16px;cursor:pointer;line-height:1;padding:2px 4px;" title="Remove">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="order-sum-row order-sum-total" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(201,146,42,0.20);">
      <span>Total</span>
      <span>₱${fmtNum(total)}</span>
    </div>`;
}

function renderOrderTotal() {
  const total = orderItems.reduce((s,i) => s + i.price * i.quantity, 0);
  const el = document.getElementById('orderTotalDisplay');
  if (el) el.textContent = `₱${fmtNum(total)}`;
}

function changeOrderItemQty(idx, delta) {
  orderItems[idx].quantity = Math.max(1, orderItems[idx].quantity + delta);
  renderOrderItemsList();
  renderOrderTotal();
}

function removeOrderItem(idx) {
  if (orderItems.length <= 1) { toast('You need at least one item in your order','error'); return; }
  orderItems.splice(idx, 1);
  renderOrderItemsList();
  renderOrderTotal();
}

// ── ADD MORE MODAL ────────────────────────────────
function openAddMoreModal() {
  const el = document.getElementById('addMoreContent');
  if (!el) return;

  const searchId = 'addMoreSearch';
  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <input type="text" id="${searchId}" placeholder="Search costumes to add..." 
        style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(201,146,42,0.25);background:#141E15;color:rgba(250,244,230,0.90);font-size:14px;outline:none;font-family:inherit;"
        oninput="filterAddMore(this.value)">
    </div>
    <div id="addMoreList" style="max-height:340px;overflow-y:auto;display:grid;gap:8px;">
      ${buildAddMoreList(allProducts)}
    </div>`;

  openModal('addMoreModal');
}

function buildAddMoreList(products) {
  return products.map(p => {
    const imgSrc = resolveImage(p);
    return `
    <div class="add-more-item" onclick="addMoreItemToOrder(${p.id})" style="
      display:flex;align-items:center;gap:12px;padding:10px 12px;
      background:#141E15;border:1px solid rgba(201,146,42,0.12);border-radius:10px;
      cursor:pointer;transition:all 0.2s;
    " onmouseover="this.style.borderColor='rgba(201,146,42,0.40)'" onmouseout="this.style.borderColor='rgba(201,146,42,0.12)'">
      <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#0E1610;display:flex;align-items:center;justify-content:center;font-size:20px;">
        ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='🎭'">` : '🎭'}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;color:rgba(250,244,230,0.90);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.name)}</div>
        <div style="font-size:11px;color:rgba(250,244,230,0.40);">${esc(p.theme_name||'')} ${p.sizes?.length ? '· Pick size' : ''}</div>
      </div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:#E5B04A;flex-shrink:0;">₱${fmtNum(p.price)}</div>
    </div>`;
  }).join('');
}

function filterAddMore(query) {
  const list = document.getElementById('addMoreList');
  if (!list) return;
  const q = query.toLowerCase();
  const filtered = q ? allProducts.filter(p =>
    p.name.toLowerCase().includes(q) || (p.theme_name||'').toLowerCase().includes(q)
  ) : allProducts;
  list.innerHTML = buildAddMoreList(filtered);
}

function addMoreItemToOrder(id) {
  const p = allProducts.find(x => x.id == id);
  if (!p) return;

  // If product has variants, show a quick picker
  if (p.sizes?.length > 0 || p.colors?.length > 0) {
    showAddMorePicker(p);
    return;
  }

  // Otherwise add directly
  const existing = orderItems.find(i => i.product_id == id && !i.size && !i.color);
  if (existing) {
    existing.quantity++;
  } else {
    orderItems.push({
      product_id: p.id, product_name: p.name,
      price: parseFloat(p.price), size: '', color: '', design: '',
      quantity: 1, image_url: resolveImage(p),
    });
  }
  closeModal('addMoreModal');
  renderOrderItemsList();
  renderOrderTotal();
  toast(`✅ ${p.name} added to order!`, 'success');
}

function showAddMorePicker(p) {
  const el = document.getElementById('addMoreContent');
  if (!el) return;
  const chipsHtml = (arr, type) => arr.map(v =>
    `<button class="opt-chip" onclick="selChipAdd(this,'${type}')">${esc(v)}</button>`
  ).join('');

  el.innerHTML = `
    <button onclick="openAddMoreModal()" style="background:none;border:none;color:#E5B04A;cursor:pointer;font-size:13px;margin-bottom:14px;font-family:inherit;">
      ← Back to list
    </button>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <div style="width:56px;height:56px;border-radius:10px;overflow:hidden;background:#141E15;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">
        ${resolveImage(p) ? `<img src="${resolveImage(p)}" style="width:100%;height:100%;object-fit:cover">` : '🎭'}
      </div>
      <div>
        <div style="font-weight:700;color:rgba(250,244,230,0.90);">${esc(p.name)}</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:#E5B04A;">₱${fmtNum(p.price)}</div>
      </div>
    </div>
    ${p.sizes.length ? `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(250,244,230,0.45);margin-bottom:8px;">Size</p>
      <div class="chips-row" id="add-sz-chips">${chipsHtml(p.sizes,'size')}</div>` : ''}
    ${p.colors.length ? `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(250,244,230,0.45);margin-bottom:8px;">Color</p>
      <div class="chips-row" id="add-cl-chips">${chipsHtml(p.colors,'color')}</div>` : ''}
    ${p.designs.length ? `<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(250,244,230,0.45);margin-bottom:8px;">Design</p>
      <div class="chips-row" id="add-ds-chips">${chipsHtml(p.designs,'design')}</div>` : ''}
    <div style="display:flex;align-items:center;gap:12px;margin:16px 0;">
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(250,244,230,0.45);">Qty</span>
      <button onclick="chgAddQty(-1)" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(201,146,42,0.3);background:transparent;color:#E5B04A;font-size:18px;cursor:pointer;font-family:inherit;">−</button>
      <span id="addPickerQty" style="font-size:18px;font-weight:700;color:rgba(250,244,230,0.90);min-width:24px;text-align:center;">1</span>
      <button onclick="chgAddQty(1)" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(201,146,42,0.3);background:transparent;color:#E5B04A;font-size:18px;cursor:pointer;font-family:inherit;">+</button>
    </div>
    <button onclick="confirmAddMore(${p.id})" style="
      width:100%;padding:13px;border-radius:12px;
      background:linear-gradient(135deg,#1E5C2A,#C9922A);
      color:white;font-size:15px;font-weight:700;border:none;cursor:pointer;font-family:inherit;
    ">✅ Add to Order</button>`;

  window._addPickerQty = 1;
}

function selChipAdd(el, type) {
  const parent = el.closest('.chips-row');
  parent?.querySelectorAll('.opt-chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}
function chgAddQty(d) {
  window._addPickerQty = Math.max(1, (window._addPickerQty || 1) + d);
  const el = document.getElementById('addPickerQty');
  if (el) el.textContent = window._addPickerQty;
}

function confirmAddMore(id) {
  const p = allProducts.find(x => x.id == id);
  if (!p) return;
  const size   = document.querySelector('#add-sz-chips .sel')?.textContent || '';
  const color  = document.querySelector('#add-cl-chips .sel')?.textContent || '';
  const design = document.querySelector('#add-ds-chips .sel')?.textContent || '';
  if (p.sizes.length   && !size)   { toast('Please select a size','error');   return; }
  if (p.colors.length  && !color)  { toast('Please select a color','error');  return; }
  if (p.designs.length && !design) { toast('Please select a design','error'); return; }

  const qty = window._addPickerQty || 1;
  const existing = orderItems.find(i =>
    i.product_id == id && i.size === size && i.color === color && i.design === design
  );
  if (existing) existing.quantity += qty;
  else orderItems.push({
    product_id: p.id, product_name: p.name,
    price: parseFloat(p.price), size, color, design,
    quantity: qty, image_url: resolveImage(p),
  });

  closeModal('addMoreModal');
  renderOrderItemsList();
  renderOrderTotal();
  toast(`✅ ${p.name} added to order!`, 'success');
}

// ── PAYMENT SELECTION ─────────────────────────────
function selectPayment(method) {
  document.getElementById('gcashQR')?.classList.toggle('active', method === 'gcash');
}

// ── SUBMIT ORDER ──────────────────────────────────
async function submitOrder(e) {
  e.preventDefault();
  if (!requireLogin()) return;
  if (!orderItems.length) { toast('No items in order','error'); return; }

  const btn = document.getElementById('placeOrderBtn');
  if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'Placing order…'; }

  const payment = document.querySelector('input[name="payment"]:checked')?.value;
  if (!payment) { toast('Please select a payment method','error'); resetOrderBtn(); return; }

  const gcashRef   = document.getElementById('of_gcash_ref')?.value?.trim() || '';
  const gcashProof = document.getElementById('of_gcash_proof')?.value?.trim() || '';

  const payload = {
    customer_name:  document.getElementById('of_name').value.trim(),
    contact_number: document.getElementById('of_contact').value.trim(),
    fb_name:        document.getElementById('of_fb').value.trim(),
    date_needed:    document.getElementById('of_date').value,
    payment_method: payment,
    gcash_ref:      gcashRef,
    gcash_proof:    gcashProof,
    total_amount:   orderItems.reduce((s,i) => s + i.price * i.quantity, 0),
    items: orderItems.map(i => ({
      product_id:   i.product_id,
      product_name: i.product_name,
      size:         i.size,
      color:        i.color,
      design:       i.design,
      quantity:     i.quantity,
      price:        i.price,
    }))
  };

  try {
    const res  = await fetch(`${API}?action=place_order`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) onOrderSuccess(data.order_id, payment, payload);
    else { toast(data.message || 'Order failed. Try again.','error'); resetOrderBtn(); }
  } catch (err) {
    onOrderSuccess(Math.floor(Math.random() * 90000 + 10000), payment, payload);
  }
}

function onOrderSuccess(orderId, payment, payload) {
  // Clear cart
  cart = []; orderItems = [];
  saveCart(); updateCartBadge();

  const orderRef = `#SC${String(orderId).padStart(5,'0')}`;
  closeModal('orderModal');

  document.getElementById('successOrderId').textContent = orderRef;
  document.getElementById('successMessage').textContent = payment === 'gcash'
    ? 'Order received! Please send your GCash payment screenshot to our Facebook page.'
    : 'Order received! Our team will contact you via Facebook soon. 🎉';

  // Store receipt data for printing
  window._lastReceipt = { orderId, orderRef, payment, payload };

  openModal('successModal');
}

function resetOrderBtn() {
  const btn = document.getElementById('placeOrderBtn');
  if (btn) { btn.disabled = false; btn.querySelector('span').textContent = '🎭 Place Order'; }
}

// ── PRINT RECEIPT ─────────────────────────────────
function printReceipt(orderId) {
  // Try to get stored receipt or build from scratch
  const r = window._lastReceipt || {};
  const payload = r.payload || {};
  const items   = payload.items || [];
  const total   = payload.total_amount || 0;
  const orderRef = r.orderRef || `#SC${String(orderId).padStart(5,'0')}`;
  const now = new Date().toLocaleString('en-PH', {
    year:'numeric', month:'long', day:'numeric',
    hour:'2-digit', minute:'2-digit'
  });

  const receiptWindow = window.open('', '_blank', 'width=420,height=700,scrollbars=yes');
  receiptWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Shopcotto Receipt ${orderRef}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', monospace;
      background: #fff;
      color: #111;
      padding: 24px;
      max-width: 380px;
      margin: 0 auto;
    }
    .receipt-header { text-align: center; margin-bottom: 20px; }
    .shop-name { font-size: 28px; font-family: Georgia, serif; font-weight: 700; letter-spacing: 2px; margin-bottom: 4px; }
    .shop-sub  { font-size: 11px; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
    .divider   { border: none; border-top: 1px dashed #aaa; margin: 12px 0; }
    .ref-box   { text-align: center; margin: 10px 0; }
    .order-ref { font-size: 22px; font-weight: 700; letter-spacing: 2px; }
    .date      { font-size: 11px; color: #666; margin-top: 2px; }
    .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin: 12px 0 6px; }
    .info-row  { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
    .info-label{ color: #555; }
    .info-val  { font-weight: 600; text-align: right; max-width: 60%; }
    .item-row  { padding: 7px 0; border-bottom: 1px dotted #ddd; }
    .item-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .item-meta { font-size: 11px; color: #666; margin-bottom: 3px; }
    .item-price{ display: flex; justify-content: space-between; font-size: 12px; }
    .total-box { background: #111; color: #fff; padding: 12px 16px; margin: 14px 0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
    .total-label{ font-size: 13px; letter-spacing: 1px; }
    .total-val  { font-size: 22px; font-weight: 700; font-family: Georgia, serif; }
    .pay-badge  { text-align: center; padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; display: inline-block; margin-bottom: 12px; }
    .pay-cod    { background: #FFF3E0; color: #E65100; border: 1px solid #FFCC80; }
    .pay-gcash  { background: #E3F2FD; color: #1565C0; border: 1px solid #90CAF9; }
    .footer     { text-align: center; margin-top: 20px; font-size: 10px; color: #999; line-height: 1.8; }
    .footer strong { color: #555; }
    .print-btn  { width: 100%; padding: 12px; background: #111; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 16px; font-family: inherit; }
    .print-btn:hover { background: #333; }
    @media print {
      .print-btn { display: none; }
      body { padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="receipt-header">
    <div class="shop-name">🎭 Shopcotto</div>
    <div class="shop-sub">Premium Theme Costume Shop</div>
    <div class="shop-sub">Philippines · FB: Shopcotto Official</div>
  </div>
  <hr class="divider">
  <div class="ref-box">
    <div class="order-ref">${orderRef}</div>
    <div class="date">${now}</div>
  </div>
  <hr class="divider">

  <div class="section-label">Customer Details</div>
  <div class="info-row"><span class="info-label">Name</span><span class="info-val">${esc(payload.customer_name||'—')}</span></div>
  <div class="info-row"><span class="info-label">Contact</span><span class="info-val">${esc(payload.contact_number||'—')}</span></div>
  <div class="info-row"><span class="info-label">Facebook</span><span class="info-val">${esc(payload.fb_name||'—')}</span></div>
  <div class="info-row"><span class="info-label">Date Needed</span><span class="info-val">${esc(payload.date_needed||'—')}</span></div>

  <hr class="divider">
  <div class="section-label">Items Ordered</div>
  ${items.map(item => `
    <div class="item-row">
      <div class="item-name">${esc(item.product_name)}</div>
      <div class="item-meta">${[item.size?`Size: ${item.size}`:'',item.color?`Color: ${item.color}`:'',item.design?`Design: ${item.design}`:''].filter(Boolean).join(' · ')||'Standard'}</div>
      <div class="item-price">
        <span>₱${fmtNum(item.price)} × ${item.quantity}</span>
        <span><strong>₱${fmtNum(item.price * item.quantity)}</strong></span>
      </div>
    </div>`).join('')}

  <hr class="divider">
  <div class="total-box">
    <span class="total-label">TOTAL</span>
    <span class="total-val">₱${fmtNum(total)}</span>
  </div>

  <div style="text-align:center;">
    <span class="pay-badge ${payload.payment_method==='gcash'?'pay-gcash':'pay-cod'}">
      ${payload.payment_method==='gcash'?'📱 GCash Payment':'🚚 Cash on Delivery'}
    </span>
    ${payload.gcash_ref ? `<div style="font-size:12px;color:#555;margin-top:4px;">GCash Ref: <strong>${esc(payload.gcash_ref)}</strong></div>` : ''}
  </div>

  <hr class="divider">
  <div class="footer">
    <strong>Thank you for shopping at Shopcotto! 🎭</strong><br>
    We will contact you via Facebook Messenger soon.<br>
    For inquiries: FB Page — <strong>Shopcotto Official</strong><br>
    GCash: <strong>09182335018</strong>
  </div>

  <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
</body>
</html>`);
  receiptWindow.document.close();
}

// ── MY ORDERS ─────────────────────────────────────
async function loadMyOrders() {
  openModal('myOrdersModal');
  const list = document.getElementById('myOrdersList');
  if (list) list.innerHTML = `<div class="grid-loader"><div class="dots-loader"><span></span><span></span><span></span></div></div>`;
  try {
    const res  = await fetch(`${API}?action=get_my_orders`);
    const data = await res.json();
    renderMyOrders(data.orders || []);
  } catch (e) {
    if (list) list.innerHTML = `<p style="text-align:center;padding:40px;color:rgba(250,244,230,0.35)">Could not load orders. Please check your connection.</p>`;
  }
}

function renderMyOrders(orders) {
  const list = document.getElementById('myOrdersList');
  if (!list) return;
  if (!orders.length) {
    list.innerHTML = `<div style="text-align:center;padding:60px;color:rgba(250,244,230,0.35)"><span style="font-size:52px;display:block;margin-bottom:14px">📦</span><p>No orders yet — start shopping!</p></div>`;
    return;
  }
  const statusMap = {
    pending:    { cls:'st-pending',    lbl:'⏳ Pending' },
    processing: { cls:'st-processing', lbl:'🔄 Processing' },
    completed:  { cls:'st-completed',  lbl:'✅ Completed' },
    cancelled:  { cls:'st-cancelled',  lbl:'❌ Cancelled' },
  };
  list.innerHTML = orders.map(o => {
    const sm = statusMap[o.status] || { cls:'', lbl:o.status };
    const isCompleted = o.status === 'completed';
    const doneHtml = isCompleted ? `
      <button class="btn-sm-act green" onclick="openRateModal(${o.id})">⭐ Rate</button>
      <button class="btn-sm-act" onclick="buyAgain(${o.id})">🔄 Buy Again</button>` : '';
    // Receipt button always visible for placed orders
    const receiptBtn = (o.status === 'completed' || o.status === 'processing' || o.status === 'pending')
      ? `<button class="btn-sm-act" onclick="printReceiptFromOrder(${o.id})" title="Print Receipt">🧾 Receipt</button>` : '';
    return `
    <div class="order-card">
      <div class="oc-head">
        <span class="oc-id">#SC${String(o.id).padStart(5,'0')}</span>
        <span class="oc-status ${sm.cls}">${sm.lbl}</span>
      </div>
      <div class="oc-products">${esc(o.products || 'Items')}</div>
      <div class="oc-foot">
        <span class="oc-amount">₱${fmtNum(o.total_amount)}</span>
        <span class="oc-date">${fmtDate(o.created_at)}</span>
        <div class="oc-actions">${doneHtml}${receiptBtn}</div>
      </div>
    </div>`;
  }).join('');
}

// Receipt from order history
async function printReceiptFromOrder(orderId) {
  try {
    const res  = await fetch(`${API}?action=get_order_detail&id=${orderId}`);
    const data = await res.json();
    if (data.success) {
      const o = data.order;
      window._lastReceipt = {
        orderId,
        orderRef: `#SC${String(orderId).padStart(5,'0')}`,
        payment: o.payment_method,
        payload: {
          customer_name:  o.customer_name,
          contact_number: o.contact_number,
          fb_name:        o.fb_name,
          date_needed:    o.date_needed,
          payment_method: o.payment_method,
          gcash_ref:      o.gcash_ref || '',
          total_amount:   o.total_amount,
          items: o.items || [],
        }
      };
      printReceipt(orderId);
    }
  } catch (e) {
    // Demo fallback
    window._lastReceipt = window._lastReceipt || { orderId, orderRef:`#SC${String(orderId).padStart(5,'0')}`, payment:'cod', payload:{customer_name:'Customer',contact_number:'—',fb_name:'—',date_needed:'—',payment_method:'cod',gcash_ref:'',total_amount:0,items:[]} };
    printReceipt(orderId);
  }
}

async function buyAgain(orderId) {
  try {
    const res  = await fetch(`${API}?action=get_order_detail&id=${orderId}`);
    const data = await res.json();
    if (data.success) {
      (data.order.items || []).forEach(item => addToCart({
        product_id: item.product_id, product_name: item.product_name,
        price: parseFloat(item.price), size: item.size, color: item.color,
        design: item.design, quantity: item.quantity, image_url: item.image_url || '',
      }));
      closeModal('myOrdersModal'); openCart();
    }
  } catch (e) { toast('Could not load order','error'); }
}

// ── RATING ────────────────────────────────────────
async function openRateModal(orderId) {
  try {
    const res  = await fetch(`${API}?action=get_order_detail&id=${orderId}`);
    const data = await res.json();
    if (!data.success) { toast('Could not load order details','error'); return; }
    const items = data.order.items || [];
    const rc    = document.getElementById('ratingContent');
    if (!rc) return;
    rc.innerHTML = `
      <p style="color:rgba(250,244,230,0.40);margin-bottom:14px">Rate your purchase from Order #SC${String(orderId).padStart(5,'0')}</p>
      ${items.map(i => `<p style="font-weight:700;margin-bottom:10px;color:rgba(250,244,230,0.80);">${esc(i.product_name)}</p>`).join('')}
      <label class="sub-label">Your Rating</label>
      <div class="star-row" id="starRow">
        ${[1,2,3,4,5].map(n => `<button class="star-btn" data-v="${n}" onclick="pickStar(${n})">★</button>`).join('')}
      </div>
      <label class="sub-label">Your Review</label>
      <textarea class="rate-textarea" id="rateText" placeholder="Share your experience…"></textarea>
      <button class="btn-auth-submit" style="margin-top:16px" onclick="submitRating(${items[0]?.product_id},${items[0]?.id})">Submit Rating</button>`;
    selRating = 0;
    openModal('ratingModal');
  } catch (e) { toast('Could not load order details','error'); }
}

function pickStar(v) {
  selRating = v;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.toggle('lit', parseInt(b.dataset.v) <= v));
}

async function submitRating(productId, orderItemId) {
  if (!selRating) { toast('Please select a rating','error'); return; }
  const review = document.getElementById('rateText')?.value || '';
  try {
    const res  = await fetch(`${API}?action=submit_rating`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ product_id: productId, order_item_id: orderItemId, rating: selRating, review }),
    });
    const data = await res.json();
    if (data.success) { toast('⭐ Thank you for your review!','success'); closeModal('ratingModal'); }
    else toast(data.message || 'Error submitting rating','error');
  } catch (e) { toast('⭐ Rating submitted! (demo mode)','success'); closeModal('ratingModal'); }
}

// ── AUTH ──────────────────────────────────────────
function openAuth(mode) {
  const lf = document.getElementById('loginForm');
  const rf = document.getElementById('registerForm');
  if (lf) lf.style.display = mode === 'login'    ? 'block' : 'none';
  if (rf) rf.style.display = mode === 'register' ? 'block' : 'none';
  clearMsg('loginMsg'); clearMsg('registerMsg');
  openModal('authModal');
}
function clearMsg(id) { const el = document.getElementById(id); if(el){el.style.display='none';el.textContent='';} }
function setMsg(id, msg, type) { const el = document.getElementById(id); if(!el) return; el.textContent=msg; el.className=`auth-msg ${type}`; el.style.display='block'; }

async function doLogin() {
  const email = document.getElementById('li_email')?.value?.trim();
  const pass  = document.getElementById('li_password')?.value;
  if (!email || !pass) { setMsg('loginMsg','Please fill in all fields','error'); return; }
  try {
    const res  = await fetch(`${API}?action=login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, password:pass}) });
    const data = await res.json();
    if (data.success) {
      currentUser = data.customer; renderAuthArea(true); closeModal('authModal');
      toast(`Welcome back, ${currentUser.name.split(' ')[0]}! 👋`,'success');
      const slug = document.querySelector('.fchip.active')?.dataset?.theme || '';
      renderProducts(slug);
    } else setMsg('loginMsg', data.message || 'Login failed','error');
  } catch (e) {
    currentUser = { id:1, name:'Demo User', email }; renderAuthArea(true); closeModal('authModal');
    toast('Welcome! (Demo mode)','success');
    const slug = document.querySelector('.fchip.active')?.dataset?.theme || ''; renderProducts(slug);
  }
}

async function doRegister() {
  const name    = document.getElementById('reg_name')?.value?.trim();
  const email   = document.getElementById('reg_email')?.value?.trim();
  const pass    = document.getElementById('reg_pass')?.value;
  const contact = document.getElementById('reg_contact')?.value?.trim() || '';
  const fb      = document.getElementById('reg_fb')?.value?.trim()      || '';
  if (!name||!email||!pass) { setMsg('registerMsg','Please fill required fields','error'); return; }
  if (pass.length < 8)      { setMsg('registerMsg','Password must be at least 8 characters','error'); return; }
  try {
    const res  = await fetch(`${API}?action=register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({full_name:name,email,password:pass,contact_number:contact,fb_name:fb}) });
    const data = await res.json();
    if (data.success) {
      currentUser = data.customer; renderAuthArea(true); closeModal('authModal');
      toast(`Account created! Welcome, ${name.split(' ')[0]}! 🎉`,'success');
      const slug = document.querySelector('.fchip.active')?.dataset?.theme || ''; renderProducts(slug);
    } else setMsg('registerMsg', data.message || 'Registration failed','error');
  } catch (e) {
    currentUser = {id:1,name,email}; renderAuthArea(true); closeModal('authModal');
    toast('Account created! (Demo mode)','success');
    const slug = document.querySelector('.fchip.active')?.dataset?.theme || ''; renderProducts(slug);
  }
}

async function doLogout() {
  try { await fetch(`${API}?action=logout`); } catch(e) {}
  currentUser = null; cart = []; saveCart(); updateCartBadge(); renderAuthArea(false);
  const slug = document.querySelector('.fchip.active')?.dataset?.theme || ''; renderProducts(slug);
  toast('Logged out successfully');
}

function togglePw(inputId, btn) {
  const el = document.getElementById(inputId); if(!el) return;
  const show  = el.type === 'password'; el.type = show ? 'text' : 'password'; btn.textContent = show ? '🙈' : '👁';
}

// ── SEARCH ────────────────────────────────────────
function initSearchBtn() { document.getElementById('searchBtn')?.addEventListener('click', openSearch); }
function openSearch() { document.getElementById('searchOverlay')?.classList.add('active'); document.getElementById('searchInput')?.focus(); document.body.style.overflow='hidden'; }
function closeSearch() { document.getElementById('searchOverlay')?.classList.remove('active'); document.body.style.overflow=''; }
function handleSearch(q) {
  const res = document.getElementById('searchResults');
  if (!q.trim()) { if(res) res.innerHTML=''; return; }
  const query    = q.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(query) || (p.description||'').toLowerCase().includes(query) || (p.theme_name||'').toLowerCase().includes(query)
  );
  if (res) {
    res.innerHTML = filtered.slice(0,8).map(p => {
      const imgSrc = resolveImage(p);
      return `
      <div class="search-result-item" onclick="closeSearch(); openProduct(${p.id})">
        <span style="font-size:28px">${imgSrc ? `<img src="${imgSrc}" style="width:40px;height:40px;object-fit:cover;border-radius:8px" onerror="this.parentElement.innerHTML='🎭'">` : '🎭'}</span>
        <div><strong>${esc(p.name)}</strong><span>${p.theme_name||''} · ₱${fmtNum(p.price)}</span></div>
      </div>`;
    }).join('') || `<p style="color:rgba(255,255,255,0.4);padding:12px">No costumes found for "${esc(q)}"</p>`;
  }
}

// ── MODAL UTILS ───────────────────────────────────
function openModal(id) { const el=document.getElementById(id); if(el){el.classList.add('active'); document.body.style.overflow='hidden';} }
function closeModal(id) { const el=document.getElementById(id); if(el) el.classList.remove('active'); if(!document.querySelector('.modal-overlay.active')) document.body.style.overflow=''; }
function openAbout() { openModal('aboutModal'); }

document.querySelectorAll('.modal-overlay').forEach(ov =>
  ov.addEventListener('click', e => { if(e.target===ov) closeModal(ov.id); })
);
document.addEventListener('keydown', e => {
  if(e.key==='Escape') { closeSearch(); document.querySelectorAll('.modal-overlay.active').forEach(m=>closeModal(m.id)); }
});

// ── TOAST ─────────────────────────────────────────
function toast(msg, type='') {
  const stack = document.getElementById('toastStack'); if(!stack) return;
  const el = document.createElement('div'); el.className=`toast-item ${type}`; el.textContent=msg; stack.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(()=>el.remove(),350); }, 3200);
}

// ── HELPERS ───────────────────────────────────────
function esc(s) { if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtNum(n) { return parseFloat(n).toLocaleString('en-PH',{minimumFractionDigits:0,maximumFractionDigits:0}); }
function fmtDate(d) { try{return new Date(d).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'});}catch{return d;} }
function starsHtml(r) { let s=''; for(let i=1;i<=5;i++) s+=i<=Math.round(r)?'★':'☆'; return s; }

// ── DEMO PRODUCTS (with real image assignments) ───
function getDemoProducts() {
  return [
    {id:1,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Vampire Count',        description:'Classic Dracula-inspired vampire costume with cape and fangs.',              price:1200,image_url:'',stock:15,sizes:['S','M','L','XL'],      colors:['Black','Dark Red'],      designs:['Classic','Gothic'],    avg_rating:4.5,rating_count:12},
    {id:2,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Witch Sorceress',      description:'Full witch costume with pointed hat, flowing robes, and broom prop.',        price:950, image_url:'images/witch.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['Black','Purple'],        designs:['Classic','Glam'],      avg_rating:4.2,rating_count:8},
    {id:3,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Grim Reaper',          description:'Hooded death costume with scythe prop and glowing eye mask.',                price:1050,image_url:'images/grimreaper.jpg',stock:14,sizes:['S','M','L','XL'],colors:['Black','Dark Grey'],     designs:['Classic','Golden'],    avg_rating:4.6,rating_count:10},
    {id:4,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Zombie Nurse',         description:'Torn zombie nurse outfit with special effects makeup guide.',                 price:850, image_url:'images/Zombienurse.jpg',stock:18,sizes:['XS','S','M','L','XL'],colors:['Torn White','Bloody'],  designs:['Classic','Gore'],      avg_rating:4.3,rating_count:9},
    {id:5,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Ghost Phantom',        description:'Flowing white ghost costume with eerie luminescent fabric.',                   price:780, image_url:'images/ghost.jpg',stock:25,sizes:['XS','S','M','L','XL'],colors:['White','Pale Blue'],     designs:['Classic','Wailing'],   avg_rating:4.1,rating_count:6},
    {id:6,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Devil Temptress',      description:'Red devil costume with horns, trident prop, and tail accessory.',            price:1100,image_url:'images/demon.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['Red','Black/Red'],       designs:['Classic','Elegant'],   avg_rating:4.5,rating_count:14},
    {id:7,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Frankenstein Monster', description:'Classic Frankenstein costume with neck bolts, stitched coat, green makeup.',  price:1150,image_url:'images/frank.jpg',stock:10,sizes:['M','L','XL','XXL'],  colors:['Green/Black','Faded'],  designs:['Classic'],             avg_rating:4.3,rating_count:5},
    {id:8,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Vampire Bat',          description:'Winged vampire costume with bat wings and fangs.',                           price:1000,image_url:'',stock:16,sizes:['S','M','L','XL'],      colors:['Black'],                 designs:['Classic'],             avg_rating:4.2,rating_count:7},
    {id:9,  theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Scooby Doo',           description:'Fun Scooby-Doo full costume with head mask and paws.',                      price:950, image_url:'images/scooby.jpg',stock:15,sizes:['XS','S','M','L','XL'],colors:['Brown/Blue'],            designs:['Classic'],             avg_rating:4.3,rating_count:11},
    {id:10, theme_id:1,theme_name:'Halloween', theme_slug:'halloween', name:'Shrek Ogre',           description:'Green ogre Shrek full-body costume with ears headband.',                     price:900, image_url:'images/shrek.jpg',stock:12,sizes:['S','M','L','XL','XXL'],colors:['Swamp Green'],          designs:['Classic'],             avg_rating:4.0,rating_count:8},
    {id:11, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Naruto Uzumaki',       description:'Iconic orange and blue jumpsuit from Naruto series with headband.',          price:1400,image_url:'images/naruto.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['Orange/Blue','Sage Mode'],designs:['Genin','Shippuden'],  avg_rating:4.8,rating_count:25},
    {id:12, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Attack on Titan Mikasa',description:'Survey Corps uniform with ODM gear harness and red scarf.',               price:1600,image_url:'images/attack.jpg',stock:15,sizes:['XS','S','M','L','XL'],colors:['Corps Green'],          designs:['Standard'],            avg_rating:4.9,rating_count:35},
    {id:13, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Bleach Ichigo',        description:'Shinigami death god costume with black robes and zanpakuto prop.',           price:1500,image_url:'images/bleach.jpg',stock:18,sizes:['XS','S','M','L','XL'],colors:['Black/White'],           designs:['Standard','Bankai'],   avg_rating:4.7,rating_count:20},
    {id:14, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Monkey D. Luffy',      description:'Straw hat pirate costume with red vest, blue shorts, and straw hat.',        price:1200,image_url:'images/luffy.jpg',stock:22,sizes:['XS','S','M','L','XL'],colors:['Red/Blue','Gear 4 Gold'],designs:['Classic','Gear Fourth'],avg_rating:4.6,rating_count:18},
    {id:15, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Jujutsu Kaisen Gojo',  description:'White-haired sorcerer costume with black outfit and blindfold.',              price:1550,image_url:'images/jujutsu.jpg',stock:14,sizes:['XS','S','M','L','XL'],colors:['Black/White'],          designs:['Casual','Battle'],     avg_rating:4.8,rating_count:22},
    {id:16, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Katsuki Bakugo',       description:'Explosive hero costume with grenade gauntlets and spiky blonde wig.',         price:1600,image_url:'images/heroacademia.jpg',stock:15,sizes:['XS','S','M','L','XL'],colors:['Black/Orange'],        designs:['Standard','Final'],    avg_rating:4.6,rating_count:24},
    {id:17, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Jack Frost',           description:'Winter spirit costume with frost-patterned hoodie and magical staff prop.',   price:1300,image_url:'images/jack.jpg',stock:19,sizes:['XS','S','M','L','XL'],colors:['Blue/White'],            designs:['Classic'],             avg_rating:4.5,rating_count:16},
    {id:18, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Tokyo Revengers',      description:'Toman gang uniform with bomber jacket and headband.',                         price:1450,image_url:'images/tokyo.jpg',stock:16,sizes:['XS','S','M','L','XL'],colors:['Black/Gold'],            designs:['Standard'],            avg_rating:4.7,rating_count:19},
    {id:19, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Tom & Jerry Cat',      description:'Full Tom the cat costume with tail and classic cartoon style.',                price:1000,image_url:'images/tomvat.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['Grey/Blue'],             designs:['Classic'],             avg_rating:4.2,rating_count:10},
    {id:20, theme_id:2,theme_name:'Anime',     theme_slug:'anime',     name:'Sailor Moon',          description:'Iconic sailor fuku costume with tiara, wand prop, and white gloves.',        price:1400,image_url:'images/sailor.jpg',stock:18,sizes:['XS','S','M','L','XL'],colors:['White/Blue/Red'],        designs:['Classic','Stars'],     avg_rating:4.8,rating_count:30},
    {id:21, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Black Widow',          description:'Tactical black catsuit with utility belt and wrist stinger props.',           price:1500,image_url:'images/black_widow.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['Black'],               designs:['Classic','Endgame'],   avg_rating:4.9,rating_count:40},
    {id:22, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'The Flash Speedster',  description:'Scarlet speedster costume with lightning bolt emblem and speed force glow.',  price:1450,image_url:'images/flash.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['Red','Red/Gold'],        designs:['Classic CW','New 52'], avg_rating:4.6,rating_count:25},
    {id:23, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Powerpuff Girls',      description:'Choose Blossom, Bubbles, or Buttercup costume with matching accessories.',    price:1200,image_url:'images/power puff girls.jpg',stock:25,sizes:['XS','S','M','L','XL'],colors:['Pink','Blue','Green'],  designs:['Blossom','Bubbles','Buttercup'],avg_rating:4.5,rating_count:18},
    {id:24, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Superman Man of Steel',description:'Kryptonian hero suit with iconic S shield and flowing red cape.',             price:1550,image_url:'',stock:20,sizes:['XS','S','M','L','XL'],colors:['Blue/Red'],              designs:['Classic','Man of Steel'],avg_rating:4.6,rating_count:28},
    {id:25, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Captain America',      description:'Star-spangled super soldier costume with vibranium shield prop.',              price:1650,image_url:'',stock:17,sizes:['XS','S','M','L','XL'],colors:['Blue/Red/White','Stealth'],designs:['Classic','Stealth'],   avg_rating:4.7,rating_count:30},
    {id:26, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Iron Man Armor',       description:'Futuristic powered armor suit with glowing arc reactor chest piece.',         price:2000,image_url:'',stock:10,sizes:['S','M','L','XL'],      colors:['Red/Gold'],              designs:['Mark III','Mark VII'], avg_rating:4.9,rating_count:45},
    {id:27, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Thor God of Thunder',  description:'Asgardian warrior costume with winged helmet and Mjolnir hammer prop.',       price:1750,image_url:'',stock:15,sizes:['S','M','L','XL','XXL'],colors:['Silver/Red'],            designs:['Classic','Ragnarok'],  avg_rating:4.8,rating_count:33},
    {id:28, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Batman Dark Knight',   description:'Dark Knight tactical suit with cape, cowl, and utility belt accessories.',    price:1800,image_url:'',stock:16,sizes:['S','M','L','XL'],      colors:['Black','Armored Grey'], designs:['Classic','Nolan'],     avg_rating:4.8,rating_count:35},
    {id:29, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Wonder Woman',         description:'Armored amazonian costume with tiara, lasso of truth, and gauntlets.',        price:1600,image_url:'',stock:18,sizes:['XS','S','M','L','XL'],colors:['Red/Gold/Blue'],         designs:['Classic','BvS Armor'], avg_rating:4.7,rating_count:22},
    {id:30, theme_id:3,theme_name:'Superhero', theme_slug:'superhero', name:'Spider-Man Classic',   description:'Iconic red and blue spidey suit with detailed web pattern and eye lenses.',   price:1500,image_url:'',stock:20,sizes:['XS','S','M','L','XL'],colors:['Red/Blue','Black'],      designs:['Classic','Miles'],     avg_rating:4.9,rating_count:40},
    {id:31, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Mickey Mouse',         description:'Classic Mickey Mouse costume with iconic ears, white gloves, and red shorts.', price:1000,image_url:'images/mickey.jpg',stock:22,sizes:['XS','S','M','L','XL'],colors:['Black/Red/White'],       designs:['Classic','Band Concert'],avg_rating:4.4,rating_count:18},
    {id:32, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Pikachu Electric',     description:'Adorable Pikachu onesie with lightning bolt tail and ear headband.',          price:950, image_url:'images/pikachu.jpg',stock:30,sizes:['XS','S','M','L','XL'],colors:['Classic Yellow','Detective'],designs:['Classic','Detective'], avg_rating:4.5,rating_count:20},
    {id:33, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Bugs Bunny Classic',   description:'Looney Tunes Bugs Bunny full costume with long ears and white gloves.',       price:1000,image_url:'images/bugs_bunny.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['Grey/White'],           designs:['Classic','Space Jam'], avg_rating:4.1,rating_count:10},
    {id:34, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Elsa Ice Queen',       description:'Frozen Elsa ice queen costume with glittery blue gown and cape.',              price:1300,image_url:'images/elsa.jpg',stock:18,sizes:['XS','S','M','L','XL'],colors:['Ice Blue'],              designs:['Classic','Frozen II'], avg_rating:4.7,rating_count:28},
    {id:35, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Stitch Experiment',    description:'Blue alien stitch onesie with movable ears and scrump doll accessory.',       price:1100,image_url:'',stock:20,sizes:['XS','S','M','L','XL'],colors:['Classic Blue'],          designs:['Classic','Aloha'],     avg_rating:4.7,rating_count:25},
    {id:36, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'SpongeBob',            description:'Yellow square sponge costume with square pants, tie, and spatula prop.',     price:900, image_url:'',stock:25,sizes:['XS','S','M','L','XL'],colors:['Classic Yellow'],        designs:['Classic'],             avg_rating:4.3,rating_count:15},
    {id:37, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Minion Dave',          description:'Yellow minion costume with goggle headband and blue overalls.',               price:950, image_url:'',stock:28,sizes:['XS','S','M','L','XL'],colors:['Yellow/Blue'],           designs:['Classic','Evil'],      avg_rating:4.3,rating_count:16},
    {id:38, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Winnie the Pooh',      description:'Honey-loving bear costume with red shirt and Pooh ears headband.',             price:900, image_url:'',stock:18,sizes:['XS','S','M','L','XL'],colors:['Yellow/Red'],            designs:['Classic'],             avg_rating:4.2,rating_count:12},
    {id:39, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Patrick Star',         description:'Pink starfish Patrick Star costume with green swim trunks.',                  price:850, image_url:'',stock:22,sizes:['XS','S','M','L','XL'],colors:['Pink/Green'],            designs:['Classic'],             avg_rating:4.0,rating_count:8},
    {id:40, theme_id:4,theme_name:'Cartoons',  theme_slug:'cartoons',  name:'Powerpuff Girls Set',  description:'Cute Powerpuff Girls trio costume — Blossom, Bubbles, or Buttercup dress.',  price:1100,image_url:'images/power puff girls.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['Pink','Blue','Green'],  designs:['Blossom','Bubbles','Buttercup'],avg_rating:4.6,rating_count:22},
    {id:41, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Santa Claus',          description:'Traditional Santa costume with plush coat, pants, belt, hat, and beard.',    price:1200,image_url:'images/santa.jpg',stock:20,sizes:['S','M','L','XL','XXL'],colors:['Classic Red','Velvet Red'],designs:['Traditional','Slim'],  avg_rating:4.7,rating_count:30},
    {id:42, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Mrs. Claus',           description:'Elegant Mrs. Claus costume with red dress, white fur trim, and Santa hat.',  price:1100,image_url:'images/mrsclaude.jpg',stock:18,sizes:['XS','S','M','L','XL'],colors:['Red/White'],             designs:['Traditional','Modern'],avg_rating:4.5,rating_count:16},
    {id:43, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Christmas Angel',      description:'White angel costume with halo, golden wings, and star wand accessory.',      price:1000,image_url:'images/angel.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['White/Gold'],            designs:['Classic'],             avg_rating:4.4,rating_count:13},
    {id:44, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Nutcracker Soldier',   description:'Toy soldier nutcracker costume with drum prop and tall hat.',                 price:1250,image_url:'images/nutcraker.jpg',stock:14,sizes:['S','M','L','XL'],colors:['Red/Blue/Gold'],         designs:['Classic'],             avg_rating:4.5,rating_count:11},
    {id:45, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Christmas Tree Suit',  description:'Fun Christmas tree wearable costume with ornament props and star topper hat.',price:800, image_url:'images/tree.jpg',stock:18,sizes:['XS','S','M','L','XL'],colors:['Green/Colorful'],        designs:['Classic','LED Lights'],avg_rating:4.0,rating_count:7},
    {id:46, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Christmas Elf',        description:'Cute elf costume with pointed shoes, jingling hat, and striped tights.',     price:900, image_url:'',stock:30,sizes:['XS','S','M','L','XL'],colors:['Green/Red'],             designs:['Workshop','Buddy Elf'],avg_rating:4.4,rating_count:14},
    {id:47, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Frosty the Snowman',   description:'Jolly snowman costume with black top hat, scarf, and carrot nose accessory.',price:1050,image_url:'',stock:22,sizes:['XS','S','M','L','XL'],colors:['White','Pastel Blue'],   designs:['Classic Frosty'],      avg_rating:4.3,rating_count:12},
    {id:48, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Rudolph Reindeer',     description:'Brown reindeer costume with glowing red nose prop and antler headband.',     price:950, image_url:'',stock:25,sizes:['XS','S','M','L','XL'],colors:['Brown','Brown/Red Nose'],designs:['Classic'],             avg_rating:4.2,rating_count:10},
    {id:49, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Gingerbread Person',   description:'Gingerbread cookie costume with frosting details and candy button props.',   price:850, image_url:'',stock:25,sizes:['XS','S','M','L','XL'],colors:['Gingerbread Brown'],     designs:['Classic'],             avg_rating:4.1,rating_count:8},
    {id:50, theme_id:5,theme_name:'Christmas', theme_slug:'christmas', name:'Scooby Doo Santa',     description:'Scooby-Doo holiday special costume with Santa hat and holiday collar.',       price:1000,image_url:'images/scooby.jpg',stock:15,sizes:['XS','S','M','L','XL'],colors:['Brown/Blue'],            designs:['Holiday'],             avg_rating:4.3,rating_count:9},
    {id:51, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Cupid Angel',         description:'Romantic cupid costume with wings, bow and arrow prop, and heart accessories.',price:1050,image_url:'images/angel.jpg',stock:20,sizes:['XS','S','M','L','XL'],colors:['White/Gold','Pink/Gold'],designs:['Classic','Modern'],    avg_rating:4.4,rating_count:18},
    {id:52, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Angel of Love',       description:'Dreamy white angel costume with feather wings and halo headpiece.',           price:1150,image_url:'images/angel.jpg',stock:22,sizes:['XS','S','M','L','XL'],colors:['White','Soft Pink'],     designs:['Classic','Enchanted'], avg_rating:4.5,rating_count:14},
    {id:53, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Red Rose Goddess',    description:'Flowing red rose gown with petal details and floral crown headpiece.',       price:1300,image_url:'',stock:16,sizes:['XS','S','M','L','XL'],colors:['Rose Red','Blush Pink'], designs:['Goddess','Modern'],    avg_rating:4.7,rating_count:19},
    {id:54, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Sweet Lolita Doll',   description:'Pastel lolita-style dress with heart accessories and ribbon decorations.',   price:1200,image_url:'',stock:18,sizes:['XS','S','M','L','XL'],colors:['Pastel Pink','Lavender'], designs:['Sweet','Gothic'],      avg_rating:4.6,rating_count:16},
    {id:55, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Prince Charming',     description:'Romantic royal costume with prince jacket, sash, crown, and rose prop.',    price:1350,image_url:'',stock:14,sizes:['XS','S','M','L','XL'],colors:['White/Gold','Blue/Gold'], designs:['Classic'],             avg_rating:4.5,rating_count:13},
    {id:56, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Lady in Red',         description:'Elegant red satin dress costume with gloves, pearls, and fascinator hat.',  price:1250,image_url:'',stock:20,sizes:['XS','S','M','L','XL'],colors:['Classic Red','Burgundy'], designs:['Classic','Vintage'],   avg_rating:4.4,rating_count:15},
    {id:57, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Enchanted Fairy',     description:'Magical fairy costume with iridescent wings, wand, and glitter accessories.',price:1000,image_url:'',stock:25,sizes:['XS','S','M','L','XL'],colors:['Pink','Lavender'],        designs:['Classic','Dark Fairy'],avg_rating:4.3,rating_count:12},
    {id:58, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Queen of Hearts',     description:'Alice in Wonderland Queen of Hearts royal gown with crown and card props.',   price:1400,image_url:'',stock:15,sizes:['XS','S','M','L','XL'],colors:['Red/Black'],             designs:['Classic','Dark Queen'],avg_rating:4.6,rating_count:11},
    {id:59, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Romantic Vampire',    description:'Gothic romance vampire costume with velvet cape, rose, and fangs accessories.',price:1350,image_url:'',stock:13,sizes:['XS','S','M','L','XL'],colors:['Black/Red'],            designs:['Classic','Gothic'],    avg_rating:4.5,rating_count:17},
    {id:60, theme_id:6,theme_name:"Valentine's",theme_slug:'valentines',name:'Heart Card Soldier',  description:'Playing card soldier costume with heart suit design and sword prop.',         price:1100,image_url:'',stock:17,sizes:['XS','S','M','L','XL'],colors:['Red/Black'],             designs:['Classic'],             avg_rating:4.2,rating_count:10},
  ];
}