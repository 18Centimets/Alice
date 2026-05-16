// ==========================================
//  AURA COFFEE - Admin Panel Logic
// ==========================================

const STORAGE_KEY = 'aura_coffee_menu';
const CUSTOM_ITEMS_KEY = 'aura_coffee_custom_items';
const REVENUE_KEY  = 'aura_coffee_revenue';
const INVENTORY_KEY = 'aura_coffee_inventory';
const INVENTORY_EXPORT_KEY = 'aura_coffee_inventory_export';
const EXPENSE_KEY   = 'aura_coffee_expenses';
const LOG_KEY       = 'aura_coffee_logs';
const SESSION_KEY   = 'aura_session';

const SYSTEM_USERS = [
    { id:'superadmin', password:'Aura@2024#',  role:'administrator', name:'Super Administrator' },
    { id:'admin',      password:'Admin@2024#', role:'admin',          name:'Quản Lý Quán' },
    { id:'user01',     password:'User@2024#',  role:'user',           name:'Nhân Viên Phục Vụ' }
];
const ROLE_PAGES = {
    administrator: ['menu-manager','add-item','revenue','inventory','inv-export','expenses','summary','logs','users'],
    admin:         ['menu-manager','add-item','inventory','inv-export','expenses','summary','logs'],
    user:          ['expenses','revenue','inv-export']
};
// Pages that Administrator can grant/revoke for lower accounts
const GRANTABLE_PAGES = [
    { id:'expenses',     label:'Chi Vận Hành' },
    { id:'revenue',      label:'Doanh Thu' },
    { id:'inventory',    label:'Vật Tư Tồn Kho' },
    { id:'inv-export',   label:'Phiếu Xuất Kho' },
    { id:'summary',      label:'Báo Cáo Tổng' },
    { id:'logs',         label:'Nhật Ký' },
    { id:'add-item',     label:'Thêm Món' },
    { id:'menu-manager', label:'Quản Lý Thực Đơn' },
];
const CUSTOM_PERMS_KEY = 'aura_coffee_custom_perms';
const ROLE_LABELS = { administrator:'👑 Administrator', admin:'🛡️ Admin', user:'👤 Nhân Viên' };
let currentUser = null;

// Default menu (in case localStorage is empty)
const defaultMenu = [
    { id: 1, title: "Gold Leaf Latte", category: "coffee", prices: { S: 70000, M: 85000, L: 100000 }, img: "assets/latte.png", desc: "Sự kết hợp hoàn hảo giữa hạt Arabica thượng hạng và lớp bọt sữa mịn màng, điểm xuyết vàng lá 24k tinh xảo." },
    { id: 2, title: "Midnight Cold Brew", category: "coffee", prices: { S: 60000, M: 75000, L: 90000 }, img: "assets/coldbrew.png", desc: "Cà phê ủ lạnh trong 24 giờ, mang lại hương vị mượt mà, đậm đà với nốt hương chocolate và caramel." },
    { id: 3, title: "Classic Cappuccino", category: "coffee", prices: { S: 55000, M: 65000, L: 80000 }, img: "assets/latte.png", desc: "Tỷ lệ vàng giữa Espresso, sữa nóng và bọt sữa, tạo nên hương vị truyền thống khó quên." },
    { id: 4, title: "Rose Lychee Tea", category: "tea", prices: { S: 55000, M: 70000, L: 85000 }, img: "assets/coldbrew.png", desc: "Sự thanh mát của trà oolong kết hợp với hương thơm dịu nhẹ của hoa hồng và vị ngọt của vải tươi." },
    { id: 5, title: "French Croissant", category: "pastry", prices: { S: 0, M: 55000, L: 0 }, img: "assets/croissant.png", desc: "Bánh sừng bò truyền thống Pháp với lớp vỏ giòn tan và hương bơ thơm ngậy trong từng lớp bánh." },
    { id: 6, title: "Truffle Mushroom Bun", category: "pastry", prices: { S: 0, M: 95000, L: 0 }, img: "assets/croissant.png", desc: "Bánh mì mềm nhân nấm truffle quý hiếm, mang đến trải nghiệm ẩm thực độc đáo và sang trọng." },
];

// ---- State ----
let allItems = [];
let currentImageDataURL = '';
let deleteTargetId = null;

// ---- DOM Refs ----
const menuTableBody = document.getElementById('menu-table-body');
const totalCount = document.getElementById('total-items-count');
const pageTitle = document.getElementById('page-title');
const emptyState = document.getElementById('empty-state');
const menuTable = document.getElementById('menu-table');
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const toast = document.getElementById('toast');

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    loadMenuData();
    renderTable(allItems);
    setupNavigation();
    setupForm();
    setupImageUpload();
    setupLivePreview();
    updateCount();
    setupInvDropZone();
    setupExpDropZone();
    applyPermissions();
    showUserBadge();
    const expDate = document.getElementById('exp-date');
    if (expDate) expDate.value = new Date().toISOString().slice(0,10);
    const expMonth = document.getElementById('exp-filter-month');
    if (expMonth) expMonth.value = new Date().toISOString().slice(0,7);
    writeLog('MỮ TRANG', 'Mở trang quản lý Admin Panel');
    // User role: auto redirect to expenses page (their only page)
    if (currentUser && currentUser.role === 'user') {
        switchPage('expenses');
    }
});

// ==========================================
//  DATA LAYER
// ==========================================

function loadMenuData() {
    const stored = globalMenu;
    if (stored && stored.length > 0) {
        allItems = stored;
    } else {
        allItems = defaultMenu.map(item => ({ ...item }));
        saveMenuData();
    }
}

function saveMenuData() {
    db.ref("menu").set(allItems);
}

function getNextId() {
    return allItems.length > 0 ? Math.max(...allItems.map(i => i.id)) + 1 : 1;
}

function updateCount() {
    totalCount.textContent = allItems.length;
}

// ==========================================
//  TABLE RENDER
// ==========================================

