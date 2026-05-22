// ============================================================
//  AURA COFFEE - Main App Logic
// ============================================================

const STORAGE_KEY = 'aura_coffee_menu';
const TABLES_KEY  = 'aura_coffee_tables';
const DB_VERSION  = 'v2'; // bump this to force-reset menu seed
const SESSION_KEY = 'aura_session';

// Helper to get local date string YYYY-MM-DD
function getLocalDateStr() {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
}

async function navLogout() {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
    // Write log entry before clearing session
    const sess = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (sess) {
        const logId = Date.now();
        const logRecord = {
            id: logId,
            userId: sess.id,
            userName: sess.name,
            role: sess.role,
            action: 'ĐĂNG XUẤT',
            detail: 'Đăng xuất từ trang POS lúc ' + new Date().toLocaleTimeString('vi-VN'),
            datetime: new Date().toLocaleString('vi-VN'),
            dateStr: getLocalDateStr(),
            timestamp: logId
        };
        try {
            await db.ref("logs/" + logId).set(logRecord);
        } catch(e) {
            console.error("Lỗi ghi log đăng xuất:", e);
        }
    }
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

// ---- Default menu (20 items) ----
const defaultMenuData = [
    // ☕ CÀ PHÊ (8 món)
    { id:1,  title:"Gold Leaf Latte",       category:"coffee",   prices:{S:70000, M:85000,  L:100000}, price:85000,  img:"assets/latte.png",     desc:"Sự kết hợp hoàn hảo giữa hạt Arabica thượng hạng và lớp bọt sữa mịn màng, điểm xuyết vàng lá 24k tinh xảo." },
    { id:2,  title:"Midnight Cold Brew",    category:"coffee",   prices:{S:55000, M:70000,  L:85000},  price:70000,  img:"assets/coldbrew.png",  desc:"Cà phê ủ lạnh 24 giờ, hương vị mượt mà, đậm đà với nốt hương chocolate đen và caramel muối." },
    { id:3,  title:"Classic Cappuccino",    category:"coffee",   prices:{S:50000, M:60000,  L:75000},  price:60000,  img:"assets/latte.png",     desc:"Tỷ lệ vàng giữa Espresso, sữa nóng và bọt sữa, tạo nên hương vị truyền thống khó quên." },
    { id:4,  title:"Caramel Macchiato",     category:"coffee",   prices:{S:60000, M:75000,  L:90000},  price:75000,  img:"assets/latte.png",     desc:"Lớp caramel thượng hạng chảy dọc trên bề mặt sữa tươi béo ngậy, xen lẫn với espresso đậm đà." },
    { id:5,  title:"Espresso Doppio",       category:"coffee",   prices:{S:45000, M:0,       L:0},      price:45000,  img:"assets/coldbrew.png",  desc:"Double shot espresso nguyên chất, đậm đà và mạnh mẽ - dành cho người yêu cà phê thuần túy." },
    { id:6,  title:"Signature Flat White",  category:"coffee",   prices:{S:55000, M:70000,  L:0},      price:70000,  img:"assets/latte.png",     desc:"Micro-foam sữa tươi siêu mịn hòa quyện với ristretto - phong cách úc hiện đại." },
    { id:7,  title:"Dark Mocha Royale",     category:"coffee",   prices:{S:65000, M:80000,  L:95000},  price:80000,  img:"assets/coldbrew.png",  desc:"Chocolate Belgia đen 70% cacao pha cùng espresso và sữa ngọt, phủ kem tươi đánh bông." },
    { id:8,  title:"Hazelnut Americano",    category:"coffee",   prices:{S:50000, M:60000,  L:72000},  price:60000,  img:"assets/coldbrew.png",  desc:"Americano pha loãng tinh tế, thêm siro hạt phỉ rang thơm cho vị ngọt nhẹ nhàng." },

    // 🍵 TRÀ (5 món)
    { id:9,  title:"Rose Lychee Oolong",    category:"tea",      prices:{S:55000, M:70000,  L:85000},  price:70000,  img:"assets/coldbrew.png",  desc:"Trà oolong cao cấp kết hợp hương hoa hồng dịu nhẹ và vị ngọt mọng của vải tươi." },
    { id:10, title:"Matcha Latte Uji",      category:"tea",      prices:{S:60000, M:75000,  L:90000},  price:75000,  img:"assets/latte.png",     desc:"Matcha xay thủ công từ lá trà Uji Nhật Bản, pha cùng sữa tươi béo và tạo hình latte art." },
    { id:11, title:"Taro Milk Tea",         category:"tea",      prices:{S:55000, M:65000,  L:80000},  price:65000,  img:"assets/coldbrew.png",  desc:"Trà sữa khoai môn tím thơm ngậy với hạt trân châu đen dai giòn, vị ngọt thanh tự nhiên." },
    { id:12, title:"Peach Oolong Fizz",     category:"tea",      prices:{S:60000, M:72000,  L:88000},  price:72000,  img:"assets/coldbrew.png",  desc:"Trà oolong soda lạnh với đào tươi thái lát, nước có ga sủi tăm - sảng khoái và thơm mát." },
    { id:13, title:"Lemon Ginger Honey",    category:"tea",      prices:{S:45000, M:58000,  L:70000},  price:58000,  img:"assets/latte.png",     desc:"Trà gừng tươi ấm nồng kết hợp mật ong nguyên chất và chanh tươi vắt - tốt cho sức khỏe." },

    // 🥐 BÁNH NGỌT (4 món)
    { id:14, title:"Butter Croissant",      category:"pastry",   prices:{S:0,     M:55000,  L:0},      price:55000,  img:"assets/croissant.png", desc:"Bánh sừng bò truyền thống Pháp với 73 lớp bơ Président giòn tan, thơm ngậy." },
    { id:15, title:"Dark Choco Brownie",    category:"pastry",   prices:{S:0,     M:65000,  L:0},      price:65000,  img:"assets/croissant.png", desc:"Brownie chocolate đen 72% cacao, ẩm mềm kiểu fudgy, tan ngay khi chạm môi." },
    { id:16, title:"New York Cheesecake",   category:"pastry",   prices:{S:0,     M:75000,  L:0},      price:75000,  img:"assets/croissant.png", desc:"Cheesecake New York béo mịn với đế bánh quy giòn, phủ coulis dâu tây tươi." },
    { id:17, title:"Truffle Mushroom Bun",  category:"pastry",   prices:{S:0,     M:95000,  L:0},      price:95000,  img:"assets/croissant.png", desc:"Bánh mì mềm nhân nấm truffle quý hiếm, sang trọng và độc đáo - món ăn kèm hoàn hảo." },

    // 🧃 NƯỚC ÉP & SINH TỐ (3 món)
    { id:18, title:"Mango Passion Smoothie",category:"smoothie", prices:{S:60000, M:75000,  L:90000},  price:75000,  img:"assets/coldbrew.png",  desc:"Sinh tố xoài Thái và chanh leo nhiệt đới, mát lạnh, ngọt chua hài hòa đầy vitamin." },
    { id:19, title:"Avocado Coconut Blend", category:"smoothie", prices:{S:65000, M:80000,  L:95000},  price:80000,  img:"assets/latte.png",     desc:"Bơ Đắk Lắk chín mịn xay cùng nước dừa tươi và sữa đặc - đặc sánh, bổ dưỡng." },
    { id:20, title:"Fresh OJ Sunrise",      category:"juice",    prices:{S:50000, M:62000,  L:75000},  price:62000,  img:"assets/coldbrew.png",  desc:"Cam Sunkist vắt tươi tại chỗ, không thêm đường - nguyên chất 100%, đầy vitamin C." },
];

// ============================================================
//  STATE
// ============================================================
let menuData      = [];
let cart          = [];
let tableData     = {};   // { "indoor-1": { orders:[], total, isServed, isPaid, time } }
let currentItem   = null;
let selectedSize  = 'M';
let itemQty       = 1;
let selectedOrderType   = null; // 'dine-in' | 'takeaway'
let selectedTableKey    = null; // e.g. "indoor-3"
let activeTableKey      = null; // table panel currently viewing
let selectedPaymentMethod = 'cash'; // 'cash' | 'online'
const catLabels = { coffee:'☕ Cà Phê', tea:'🍵 Trà', pastry:'🥐 Bánh Ngọt', juice:'🧃 Nước Ép', smoothie:'🥤 Sinh Tố', other:'🍽️ Khác' };
const REVENUE_KEY = 'aura_coffee_revenue';

// ============================================================
//  INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    menuData   = loadMenu();
    tableData  = loadTables();
    renderMenu(menuData);
    setupFilters();
    renderFloorMap();
    setupNavbar();
    setupProductModal();
    setupCart();
    setupCheckout();
    updateCartUI();
});