const catLabels = {
    coffee: 'Cà Phê', tea: 'Trà', pastry: 'Bánh Ngọt',
    juice: 'Nước Ép', smoothie: 'Sinh Tố', other: 'Khác'
};

function renderTable(items) {
    if (items.length === 0) {
        menuTable.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    menuTable.style.display = 'table';
    emptyState.style.display = 'none';

    menuTableBody.innerHTML = items.map(item => {
        const imgHtml = item.img
            ? `<img class="table-img" src="${item.img}" alt="${item.title}">`
            : `<div class="table-img-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
        
        const prices = item.prices || { S: 0, M: item.price || 0, L: 0 };
        const priceRows = Object.entries(prices)
            .filter(([, v]) => v && v > 0)
            .map(([sz, p]) => `<div class="price-size-row"><span class="sz-tag sz-${sz.toLowerCase()}">${sz}</span> ${p.toLocaleString('vi-VN')}đ</div>`)
            .join('');

        const catClass = item.category || 'other';
        const catLabel = catLabels[catClass] || 'Khác';
        const desc = item.desc ? (item.desc.length > 60 ? item.desc.slice(0, 60) + '...' : item.desc) : '—';

        return `
            <tr>
                <td>${imgHtml}</td>
                <td><strong>${item.title}</strong></td>
                <td><span class="cat-badge cat-${catClass}">${catLabel}</span></td>
                <td><div class="price-sizes">${priceRows || '<span style="color:var(--text-muted)">—</span>'}</div></td>
                <td style="color:var(--text-muted);font-size:0.85rem;">${desc}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon edit" title="Chỉnh sửa" onclick="editItem(${item.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon delete" title="Xóa" onclick="promptDelete(${item.id})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// ==========================================
//  SEARCH & FILTER
// ==========================================

function filterTable() {
    const q = searchInput.value.toLowerCase().trim();
    const cat = filterCategory.value;
    const filtered = allItems.filter(item => {
        const matchQ = !q || item.title.toLowerCase().includes(q);
        const matchCat = cat === 'all' || item.category === cat;
        return matchQ && matchCat;
    });
    renderTable(filtered);
}

searchInput.addEventListener('input', filterTable);
filterCategory.addEventListener('change', filterTable);

// ==========================================
//  NAVIGATION
// ==========================================

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            switchPage(link.dataset.page);
        });
    });
}

function switchPage(pageId) {
    if (!hasPermission(pageId)) {
        showToast('\u26d4 B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n truy c\u1eadp trang n\u00e0y', 'error'); return;
    }
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const targetPage = document.getElementById(`page-${pageId}`);
    const navIdMap = {
        'menu-manager':'nav-menu','add-item':'nav-add-item',
        'revenue':'nav-revenue','inventory':'nav-inventory',
        'inv-export':'nav-inv-export',
        'expenses':'nav-expenses','summary':'nav-summary',
        'logs':'nav-logs','users':'nav-users'
    };
    const targetNav = document.getElementById(navIdMap[pageId] || `nav-${pageId}`);
    if (targetPage) targetPage.classList.add('active');
    if (targetNav)  targetNav.classList.add('active');
    const titles = {
        'menu-manager':'Qu\u1ea3n L\u00fd Th\u1ef1c \u0110\u01a1n','add-item':'Th\u00eam M\u00f3n M\u1edbi',
        'revenue':'T\u1ed5ng H\u1ee3p Doanh Thu','inventory':'V\u1eadt T\u01b0 T\u1ed3n Kho',
        'inv-export':'Phi\u1ebfu Xu\u1ea5t Kho',
        'expenses':'Chi V\u1eadn H\u00e0nh','summary':'B\u00e1o C\u00e1o T\u1ed5ng',
        'logs':'Nh\u1eadt K\u00fd Ho\u1ea1t \u0110\u1ed9ng','users':'Qu\u1ea3n L\u00fd T\u00e0i Kho\u1ea3n'
    };
    pageTitle.textContent = titles[pageId] || 'Admin';
    if (pageId==='revenue') {
        const i=document.getElementById('rev-date-input');
        if(!i.value){i.type='date';i.value=new Date().toISOString().slice(0,10);}
        const tabs = document.querySelector('.rev-period-tabs');
        if (tabs) tabs.style.display = (currentUser && currentUser.role === 'user') ? 'none' : 'flex';
        if (currentUser && currentUser.role === 'user') {
            pageTitle.textContent = 'Doanh Thu Hàng Ngày';
            i.value = new Date().toISOString().slice(0,10);
            i.disabled = true;
            i.style.opacity = '0.7';
            setRevPeriod('day');
        } else {
            i.disabled = false;
            i.style.opacity = '1';
            renderRevenuePage();
        }
    }
    if (pageId==='inventory') renderInventoryTable();
    if (pageId==='inv-export') {
        const d=document.getElementById('inv-export-date'); if(d&&!d.value) d.value=new Date().toISOString().slice(0,10);
        populateInvExportDropdown();
        renderInventoryExportTable();
    }
    if (pageId==='expenses')  renderExpenseList();
    if (pageId==='summary')   { const i=document.getElementById('sum-date-input'); if(!i.value) i.value=new Date().toISOString().slice(0,10); renderSummaryPage(); }
    if (pageId==='logs')      renderLogs();
    if (pageId==='users')     renderUsersPage();
    writeLog('XEM TRANG', `Chuy\u1ec3n sang: ${titles[pageId]||pageId}`);
}

// ==========================================
//  FORM LOGIC
// ==========================================

function setupForm() {
    const form = document.getElementById('menu-item-form');
    form.addEventListener('submit', handleFormSubmit);
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const editId = document.getElementById('edit-id').value;
    const priceS = parseInt(document.getElementById('price-s').value) || 0;
    const priceM = parseInt(document.getElementById('price-m').value) || 0;
    const priceL = parseInt(document.getElementById('price-l').value) || 0;

    const itemData = {
        title: document.getElementById('item-name').value.trim(),
        category: document.getElementById('item-category').value,
        prices: { S: priceS, M: priceM, L: priceL },
        price: priceM || priceS || priceL, // fallback for menu compatibility
        img: currentImageDataURL || '',
        desc: document.getElementById('item-desc').value.trim(),
    };

    if (editId) {
        // Edit mode
        const idx = allItems.findIndex(i => i.id === parseInt(editId));
        if (idx > -1) {
            allItems[idx] = { ...allItems[idx], ...itemData };
            showToast('✅ Đã cập nhật món thành công!', 'success');
        }
    } else {
        // Add new
        itemData.id = getNextId();
        allItems.push(itemData);
        showToast('✅ Đã thêm món mới vào thực đơn!', 'success');
    }

    saveMenuData();
    updateCount();
    resetForm();
    setTimeout(() => switchPage('menu-manager'), 300);
    renderTable(allItems);
}

function validateForm() {
    let isValid = true;
    clearErrors();

    const name = document.getElementById('item-name').value.trim();
    const cat = document.getElementById('item-category').value;
    const priceM = document.getElementById('price-m').value;

    if (!name) {
        document.getElementById('err-name').textContent = 'Vui lòng nhập tên món.';
        isValid = false;
    }
    if (!cat) {
        document.getElementById('err-category').textContent = 'Vui lòng chọn loại thực đơn.';
        isValid = false;
    }
    if (!priceM || parseInt(priceM) <= 0) {
        document.getElementById('err-price').textContent = 'Giá size M là bắt buộc (đây là giá mặc định).';
        isValid = false;
    }
    return isValid;
}

function clearErrors() {
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
}

function resetForm() {
    document.getElementById('menu-item-form').reset();
    document.getElementById('edit-id').value = '';
    currentImageDataURL = '';
    document.getElementById('form-title').textContent = 'Thêm Món Mới Vào Thực Đơn';
    document.getElementById('submit-label').textContent = 'Lưu Vào Thực Đơn';
    
    // Reset image area
    document.getElementById('image-file-input').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('drop-zone-inner').style.display = 'flex';
    document.getElementById('card-preview-img').src = 'assets/latte.png';
    document.getElementById('preview-no-img').style.display = 'flex';
    
    // Reset preview panel
    document.getElementById('preview-name').textContent = 'Tên Món';
    document.getElementById('preview-cat').textContent = 'Loại thực đơn';
    ['s','m','l'].forEach(sz => { document.getElementById(`prev-${sz}`).style.display = 'none'; });
    clearErrors();
}

function editItem(id) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    switchPage('add-item');
    
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.title;
    document.getElementById('item-category').value = item.category;
    document.getElementById('item-desc').value = item.desc || '';
    document.getElementById('form-title').textContent = 'Chỉnh Sửa Món';
    document.getElementById('submit-label').textContent = 'Lưu Thay Đổi';

    const prices = item.prices || { S: 0, M: item.price || 0, L: 0 };
    document.getElementById('price-s').value = prices.S || '';
    document.getElementById('price-m').value = prices.M || '';
    document.getElementById('price-l').value = prices.L || '';

    if (item.img) {
        currentImageDataURL = item.img;
        document.getElementById('preview-img').src = item.img;
        document.getElementById('image-preview').style.display = 'flex';
        document.getElementById('drop-zone-inner').style.display = 'none';
        document.getElementById('card-preview-img').src = item.img;
        document.getElementById('preview-no-img').style.display = 'none';
    }

    // Update live preview
    updateLivePreview();
}