// ============================================================
//  DATA HELPERS
// ============================================================
function loadMenu() {
    if (typeof globalMenu !== 'undefined' && globalMenu && globalMenu.length > 0) {
        return globalMenu;
    }
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : defaultMenuData;
}
function loadTables() {
    if (typeof globalTables !== 'undefined' && globalTables && Object.keys(globalTables).length > 0) return globalTables;
    const s = localStorage.getItem(TABLES_KEY);
    let d = {};
    if (s) {
        d = JSON.parse(s);
    } else {
        // Initialize 20 tables
        for (let i = 1; i <= 10; i++) d[`indoor-${i}`]  = makeEmptyTable();
        for (let i = 1; i <= 10; i++) d[`outdoor-${i}`] = makeEmptyTable();
    }
    // Auto seed to Firebase if Firebase tables database is empty
    if (typeof db !== 'undefined') {
        db.ref("tables").once('value').then(snap => {
            if (!snap.exists() || Object.keys(snap.val() || {}).length === 0) {
                db.ref("tables").set(d);
            }
        }).catch(err => console.error("Lỗi đồng bộ bàn:", err));
    }
    return d;
}
function saveTables() {
    db.ref("tables").set(tableData);
}
function saveTable(key) {
    if (tableData && tableData[key]) {
        db.ref("tables/" + key).set(tableData[key]);
    }
}
function makeEmptyTable() { return { orders:[], total:0, isServed:false, isPaid:false, time:null }; }
function tableStatus(key) {
    const t = tableData[key];
    if (!t) return 'available';
    const orders = t.orders || [];
    if (orders.length === 0) return 'available';
    if (t.isPaid) return 'paid';
    return 'occupied';
}

// ============================================================
//  NAVBAR
// ============================================================
function setupNavbar() {
    window.addEventListener('scroll', () => {
        document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ============================================================
//  FLOOR MAP
// ============================================================
function renderFloorMap() {
    renderZone('indoor-tables',  'indoor',  10, '🪑');
    renderZone('outdoor-tables', 'outdoor', 10, '🌿');
    updateZoneCounts();
}
function renderZone(containerId, zone, count, icon) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const key  = `${zone}-${i}`;
        const stat = tableStatus(key);
        const btn  = document.createElement('button');
        btn.className  = `table-btn ${stat}`;
        btn.id         = `tbl-${key}`;
        btn.title      = `Bàn ${i} - ${zone === 'indoor' ? 'Trong' : 'Ngoài'} quán`;
        btn.innerHTML  = `<span class="t-icon">${icon}</span><span class="t-num">${i}</span>${stat==='occupied'?'<span class="dot-ping"></span>':''}`;
        btn.onclick    = () => openTablePanel(key, i, zone);
        el.appendChild(btn);
    }
}
function updateTableBtn(key) {
    const btn  = document.getElementById(`tbl-${key}`);
    if (!btn) return;
    const stat  = tableStatus(key);
    const zone  = key.startsWith('indoor') ? 'indoor' : 'outdoor';
    const num   = key.split('-')[1];
    const icon  = zone === 'indoor' ? '🪑' : '🌿';
    btn.className = `table-btn ${stat}`;
    btn.innerHTML = `<span class="t-icon">${icon}</span><span class="t-num">${num}</span>${stat==='occupied'?'<span class="dot-ping"></span>':''}`;
    updateZoneCounts();
}
function updateZoneCounts() {
    let inAvail = 0, outAvail = 0;
    for (let i = 1; i <= 10; i++) { if (tableStatus(`indoor-${i}`)  === 'available') inAvail++; }
    for (let i = 1; i <= 10; i++) { if (tableStatus(`outdoor-${i}`) === 'available') outAvail++; }
    document.getElementById('indoor-avail').textContent  = `${inAvail} trống`;
    document.getElementById('outdoor-avail').textContent = `${outAvail} trống`;
}

// ============================================================
//  TABLE DETAIL PANEL
// ============================================================
function isUserCheckedIn() {
    const user = JSON.parse(sessionStorage.getItem('aura_session'));
    if (!user) return false;
    if (user.role !== 'user') return true; // Admins are not restricted

    const shifts = globalShifts || [];
    const dateStr = getLocalDateStr();
    const activeShift = shifts.find(s => s.userId === user.id && s.date === dateStr && !s.out);
    return !!activeShift;
}

function openTablePanel(key, num, zone) {
    if (!isUserCheckedIn()) {
        showToast('❌ Vui lòng Check-in (Vào ca) trước khi thao tác!');
        return;
    }
    activeTableKey = key;
    const t = tableData[key];
    const stat = tableStatus(key);
    const panelEl = document.getElementById('table-detail-panel');
    const bdEl    = document.getElementById('panel-backdrop');
    const zoneName = zone === 'indoor' ? 'Trong Quán' : 'Ngoài Quán';

    document.getElementById('panel-table-name').textContent = `Bàn ${num} · ${zoneName}`;
    const badge = document.getElementById('panel-status-badge');
    badge.textContent  = stat === 'available' ? 'Trống' : stat === 'paid' ? 'Đã TT' : 'Đang dùng';
    badge.className    = `status-badge ${stat}`;

    const emptyDiv    = document.getElementById('panel-empty');
    const occupiedDiv = document.getElementById('panel-occupied');

    if (stat === 'available') {
        emptyDiv.style.display    = 'flex';
        occupiedDiv.style.display = 'none';
    } else {
        emptyDiv.style.display    = 'none';
        occupiedDiv.style.display = 'block';

        // Order list
        const orders = t.orders || [];
        document.getElementById('panel-order-list').innerHTML = orders.map(o =>
            `<div class="panel-order-row"><span>${o.title} <small style="color:var(--text-muted)">Size ${o.selectedSize||'M'} × ${o.qty}</small></span><span style="color:var(--primary)">${(o.price*o.qty).toLocaleString('vi-VN')}đ</span></div>`
        ).join('');

        document.getElementById('panel-time').textContent = t.time || '—';
        document.getElementById('panel-total').textContent = (t.total||0).toLocaleString('vi-VN') + 'đ';
        document.getElementById('panel-served-status').innerHTML = t.isServed
            ? '<span style="color:#2ecc71">✅ Đã ra món</span>'
            : '<span style="color:var(--primary)">⏳ Chưa ra món</span>';
        document.getElementById('panel-paid-status').innerHTML = t.isPaid
            ? '<span style="color:#9b59b6">✅ Đã thanh toán</span>'
            : '<span style="color:var(--danger)">❌ Chưa thanh toán</span>';

        document.getElementById('panel-serve-btn').style.display = t.isServed ? 'none' : 'flex';
        document.getElementById('panel-pay-btn').style.display   = t.isPaid   ? 'none' : 'flex';
        // Show/hide add-more button (only if not yet paid)
        const addMoreBtn = document.getElementById('panel-add-more-btn');
        if (addMoreBtn) addMoreBtn.style.display = t.isPaid ? 'none' : 'flex';
    }

    panelEl.classList.add('open');
    bdEl.classList.add('show');
    bdEl.onclick = closeTablePanel;
}
function closeTablePanel() {
    document.getElementById('table-detail-panel').classList.remove('open');
    document.getElementById('panel-backdrop').classList.remove('show');
    activeTableKey = null;
}
document.getElementById('close-table-panel').onclick = closeTablePanel;

function markServed() {
    if (!activeTableKey) return;
    if (!tableData[activeTableKey]) return;
    tableData[activeTableKey].isServed = true;
    saveTable(activeTableKey);
    openTablePanel(activeTableKey, activeTableKey.split('-')[1], activeTableKey.split('-')[0]);
    showToast('✅ Đã đánh dấu ra món!');
}
function markPaid() {
    if (!activeTableKey) return;
    if (!tableData[activeTableKey]) return;
    tableData[activeTableKey].isPaid = true;
    saveTable(activeTableKey);
    updateTableBtn(activeTableKey);
    openTablePanel(activeTableKey, activeTableKey.split('-')[1], activeTableKey.split('-')[0]);
    showToast('💜 Đã thanh toán!');
}
function clearTable() {
    if (!activeTableKey) return;
    const t = tableData[activeTableKey];
    
    // Kiểm tra an toàn xem có order hay không (phòng trường hợp Firebase trả về dạng Object thay vì Array)
    const hasOrders = t && t.orders && Object.keys(t.orders).length > 0;
    
    if (hasOrders && !t.isPaid) {
        showToast('❌ Bắt buộc phải thanh toán trước khi dọn bàn!');
        // Rung nhẹ panel để báo lỗi (thêm class error-shake nếu cần)
        return;
    }
    
    if (hasOrders && t.isPaid) {
        if (!confirm('Bàn đã thanh toán. Bạn có chắc chắn muốn dọn bàn này về trạng thái trống?')) {
            return;
        }
    }

    tableData[activeTableKey] = makeEmptyTable();
    saveTable(activeTableKey);
    updateTableBtn(activeTableKey);
    closeTablePanel();
    showToast('🧹 Đã dọn bàn thành công!');
}

// ============================================================
//  MENU
// ============================================================
function renderMenu(items) {
    const grid = document.getElementById('menu-grid');
    if (!items.length) { grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:4rem">Không có món nào.</div>'; return; }
    grid.innerHTML = items.map(item => {
        const prices = item.prices || { S:0, M:item.price||0, L:0 };
        const base   = prices.M || prices.S || prices.L || 0;
        const imgSrc = item.img || 'assets/latte.png';
        return `<div class="menu-item" onclick="openProductModal(${item.id})">
            <div class="item-img"><img src="${imgSrc}" alt="${item.title}" onerror="this.src='assets/latte.png'"></div>
            <div class="item-details">
                <span class="category">${catLabels[item.category]||item.category}</span>
                <h3>${item.title}</h3>
                <div class="item-footer">
                    <span class="price">Từ ${base.toLocaleString('vi-VN')}đ</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </div>
            </div>
        </div>`;
    }).join('');
}
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.category;
            renderMenu(cat === 'all' ? menuData : menuData.filter(i => i.category === cat));
        });
    });
}