// ==========================================
//  IMAGE UPLOAD (Drag & Drop + Browse)
// ==========================================

function setupImageUpload() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('image-file-input');
    const removeBtn = document.getElementById('remove-image');

    // Drag events
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImageFile(file);
        } else {
            showToast('⚠️ Chỉ chấp nhận file ảnh (PNG, JPG, WebP)', 'error');
        }
    });

    // File browse
    fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) loadImageFile(file);
    });

    // Remove image
    removeBtn.addEventListener('click', () => {
        currentImageDataURL = '';
        fileInput.value = '';
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('drop-zone-inner').style.display = 'flex';
        document.getElementById('card-preview-img').src = 'assets/latte.png';
        document.getElementById('preview-no-img').style.display = 'flex';
    });
}

function loadImageFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        showToast('⚠️ File ảnh quá lớn! Tối đa 5MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataURL = e.target.result;
        currentImageDataURL = dataURL;
        document.getElementById('preview-img').src = dataURL;
        document.getElementById('image-preview').style.display = 'flex';
        document.getElementById('drop-zone-inner').style.display = 'none';
        document.getElementById('card-preview-img').src = dataURL;
        document.getElementById('preview-no-img').style.display = 'none';
        showToast('📸 Đã tải ảnh thành công!', 'success');
    };
    reader.readAsDataURL(file);
}

// ==========================================
//  LIVE PREVIEW
// ==========================================

function setupLivePreview() {
    const nameEl = document.getElementById('item-name');
    const catEl = document.getElementById('item-category');
    const priceS = document.getElementById('price-s');
    const priceM = document.getElementById('price-m');
    const priceL = document.getElementById('price-l');

    [nameEl, catEl, priceS, priceM, priceL].forEach(el => {
        el.addEventListener('input', updateLivePreview);
        el.addEventListener('change', updateLivePreview);
    });
}

function updateLivePreview() {
    const name = document.getElementById('item-name').value || 'Tên Món';
    const cat = document.getElementById('item-category').value;
    const catLabel = catLabels[cat] || 'Loại thực đơn';
    const s = parseInt(document.getElementById('price-s').value) || 0;
    const m = parseInt(document.getElementById('price-m').value) || 0;
    const l = parseInt(document.getElementById('price-l').value) || 0;

    document.getElementById('preview-name').textContent = name;
    document.getElementById('preview-cat').textContent = catLabel;

    const setPriceTag = (sz, val) => {
        const el = document.getElementById(`prev-${sz}`);
        const priceEl = document.getElementById(`prev-price-${sz}`);
        if (val > 0) {
            el.style.display = 'inline-block';
            priceEl.textContent = val.toLocaleString('vi-VN') + 'đ';
        } else {
            el.style.display = 'none';
        }
    };

    setPriceTag('s', s);
    setPriceTag('m', m);
    setPriceTag('l', l);
}