// ============================================================
//  PRODUCT MODAL
// ============================================================
function setupProductModal() {
    document.getElementById('close-product-modal').onclick = closeProductModal;
    document.getElementById('product-modal').onclick = e => { if (e.target === document.getElementById('product-modal')) closeProductModal(); };

    // Size + sugar option buttons
    document.querySelectorAll('.opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (['S','M','L'].includes(btn.dataset.val)) {
                selectedSize = btn.dataset.val;
                updateModalPrice();
            }
        });
    });

    // Qty buttons
    document.getElementById('qty-minus').onclick = () => { if (itemQty > 1) { itemQty--; updateModalPrice(); } };
    document.getElementById('qty-plus').onclick  = () => { itemQty++; updateModalPrice(); };

    document.getElementById('add-to-cart-btn').onclick = () => {
        if (!currentItem) return;
        const prices = currentItem.prices || { S:0, M:currentItem.price||0, L:0 };
        addToCart({ ...currentItem, price: prices[selectedSize]||0, selectedSize, qty: itemQty });
        closeProductModal();
    };
}

function openProductModal(id) {
    currentItem = menuData.find(i => i.id === id);
    if (!currentItem) return;

    const prices = currentItem.prices || { S:0, M:currentItem.price||0, L:0 };
    document.getElementById('modal-img').src = currentItem.img || 'assets/latte.png';
    document.getElementById('modal-title').innerText = currentItem.title;
    document.getElementById('modal-desc').innerText  = currentItem.desc || '';

    // Reset quantity
    itemQty = 1;
    document.getElementById('qty-display').textContent = '1';

    // Setup size buttons visibility
    const sizeBtns = document.querySelectorAll('#size-options .opt-btn');
    sizeBtns.forEach(btn => {
        const sz = btn.dataset.val;
        const p  = prices[sz];
        btn.style.display = (p && p > 0) ? 'inline-block' : 'none';
        btn.classList.remove('active');
    });

    // Default selected size
    selectedSize = prices.M ? 'M' : (prices.S ? 'S' : 'L');
    const activeBtn = document.querySelector(`#size-options .opt-btn[data-val="${selectedSize}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Reset sugar
    const sugarBtns = document.querySelectorAll('.option-group:nth-child(2) .opt-btn');
    sugarBtns.forEach(b => b.classList.remove('active'));
    const s100 = document.querySelector('.opt-btn[data-val="100"]');
    if (s100) s100.classList.add('active');

    updateModalPrice();
    document.getElementById('product-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function updateModalPrice() {
    if (!currentItem) return;
    const prices  = currentItem.prices || { S:0, M:currentItem.price||0, L:0 };
    const unit    = prices[selectedSize] || 0;
    const total   = unit * itemQty;
    document.getElementById('qty-display').textContent    = itemQty;
    document.getElementById('modal-unit-price').textContent = `${unit.toLocaleString('vi-VN')}đ / ly`;
    document.getElementById('modal-price').textContent     = total.toLocaleString('vi-VN') + 'đ';
}
function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
    document.body.style.overflow = '';
    currentItem = null; itemQty = 1;
}

// ============================================================
//  CART
// ============================================================
function setupCart() {
    document.getElementById('cart-toggle').onclick = openCart;
    document.getElementById('close-cart').onclick  = closeCart;
    document.getElementById('checkout-btn').onclick = () => { if (cart.length > 0) openCheckoutModal(); };
}
function addToCart(item) {
    const key = `${item.id}-${item.selectedSize}`;
    const ex  = cart.find(i => i.cartKey === key);
    if (ex) { ex.qty += item.qty; }
    else     { cart.push({ ...item, qty: item.qty, cartKey: key }); }
    updateCartUI();
    openCart();
}
function removeFromCart(cartKey) {
    cart = cart.filter(i => i.cartKey !== cartKey);
    updateCartUI();
}
function changeCartQty(cartKey, delta) {
    const item = cart.find(i => i.cartKey === cartKey);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) removeFromCart(cartKey);
    else updateCartUI();
}
function updateCartUI() {
    const count = cart.reduce((a,c) => a + c.qty, 0);
    document.getElementById('cart-count').textContent = count;

    const container = document.getElementById('cart-items');
    if (cart.length === 0) {
        container.innerHTML = '<p class="cart-empty-msg">🛒 Giỏ hàng trống</p>';
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.img||'assets/latte.png'}" alt="${item.title}" onerror="this.src='assets/latte.png'">
                <div class="cart-item-details">
                    <h4>${item.title}</h4>
                    <p>Size ${item.selectedSize||'M'} · ${item.price.toLocaleString('vi-VN')}đ</p>
                    <div class="cart-item-qty">
                        <button class="cqty-btn" onclick="changeCartQty('${item.cartKey}',-1)">−</button>
                        <span>${item.qty}</span>
                        <button class="cqty-btn" onclick="changeCartQty('${item.cartKey}',1)">+</button>
                        <button class="cart-item-remove" onclick="removeFromCart('${item.cartKey}')">🗑 Xóa</button>
                    </div>
                </div>
            </div>`).join('');
    }
    const total = cart.reduce((a,c) => a + c.price * c.qty, 0);
    document.getElementById('cart-total').textContent = total.toLocaleString('vi-VN') + 'đ';
}
function openCart()  { document.getElementById('cart-sidebar').classList.add('active'); }
function closeCart() { document.getElementById('cart-sidebar').classList.remove('active'); }

// ============================================================
//  CHECKOUT FLOW
// ============================================================
function setupCheckout() {
    document.getElementById('close-checkout-modal').onclick = closeCheckoutModal;
    document.getElementById('checkout-modal').onclick = e => { if (e.target === document.getElementById('checkout-modal')) closeCheckoutModal(); };
    document.getElementById('confirm-order-btn').onclick = confirmOrder;
    document.getElementById('back-to-table-btn').onclick = () => {
        document.getElementById('order-summary-section').style.display = 'none';
        document.getElementById('table-selection-section').style.display = 'block';
    };
}
function openCheckoutModal() {
    if (!isUserCheckedIn()) {
        showToast('❌ Vui lòng Check-in (Vào ca) trước khi thao tác!');
        return;
    }
    // If table was pre-selected via "Gọi Bổ Sung", skip selection steps
    if (selectedOrderType === 'dine-in' && selectedTableKey) {
        const num = selectedTableKey.split('-')[1];
        const zone = selectedTableKey.split('-')[0];
        document.getElementById('order-type-section').style.display = 'none';
        document.getElementById('table-selection-section').style.display = 'none';
        showOrderSummary(selectedTableKey, num, zone);
    } else {
        resetOrderType();
    }
    document.getElementById('checkout-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    closeCart();
}
function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.remove('active');
    document.body.style.overflow = '';
    // Reset pre-selected state from addMoreToTable
    selectedOrderType = null;
    selectedTableKey = null;
}
function selectOrderType(type) {
    selectedOrderType = type;
    document.getElementById('order-type-section').style.display = 'none';

    if (type === 'takeaway') {
        showOrderSummary(null);
    } else {
        // Build table selector grids
        buildTableSelGrid('indoor-sel-grid',  'indoor',  10);
        buildTableSelGrid('outdoor-sel-grid', 'outdoor', 10);
        document.getElementById('table-selection-section').style.display = 'block';
    }
}
function resetOrderType() {
    selectedOrderType = null; selectedTableKey = null;
    selectedPaymentMethod = 'cash';
    document.getElementById('order-type-section').style.display     = 'grid';
    document.getElementById('table-selection-section').style.display = 'none';
    document.getElementById('order-summary-section').style.display   = 'none';
    document.querySelectorAll('.order-type-card').forEach(c => c.classList.remove('selected'));
    // Reset payment cards
    document.getElementById('pay-cash').classList.add('selected');
    document.getElementById('pay-online').classList.remove('selected');
}
function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    document.getElementById('pay-cash').classList.toggle('selected',   method === 'cash');
    document.getElementById('pay-online').classList.toggle('selected', method === 'online');
}
function buildTableSelGrid(containerId, zone, count) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const key  = `${zone}-${i}`;
        const stat = tableStatus(key);
        const btn  = document.createElement('button');
        btn.className   = `tsel-btn ${stat}`;
        btn.textContent = `Bàn ${i}`;
        btn.disabled    = stat === 'occupied';
        btn.onclick     = () => { selectedTableKey = key; showOrderSummary(key, i, zone); };
        el.appendChild(btn);
    }
}
function showOrderSummary(tableKey, num, zone) {
    document.getElementById('table-selection-section').style.display = 'none';
    document.getElementById('order-summary-section').style.display   = 'block';

    const badge = document.getElementById('selected-table-badge');
    if (tableKey) {
        const zoneName = zone === 'indoor' ? '🏠 Trong Quán' : '🌿 Ngoài Quán';
        badge.textContent = `${zoneName} · Bàn ${num}`;
        badge.style.display = 'inline-block';
    } else {
        badge.textContent   = '🛍️ Mang Về';
        badge.style.display = 'inline-block';
    }

    document.getElementById('order-summary-items').innerHTML = cart.map(i =>
        `<div class="order-sum-row"><span>${i.title} <small style="color:var(--text-muted)">Size ${i.selectedSize} × ${i.qty}</small></span><span style="color:var(--primary);font-weight:600">${(i.price*i.qty).toLocaleString('vi-VN')}đ</span></div>`
    ).join('');

    const total = cart.reduce((a,c) => a + c.price * c.qty, 0);
    document.getElementById('order-final-total').textContent = total.toLocaleString('vi-VN') + 'đ';
    document.getElementById('order-note').value = '';
}
function confirmOrder() {
    const total = cart.reduce((a,c) => a + c.price * c.qty, 0);
    const note  = document.getElementById('order-note').value;
    const now   = new Date();
    const localDate = getLocalDateStr();

    if (selectedOrderType === 'dine-in' && selectedTableKey) {
        if (!tableData[selectedTableKey]) {
            tableData[selectedTableKey] = makeEmptyTable();
        }
        const t = tableData[selectedTableKey];
        t.orders = [...(t.orders || []), ...cart.map(i => ({ ...i }))];
        t.total  += total;
        t.isServed = false;
        t.paymentMethod = selectedPaymentMethod;
        t.time   = now.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });
        saveTable(selectedTableKey);
        updateTableBtn(selectedTableKey);
        showToast(`✅ Đã đặt món! ${document.getElementById('selected-table-badge').textContent}`);
    } else {
        showToast('✅ Đơn mang về đã được xác nhận!');
    }

    // ---- Save Revenue Record ----
    const recordToPrint = {
        total,
        paymentMethod: selectedPaymentMethod,
        orderType: selectedOrderType,
        tableKey: selectedTableKey || 'takeaway',
        items: cart.map(i => ({ title: i.title, qty: i.qty, price: i.price, size: i.selectedSize })),
        note,
        date: localDate,                                // YYYY-MM-DD (Local)
        month: localDate.slice(0, 7),                   // YYYY-MM (Local)
        year: localDate.slice(0, 4),
        time: now.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }),
        timestamp: now.getTime()
    };
    saveRevenueRecord(recordToPrint);

    cart = [];
    updateCartUI();
    closeCheckoutModal();
    updateZoneCounts();
}
function saveRevenueRecord(record) {
    const recordId = 'rev_' + Date.now();
    db.ref("revenue/" + recordId).set({ id: recordId, ...record });
}