// ==========================================
//  DELETE
// ==========================================

function promptDelete(id) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;
    deleteTargetId = id;
    document.getElementById('confirm-item-name').textContent = item.title;
    document.getElementById('confirm-modal').style.display = 'flex';
    
    document.getElementById('confirm-delete-btn').onclick = () => {
        allItems = allItems.filter(i => i.id !== deleteTargetId);
        saveMenuData();
        updateCount();
        filterTable();
        closeConfirm();
        showToast('🗑️ Đã xóa món khỏi thực đơn!', 'success');
    };
}

function closeConfirm() {
    document.getElementById('confirm-modal').style.display = 'none';
    deleteTargetId = null;
}

// ==========================================
//  TOAST
// ==========================================

let toastTimeout;
function showToast(msg, type = 'success') {
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ==========================================
//  REVENUE PAGE
// ==========================================

let revPeriod = 'day';

function setRevPeriod(period) {
    revPeriod = period;
    document.querySelectorAll('.rev-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.rev-tab[data-period="${period}"]`).classList.add('active');

    const input = document.getElementById('rev-date-input');
    const today = new Date().toISOString().slice(0, 10);
    if (period === 'day')   input.type = 'date',  input.value = today;
    if (period === 'month') input.type = 'month', input.value = today.slice(0, 7);
    if (period === 'year')  input.type = 'number', input.value = new Date().getFullYear();
    renderRevenuePage();
}

function renderRevenuePage() {
    const all = globalRevenue || [];
    const key  = document.getElementById('rev-date-input').value || '';
    const filtered = all.filter(r => {
        if (revPeriod === 'day')   return r.date  === key;
        if (revPeriod === 'month') return r.month === key;
        if (revPeriod === 'year')  return r.year  === String(key);
        return true;
    });

    const total   = filtered.reduce((s,r) => s + r.total, 0);
    const cash    = filtered.filter(r => r.paymentMethod === 'cash');
    const online  = filtered.filter(r => r.paymentMethod === 'online');
    const cashAmt = cash.reduce((s,r)   => s + r.total, 0);
    const onlAmt  = online.reduce((s,r) => s + r.total, 0);
    const avg     = filtered.length ? Math.round(total / filtered.length) : 0;

    document.getElementById('rev-total').textContent   = total.toLocaleString('vi-VN') + 'đ';
    document.getElementById('rev-cash').textContent    = cashAmt.toLocaleString('vi-VN') + 'đ';
    document.getElementById('rev-online').textContent  = onlAmt.toLocaleString('vi-VN') + 'đ';
    document.getElementById('rev-orders').textContent  = filtered.length;
    document.getElementById('rev-cash-pct').textContent   = `${cash.length} giao dịch`;
    document.getElementById('rev-online-pct').textContent = `${online.length} giao dịch`;
    document.getElementById('rev-avg').textContent     = `TB: ${avg.toLocaleString('vi-VN')}đ/đơn`;

    const labels = { day: `Ngày ${key}`, month: `Tháng ${key}`, year: `Năm ${key}` };
    document.getElementById('rev-period-label').textContent = labels[revPeriod] || '';

    const tbody = document.getElementById('rev-table-body');
    const empty = document.getElementById('rev-empty');
    const table = document.getElementById('rev-table');

    if (filtered.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'flex';
    } else {
        table.style.display = 'table';
        empty.style.display = 'none';
        const sorted = [...filtered].sort((a,b) => b.timestamp - a.timestamp);
        tbody.innerHTML = sorted.map(r => {
            const payBadge = r.paymentMethod === 'cash'
                ? `<span class="cat-badge" style="background:rgba(46,204,113,.15);color:#2ecc71">💵 Tiền Mặt</span>`
                : `<span class="cat-badge" style="background:rgba(155,89,182,.15);color:#9b59b6">📱 Chuyển Khoản</span>`;
            const typeBadge = r.orderType === 'dine-in'
                ? `<span class="cat-badge cat-coffee">🪑 Tại Chỗ</span>`
                : `<span class="cat-badge cat-pastry">🛍️ Mang Về</span>`;
            const loc = r.tableKey !== 'takeaway'
                ? (r.tableKey.startsWith('indoor') ? `🏠 Bàn ${r.tableKey.split('-')[1]}` : `🌿 Bàn ${r.tableKey.split('-')[1]}`)
                : '—';
            return `<tr>
                <td><strong>${r.time}</strong><br><small style="color:var(--text-muted)">${r.date}</small></td>
                <td>${typeBadge}</td>
                <td style="color:var(--text-muted);font-size:.85rem">${loc}</td>
                <td>${payBadge}</td>
                <td style="color:var(--primary);font-weight:700">${r.total.toLocaleString('vi-VN')}đ</td>
            </tr>`;
        }).join('');
    }
}

// ==========================================
//  INVENTORY
// ==========================================
let expImageDataURL = '';

function loadInventory() { return globalInventory || []; }
function saveInventoryData(d) { db.ref("inventory").set(d); }

function addInventoryItem() {
    const name = document.getElementById('inv-name').value.trim();
    if (!name) { showToast('Vui lòng nhập tên vật tư', 'error'); return; }
    const inv = loadInventory();
    inv.push({
        id: Date.now(),
        name,
        unit:      document.getElementById('inv-unit').value.trim(),
        qty:       parseFloat(document.getElementById('inv-qty').value) || 0,
        threshold: parseFloat(document.getElementById('inv-threshold').value) || 0,
        note:      document.getElementById('inv-note').value.trim()
    });
    saveInventoryData(inv);
    ['inv-name','inv-unit','inv-qty','inv-threshold','inv-note'].forEach(id => document.getElementById(id).value = '');
    renderInventoryTable();
    showToast('✅ Đã thêm vật tư!');
}
function deleteInventoryItemByName(name) {
    if(!confirm(`Xóa toàn bộ dữ liệu của vật tư "${name}"?`)) return;
    saveInventoryData(loadInventory().filter(i => i.name.trim() !== name));
    var exports = (globalInventoryExport || []);
    db.ref("inventory_export").set(exports.filter(e => e.name.trim() !== name));
    writeLog('XÓA VẬT TƯ', `Đã xóa vật tư: ${name}`);
    renderInventoryTable();
}

function getAggregatedInventory() {
    const imports = loadInventory();
    const exports = (globalInventoryExport || []);
    const aggMap = {};
    imports.forEach(i => {
        const name = i.name.trim();
        if (!aggMap[name]) {
            aggMap[name] = { name, unit: i.unit, totalImport: 0, totalExport: 0, threshold: i.threshold, note: i.note };
        }
        aggMap[name].totalImport += (parseFloat(i.qty) || 0);
        if (i.threshold > 0) aggMap[name].threshold = i.threshold;
    });
    exports.forEach(e => {
        const name = e.name.trim();
        if (aggMap[name]) aggMap[name].totalExport += (parseFloat(e.qty) || 0);
    });
    return Object.values(aggMap).map(item => {
        item.qty = item.totalImport - item.totalExport;
        return item;
    });
}
function renderInventoryTable() {
    const q     = (document.getElementById('inv-search')?.value || '').toLowerCase();
    const inv   = getAggregatedInventory().filter(i => !q || i.name.toLowerCase().includes(q));
    const tbody = document.getElementById('inv-table-body');
    const empty = document.getElementById('inv-empty');
    const table = document.getElementById('inv-table');
    const statsEl = document.getElementById('inv-stats');

    const critical = inv.filter(i => i.threshold > 0 && i.qty <= i.threshold).length;
    const warning  = inv.filter(i => i.threshold > 0 && i.qty > i.threshold && i.qty <= i.threshold * 1.5).length;
    if (statsEl) statsEl.innerHTML = `
        <div class="inv-stat-card inv-total"><span>📦</span><b>${inv.length}</b><span>Tổng vật tư</span></div>
        <div class="inv-stat-card inv-critical"><span>🚨</span><b>${critical}</b><span>Nguy hiểm</span></div>
        <div class="inv-stat-card inv-warning"><span>⚠️</span><b>${warning}</b><span>Cần nhập thêm</span></div>
        <div class="inv-stat-card inv-ok"><span>✅</span><b>${inv.length - critical - warning}</b><span>Ổn định</span></div>`;

    if (!inv.length) { if(table) table.style.display='none'; if(empty) empty.style.display='flex'; return; }
    if(table) table.style.display='table'; if(empty) empty.style.display='none';
    tbody.innerHTML = inv.map((item, i) => {
        let st, sc;
        if (item.threshold > 0 && item.qty <= item.threshold)           { st='🚨 Nguy hiểm'; sc='inv-badge-critical'; }
        else if (item.threshold > 0 && item.qty <= item.threshold * 1.5){ st='⚠️ Cần nhập';  sc='inv-badge-warning';  }
        else                                                              { st='✅ Ổn định';   sc='inv-badge-ok';       }
        return `<tr>
            <td>${i+1}</td><td><strong>${item.name}</strong></td>
            <td style="color:var(--text-muted)">${item.unit||'—'}</td>
            <td style="color:var(--text-muted)">${item.totalImport}</td>
            <td style="color:#e74c3c">${item.totalExport}</td>
            <td style="font-weight:700;color:var(--primary);font-size:1.05rem">${item.qty}</td>
            <td style="color:var(--text-muted)">${item.threshold||'—'}</td>
            <td><span class="inv-status-badge ${sc}">${st}</span></td>
            <td><button class="btn-icon delete" onclick="deleteInventoryItemByName('${item.name}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button></td></tr>`;
    }).join('');
}
function setupInvDropZone() {
    const zone = document.getElementById('inv-drop-zone');
    const inp  = document.getElementById('inv-file-input');
    if (!zone || !inp) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); if(e.dataTransfer.files[0]) parseExcelFile(e.dataTransfer.files[0]); });
    inp.addEventListener('change', e => { if(e.target.files[0]) parseExcelFile(e.target.files[0]); });
}
function parseExcelFile(file) {
    if (!window.XLSX) { showToast('⚠️ Thư viện Excel chưa sẵn sàng, vui lòng đợi.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const wb   = XLSX.read(e.target.result, { type: 'array' });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
            const inv  = loadInventory(); let added = 0;
            rows.forEach(row => {
                const name = (row['Tên vật tư']||row['ten_vat_tu']||row['Name']||row['name']||'').toString().trim();
                if (!name) return;
                inv.push({ id: Date.now()+added++, name,
                    unit:      (row['Đơn vị']||row['Unit']||'').toString(),
                    qty:       parseFloat(row['Số lượng']||row['Qty']||0),
                    threshold: parseFloat(row['Ngưỡng cảnh báo']||row['Threshold']||0),
                    note:      (row['Ghi chú']||row['Note']||'').toString() });
            });
            saveInventoryData(inv); renderInventoryTable();
            showToast(`✅ Đã import ${added} vật tư từ Excel!`);
        } catch(err) { showToast('❌ Lỗi đọc file: ' + err.message, 'error'); }
    };
    reader.readAsArrayBuffer(file);
}

// ==========================================
//  INVENTORY EXPORT
// ==========================================
function populateInvExportDropdown() {
    const select = document.getElementById('inv-export-name');
    if (!select) return;
    const items = getAggregatedInventory();
    select.innerHTML = '<option value="">-- Chọn vật tư cần xuất --</option>' + 
        items.map(i => `<option value="${i.name}">${i.name} (Tồn: ${i.qty})</option>`).join('');
}

function addInventoryExport() {
    const name = document.getElementById('inv-export-name').value;
    const qty = parseFloat(document.getElementById('inv-export-qty').value) || 0;
    const date = document.getElementById('inv-export-date').value;
    const note = document.getElementById('inv-export-note').value.trim();

    if (!name || qty <= 0 || !date) {
        showToast('Vui lòng chọn vật tư, số lượng > 0 và ngày xuất', 'error');
        return;
    }

    const exports = (globalInventoryExport || []);
    exports.push({
        id: Date.now(),
        name, qty, date, note,
        user: currentUser ? currentUser.name : 'Unknown',
        timestamp: Date.now()
    });
    db.ref("inventory_export").set(exports);
    writeLog('XUẤT KHO', `Đã xuất ${qty} ${name}. Ghi chú: ${note}`);
    
    document.getElementById('inv-export-qty').value = '';
    document.getElementById('inv-export-note').value = '';
    
    populateInvExportDropdown();
    renderInventoryExportTable();
    showToast('✅ Đã lưu phiếu xuất kho!');
}