// ============================================================
//  TOAST
// ============================================================
let toastTimer;
function showToast(msg) {
    const el = document.getElementById('order-toast');
    el.textContent = msg;
    el.className   = 'order-toast success show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ============================================================
//  MERGE TABLE & PRINT RECEIPT
// ============================================================
function openMergeTableModal() {
    const tbl = tableData[activeTableKey];
    if (!activeTableKey || !tbl || !(tbl.orders || []).length) {
        showToast('Bàn đang trống, không thể gộp!');
        return;
    }
    const modal = document.getElementById('merge-modal');
    const list = document.getElementById('merge-table-list');
    list.innerHTML = '';
    
    let hasOthers = false;
    Object.keys(tableData).forEach(key => {
        const other = tableData[key];
        if (key !== activeTableKey && other && (other.orders || []).length > 0) {
            hasOthers = true;
            list.innerHTML += `<button class="btn-panel-action" style="background:#2ecc71;color:#fff;border:none;padding:15px;cursor:pointer;border-radius:10px;" onclick="mergeTable('${key}')">Bàn ${key}</button>`;
        }
    });
    if (!hasOthers) {
        list.innerHTML = '<p style="grid-column:1/-1;color:#aaa;text-align:center;">Không có bàn nào khác đang có khách để gộp.</p>';
    }
    modal.style.display = 'block';
}

function closeMergeModal() {
    const modal = document.getElementById('merge-modal');
    if(modal) modal.style.display = 'none';
}

function mergeTable(targetKey) {
    const sourceTable = tableData[activeTableKey];
    const targetTable = tableData[targetKey];
    
    // Add orders
    targetTable.orders = [...(targetTable.orders || []), ...(sourceTable.orders || [])];
    targetTable.total  = (targetTable.total||0) + (sourceTable.total||0);
    targetTable.isPaid = false; 
    
    // Clear source
    tableData[activeTableKey] = makeEmptyTable();
    
    saveTable(activeTableKey);
    saveTable(targetKey);
    updateTableBtn(activeTableKey);
    updateTableBtn(targetKey);
    closeMergeModal();
    closeTablePanel();
    showToast(`✅ Đã gộp thành công vào Bàn ${targetKey}!`);
}

// ============================================================
//  ADD MORE ITEMS TO EXISTING TABLE
// ============================================================
function addMoreToTable() {
    if (!activeTableKey) return;
    const t = tableData[activeTableKey];
    if (t && t.isPaid) {
        showToast('Bàn này đã thanh toán, không thể gọi thêm!');
        return;
    }
    // Pre-select this table for the next order
    selectedOrderType = 'dine-in';
    selectedTableKey = activeTableKey;
    closeTablePanel();
    // Scroll to menu
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
    showToast(`📝 Chọn thêm món cho ${activeTableKey.replace('-',' ')} rồi bấm giỏ hàng!`);
}

function printReceipt(data) {
    const d = new Date();
    const currentUser = JSON.parse(sessionStorage.getItem('aura_session') || '{}');
    document.getElementById('print-meta').innerHTML = `
        <p>Bàn/Loại: <b>${data.table}</b></p>
        <p>TG: ${d.toLocaleString('vi-VN')}</p>
        <p>Thu ngân: ${currentUser.name || 'Nhân viên'}</p>
    `;
    document.getElementById('print-items-body').innerHTML = data.items.map(i => `
        <tr>
            <td>${i.title} ${i.size && i.size !== 'M' ? '('+i.size+')' : ''}</td>
            <td>${i.qty}</td>
            <td style="text-align:right">${(i.price * i.qty).toLocaleString('vi-VN')}</td>
        </tr>
    `).join('');
    document.getElementById('print-total-amount').innerText = data.total.toLocaleString('vi-VN') + 'đ';
    window.print();
}

function printTableBill() {
    if (!activeTableKey) return;
    const table = tableData[activeTableKey];
    if (!table) return;
    const orders = table.orders || [];
    if (orders.length === 0) {
        showToast('Bàn chưa có đơn hàng để in!');
        return;
    }
    printReceipt({
        items: orders,
        total: (table.total || 0),
        table: 'Bàn ' + activeTableKey
    });
}

// ============================================================
//  SHIFT MANAGEMENT (CHẤM CÔNG)
// ============================================================
function getShiftId() {
    const user = JSON.parse(sessionStorage.getItem('aura_session'));
    if (!user) return null;
    const dateStr = getLocalDateStr();
    return user.id + '_' + dateStr;
}

function updateShiftUI() {
    const btnIn = document.getElementById('btn-checkin');
    const btnOut = document.getElementById('btn-checkout');
    if (!btnIn || !btnOut) return;
    
    const sid = getShiftId();
    if (!sid) return;
    
    const shifts = globalShifts || [];
    // Tìm ca làm việc của user hôm nay, lấy ca gần nhất chưa checkout, hoặc nếu đã checkout hết thì cho phép check-in lại (ca mới)
    const activeShift = shifts.find(s => s.userId === sid.split('_')[0] && s.date === sid.split('_')[1] && !s.out);
    
    if (activeShift) {
        btnIn.style.display = 'none';
        btnOut.style.display = 'block';
    } else {
        btnIn.style.display = 'block';
        btnOut.style.display = 'none';
    }
}

function checkIn() {
    const user = JSON.parse(sessionStorage.getItem('aura_session'));
    if (!user) return;
    const localDate = getLocalDateStr();
    const shiftId = 'shift_' + Date.now() + '_' + user.id;
    
    const shiftRecord = {
        id: shiftId,
        userId: user.id,
        userName: user.name,
        date: localDate,
        in: new Date().getTime(),
        out: null
    };
    
    db.ref('shifts/' + shiftId).set(shiftRecord);
    showToast('✅ Đã bắt đầu ca làm việc!');
}

function checkOut() {
    const user = JSON.parse(sessionStorage.getItem('aura_session'));
    if (!user) return;
    const shifts = globalShifts || [];
    const dateStr = getLocalDateStr();
    
    const activeShift = shifts.find(s => s.userId === user.id && s.date === dateStr && !s.out);
    if (activeShift) {
        db.ref('shifts/' + activeShift.id + '/out').set(new Date().getTime());
        showToast('✅ Đã kết thúc ca làm việc!');
    }
}