function renderInventoryExportTable() {
    const exports = (globalInventoryExport || []).sort((a,b) => b.timestamp - a.timestamp);
    const tbody = document.getElementById('inv-export-table-body');
    const table = document.getElementById('inv-export-table');
    const empty = document.getElementById('inv-export-empty');
    if (!tbody) return;

    if (!exports.length) {
        table.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }
    table.style.display = 'table';
    empty.style.display = 'none';

    tbody.innerHTML = exports.map(e => `<tr>
        <td style="white-space:nowrap">${new Date(e.timestamp).toLocaleString('vi-VN')}</td>
        <td><strong>${e.user}</strong></td>
        <td style="color:var(--primary);font-weight:600">${e.name}</td>
        <td style="color:#e74c3c;font-weight:700">-${e.qty}</td>
        <td style="color:var(--text-muted);font-size:.85rem">${e.note||'—'}</td>
    </tr>`).join('');
}

// ==========================================
//  EXPENSES (Chi vận hành)
// ==========================================
function loadExpenses() { return globalExpenses || []; }
function saveExpensesData(d) { db.ref("expenses").set(d); }

function saveExpense() {
    const name   = document.getElementById('exp-name').value.trim();
    const date   = document.getElementById('exp-date').value;
    const qty    = parseFloat(document.getElementById('exp-qty').value) || 1;
    const unit   = parseFloat(document.getElementById('exp-amount').value) || 0;
    const note   = document.getElementById('exp-note').value.trim();
    if (!name)    { showToast('Vui lòng nhập tên hàng hóa', 'error');  return; }
    if (!date)    { showToast('Vui lòng chọn ngày chi', 'error');       return; }
    if (unit <= 0){ showToast('Vui lòng nhập đơn giá hợp lệ', 'error');return; }
    const exps = loadExpenses();
    exps.push({ id: Date.now(), name, qty, unitPrice: unit, amount: unit * qty, note,
        img: expImageDataURL, date, month: date.slice(0,7),
        year: date.slice(0,4), timestamp: Date.now(),
        time: new Date().toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'}) });
    saveExpensesData(exps);
    resetExpenseForm();
    renderExpenseList();
    showToast('✅ Đã lưu khoản chi!');
}
function resetExpenseForm() {
    ['exp-name','exp-qty','exp-amount','exp-note'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('exp-qty').value = 1;
    document.getElementById('exp-date').value = new Date().toISOString().slice(0,10);
    clearExpImage();
}
function clearExpImage() {
    expImageDataURL = '';
    document.getElementById('exp-img-preview').style.display = 'none';
    document.getElementById('exp-drop-inner').style.display  = 'flex';
    document.getElementById('exp-img-input').value = '';
}
function setupExpDropZone() {
    const zone = document.getElementById('exp-drop-zone');
    const inp  = document.getElementById('exp-img-input');
    if (!zone || !inp) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f && f.type.startsWith('image/')) loadExpImage(f);
        else showToast('Chỉ chấp nhận file ảnh', 'error');
    });
    inp.addEventListener('change', e => { if(e.target.files[0]) loadExpImage(e.target.files[0]); });
}
function loadExpImage(file) {
    const reader = new FileReader();
    reader.onload = e => {
        expImageDataURL = e.target.result;
        document.getElementById('exp-preview-img').src = e.target.result;
        document.getElementById('exp-img-preview').style.display = 'flex';
        document.getElementById('exp-drop-inner').style.display  = 'none';
    };
    reader.readAsDataURL(file);
}
function deleteExpense(id) {
    saveExpensesData(loadExpenses().filter(e => e.id !== id));
    renderExpenseList();
}
function renderExpenseList() {
    const month = document.getElementById('exp-filter-month')?.value || '';
    const exps  = loadExpenses().filter(e => !month || e.month === month).sort((a,b) => b.timestamp - a.timestamp);
    const el    = document.getElementById('exp-list');
    if (!exps.length) {
        el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem">Không có khoản chi trong tháng này.</p>';
        return;
    }
    el.innerHTML = exps.map(e => `
        <div class="exp-card">
            <div class="exp-card-left">
                ${e.img ? `<img src="${e.img}" class="exp-thumb" onclick="this.classList.toggle('expanded')">` : '<div class="exp-thumb-placeholder">📎</div>'}
            </div>
            <div class="exp-card-body">
                <strong>${e.name}</strong>
                <span class="exp-meta">${e.date} · SL: ${e.qty} · ${e.unitPrice.toLocaleString('vi-VN')}đ/cái</span>
                ${e.note ? `<span class="exp-note-text">${e.note}</span>` : ''}
            </div>
            <div class="exp-card-right">
                <span class="exp-amount">${e.amount.toLocaleString('vi-VN')}đ</span>
                <button class="btn-icon delete" onclick="deleteExpense(${e.id})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
            </div>
        </div>`).join('');
}

// ==========================================
//  SUMMARY REPORT (Báo cáo tổng)
// ==========================================
let sumPeriod = 'day';

function setSumPeriod(period) {
    sumPeriod = period;
    document.querySelectorAll('.sum-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.sum-tab[data-period="${period}"]`).classList.add('active');
    const inp = document.getElementById('sum-date-input');
    const today = new Date().toISOString().slice(0,10);
    if (period === 'day')  { inp.type = 'date';   inp.value = today; }
    if (period === 'month'){ inp.type = 'month';  inp.value = today.slice(0,7); }
    if (period === 'year') { inp.type = 'number'; inp.value = new Date().getFullYear(); }
    renderSummaryPage();
}
function renderSummaryPage() {
    const key = document.getElementById('sum-date-input').value || '';
    // Revenue
    const revAll = JSON.parse(localStorage.getItem(REVENUE_KEY) || '[]');
    const revF   = revAll.filter(r => sumPeriod==='day' ? r.date===key : sumPeriod==='month' ? r.month===key : r.year===String(key));
    const revTotal = revF.reduce((s,r) => s + r.total, 0);
    // Expenses
    const expAll = loadExpenses();
    const expF   = expAll.filter(e => sumPeriod==='day' ? e.date===key : sumPeriod==='month' ? e.month===key : e.year===String(key));
    const expTotal = expF.reduce((s,e) => s + e.amount, 0);
    // Net profit
    const profit  = revTotal - expTotal;
    const margin  = revTotal > 0 ? Math.round(profit / revTotal * 100) : 0;

    document.getElementById('sum-revenue').textContent  = revTotal.toLocaleString('vi-VN') + 'đ';
    document.getElementById('sum-rev-sub').textContent  = `${revF.length} đơn hàng`;
    document.getElementById('sum-expense').textContent  = expTotal.toLocaleString('vi-VN') + 'đ';
    document.getElementById('sum-exp-sub').textContent  = `${expF.length} khoản chi`;

    const profitEl = document.getElementById('sum-profit');
    profitEl.textContent   = profit.toLocaleString('vi-VN') + 'đ';
    profitEl.style.color   = profit >= 0 ? 'var(--primary)' : '#e74c3c';
    document.getElementById('sum-margin').textContent   = `Biên LN: ${margin}%${profit < 0 ? ' ⚠️ Thua lỗ' : ''}`;

    // Revenue detail
    const revDetail = document.getElementById('sum-rev-detail');
    revDetail.innerHTML = revF.length ? revF.sort((a,b)=>b.timestamp-a.timestamp).map(r => `
        <div class="sum-row"><span>${r.time} · ${r.date}</span>
        <span style="color:${r.paymentMethod==='cash'?'#2ecc71':'#9b59b6'}">${r.paymentMethod==='cash'?'💵':'📱'}</span>
        <span style="color:var(--primary);font-weight:700">${r.total.toLocaleString('vi-VN')}đ</span></div>`).join('')
        : '<p style="color:var(--text-muted);text-align:center;padding:1.5rem">Không có doanh thu</p>';

    // Expense detail
    const expDetail = document.getElementById('sum-exp-detail');
    expDetail.innerHTML = expF.length ? expF.sort((a,b)=>b.timestamp-a.timestamp).map(e => `
        <div class="sum-row"><span>${e.date} · ${e.name}</span>
        <span style="color:var(--text-muted)">SL ${e.qty}</span>
        <span style="color:#e74c3c;font-weight:700">-${e.amount.toLocaleString('vi-VN')}đ</span></div>`).join('')
        : '<p style="color:var(--text-muted);text-align:center;padding:1.5rem">Không có khoản chi</p>';
}

// ==========================================
//  AUTH SYSTEM
// ==========================================
function checkAuth() {
    var s = sessionStorage.getItem(SESSION_KEY);
    if (!s) { window.location.href = 'login.html'; return false; }
    currentUser = JSON.parse(s);
    // User role is now allowed into admin.html (for expenses access)
    return true;
}
function getEffectivePages(userId, role) {
    var base = (ROLE_PAGES[role] || []).slice();
    var custom = globalPermissions || {};
    var extras = custom[userId] || [];
    extras.forEach(function(p) { if (base.indexOf(p) === -1) base.push(p); });
    return base;
}
function hasPermission(pageId) {
    if (!currentUser) return false;
    if (pageId === 'menu-manager') return currentUser.role !== 'user';
    var effective = getEffectivePages(currentUser.id, currentUser.role);
    return effective.indexOf(pageId) !== -1;
}
function applyPermissions() {
    if (!currentUser) return;
    var allowed = getEffectivePages(currentUser.id, currentUser.role);
    var navMap = {
        'revenue':'nav-revenue','inventory':'nav-inventory','inv-export':'nav-inv-export',
        'expenses':'nav-expenses','summary':'nav-summary','logs':'nav-logs',
        'users':'nav-users','add-item':'nav-add-item','menu-manager':'nav-menu'
    };
    Object.entries(navMap).forEach(function(kv) {
        var el = document.getElementById(kv[1]);
        if (el) el.style.display = allowed.indexOf(kv[0]) !== -1 ? '' : 'none';
    });
}
function showUserBadge() {
    if (!currentUser) return;
    var nameEl = document.getElementById('su-name');
    var roleEl = document.getElementById('su-role');
    var avEl   = document.getElementById('su-avatar');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (roleEl) roleEl.textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
    if (avEl)   avEl.textContent   = currentUser.name.charAt(0).toUpperCase();

    if (currentUser.role === 'user') {
        var navRev = document.getElementById('nav-revenue');
        if (navRev) navRev.innerHTML = '💰 Doanh Thu Hàng Ngày';
    }
}
function doLogout() {
    if (!confirm('Ban co chac muon dang xuat?')) return;
    writeLog('DANG XUAT', 'Dang xuat khoi he thong luc ' + new Date().toLocaleTimeString('vi-VN'));
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

// ==========================================
//  ACTIVITY LOG
// ==========================================
function writeLog(action, detail) {
    if (!currentUser) return;
    var logs = globalLogs || [];
    logs.unshift({
        id: Date.now(), userId: currentUser.id, userName: currentUser.name,
        role: currentUser.role, action: action, detail: detail,
        datetime: new Date().toLocaleString('vi-VN'),
        date: new Date().toISOString().slice(0,10),
        timestamp: Date.now()
    });
    db.ref("logs").set(logs.slice(0, 1000));
}
function renderLogs() {
    var logs     = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    var q        = (document.getElementById('log-search') ? document.getElementById('log-search').value : '').toLowerCase();
    var role     = document.getElementById('log-role-filter') ? document.getElementById('log-role-filter').value : 'all';
    var date     = document.getElementById('log-date-filter') ? document.getElementById('log-date-filter').value : '';
    var filtered = logs.filter(function(l) {
        return (role === 'all' || l.role === role) &&
               (!date || l.date === date) &&
               (!q || l.action.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q));
    });
    var countEl = document.getElementById('log-count');
    var tbody   = document.getElementById('log-table-body');
    var empty   = document.getElementById('log-empty');
    var table   = document.getElementById('log-table');
    if (countEl) countEl.textContent = filtered.length + ' ban ghi';
    if (!filtered.length) { if(table) table.style.display='none'; if(empty) empty.style.display='flex'; return; }
    if(table) table.style.display='table'; if(empty) empty.style.display='none';
    var roleCls = { administrator:'log-badge-adm', admin:'log-badge-adm2', user:'log-badge-usr' };
    tbody.innerHTML = filtered.map(function(l) {
        var parts = l.datetime ? l.datetime.split(',') : ['',''];
        return '<tr><td><strong style="font-size:.85rem">' + (parts[1]||'').trim() + '</strong><br><small style="color:var(--text-muted)">' + l.date + '</small></td>' +
            '<td><strong>' + l.userName + '</strong><br><small style="color:var(--text-muted)">' + l.userId + '</small></td>' +
            '<td><span class="log-role-badge ' + (roleCls[l.role]||'') + '">' + (ROLE_LABELS[l.role]||l.role) + '</span></td>' +
            '<td><span class="log-action-badge">' + l.action + '</span></td>' +
            '<td style="color:var(--text-muted);font-size:.85rem">' + l.detail + '</td></tr>';
    }).join('');
}
function clearLogs() {
    if (!confirm('Xoa toan bo nhat ky? Khong the hoan tac.')) return;
    db.ref("logs").set([]);
    renderLogs();
    showToast('Da xoa nhat ky!');
}

// ==========================================
//  USERS PAGE  (Administrator only)
// ==========================================
function renderUsersPage() {
    var tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    var isAdmin = currentUser && currentUser.role === 'administrator';
    var roleCls = { administrator:'cat-pastry', admin:'cat-smoothie', user:'cat-coffee' };
    var custom  = JSON.parse(localStorage.getItem(CUSTOM_PERMS_KEY) || '{}');

    tbody.innerHTML = SYSTEM_USERS.map(function(u) {
        var isMe = currentUser && u.id === currentUser.id;
        var basePages   = ROLE_PAGES[u.role] || [];
        var customPages = custom[u.id] || [];
        var isOwner = u.role === 'administrator';

        // Permission toggle row (only for non-administrator accounts, only when viewer is administrator)
        var toggleHtml = '';
        if (isAdmin && !isOwner) {
            var chips = GRANTABLE_PAGES.map(function(pg) {
                var inBase   = basePages.indexOf(pg.id)  !== -1;
                var inCustom = customPages.indexOf(pg.id) !== -1;
                var active   = inBase || inCustom;
                var locked   = inBase; // base perms can't be removed
                var cls      = active ? 'perm-chip active' + (locked ? ' locked' : '') : 'perm-chip';
                var onclick  = locked ? '' : ' onclick="toggleCustomPerm(\'' + u.id + '\',\'' + pg.id + '\')"';
                var lockIcon = locked ? '🔒' : '';
                return '<span class="' + cls + '"' + onclick + '>' + lockIcon + pg.label + '</span>';
            }).join('');
            toggleHtml = '<tr class="perm-row-expand"><td colspan="4"><div class="perm-chips-wrap"><span class="perm-chips-label">🔑 Quyền được cấp:</span>' + chips + '</div></td></tr>';
        }

        var mainRow = '<tr' + (isMe ? ' style="background:rgba(212,175,55,.06)"' : '') + '>' +
            '<td><strong>' + u.id + '</strong>' + (isMe ? ' <span style="color:var(--primary);font-size:.75rem">(bạn)</span>' : '') + '</td>' +
            '<td>' + u.name + '</td>' +
            '<td><span class="cat-badge ' + (roleCls[u.role]||'') + '">' + (ROLE_LABELS[u.role]||u.role) + '</span></td>' +
            '<td>' + getEffectivePages(u.id, u.role).length + ' trang • ' +
            (customPages.length > 0 ? '<span style="color:var(--primary);font-size:.78rem">➕ ' + customPages.length + ' quyền thêm</span>' : '<span style="color:var(--text-muted);font-size:.78rem">quyền cơ bản</span>') +
            '</td></tr>';

        return mainRow + toggleHtml;
    }).join('');
}

function toggleCustomPerm(userId, pageId) {
    var custom = globalPermissions || {};
    if (!custom[userId]) custom[userId] = [];
    var idx = custom[userId].indexOf(pageId);
    if (idx !== -1) custom[userId].splice(idx, 1);
    else custom[userId].push(pageId);
    db.ref("permissions").set(custom);
    writeLog('CẤP QUYỀN', 'Cập nhật quyền [' + pageId + '] cho tài khoản ' + userId);
    renderUsersPage();
    showToast('✅ Đã cập nhật quyền!');
}
