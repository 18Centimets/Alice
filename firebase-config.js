// Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDPIg4sK6BWr2kPLEpcypw2qUjg4vnbMJU",
    authDomain: "aura-coffee-3ee07.firebaseapp.com",
    databaseURL: "https://aura-coffee-3ee07-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "aura-coffee-3ee07",
    storageBucket: "aura-coffee-3ee07.firebasestorage.app",
    messagingSenderId: "136520716869",
    appId: "1:136520716869:web:3de7dc8e1f9567bcdc892c"
};

// Khởi tạo Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Biến lưu trữ dữ liệu toàn cục để app sử dụng (Real-time cache)
let globalMenu = null;
let globalRevenue = null;
let globalInventory = null;
let globalInventoryExport = null;
let globalExpenses = null;
let globalLogs = null;
let globalPermissions = null;
let globalTables = null;

// Hàm Migrate dữ liệu từ LocalStorage lên Firebase (Chạy 1 lần đầu)
async function migrateLocalData() {
    try {
        const snap = await db.ref('migrated').once('value');
        if (!snap.exists() || !snap.val()) {
            console.log("Đang đồng bộ dữ liệu từ máy lên mây...");
            
            const menu = JSON.parse(localStorage.getItem('aura_coffee_custom_items') || 'null');
            if (menu) await db.ref('menu').set(menu);
            
            const rev = JSON.parse(localStorage.getItem('aura_coffee_revenue') || 'null');
            if (rev) await db.ref('revenue').set(rev);
            
            const inv = JSON.parse(localStorage.getItem('aura_coffee_inventory') || 'null');
            if (inv) await db.ref('inventory').set(inv);

            const exp = JSON.parse(localStorage.getItem('aura_coffee_expenses') || 'null');
            if (exp) await db.ref('expenses').set(exp);

            const logs = JSON.parse(localStorage.getItem('aura_coffee_logs') || 'null');
            if (logs) await db.ref('logs').set(logs);

            const perms = JSON.parse(localStorage.getItem('aura_coffee_custom_perms') || 'null');
            if (perms) await db.ref('permissions').set(perms);

            const tables = JSON.parse(localStorage.getItem('aura_coffee_tables') || 'null');
            if (tables) await db.ref('tables').set(tables);

            const invExp = JSON.parse(localStorage.getItem('aura_coffee_inventory_export') || 'null');
            if (invExp) await db.ref('inventory_export').set(invExp);

            await db.ref('migrated').set(true);
            console.log("✅ Đồng bộ hoàn tất!");
        }
    } catch(e) {
        console.error("Lỗi đồng bộ Firebase:", e);
    }
}

// REALTIME LISTENERS
db.ref('menu').on('value', snap => {
    globalMenu = snap.val() || null;
    if (typeof allItems !== 'undefined' && typeof renderTable === 'function' && document.getElementById('menu-table-body')) {
        allItems = globalMenu || (typeof defaultMenu !== 'undefined' ? defaultMenu : []);
        renderTable(allItems);
    }
    if (typeof loadProducts === 'function' && document.getElementById('menu-grid')) {
        loadProducts(); // app.js
    }
});

db.ref('revenue').on('value', snap => {
    globalRevenue = snap.val() || [];
    if (typeof renderRevenuePage === 'function' && document.getElementById('rev-date-input')) renderRevenuePage();
});

db.ref('inventory').on('value', snap => {
    globalInventory = snap.val() || [];
    if (typeof renderInventoryTable === 'function' && document.getElementById('inv-table-body')) renderInventoryTable();
});

db.ref('inventory_export').on('value', snap => {
    globalInventoryExport = snap.val() || [];
    if (typeof renderInventoryExportTable === 'function' && document.getElementById('inv-export-table-body')) {
        renderInventoryExportTable();
        if (typeof populateInvExportDropdown === 'function') populateInvExportDropdown();
    }
});

db.ref('expenses').on('value', snap => {
    globalExpenses = snap.val() || [];
    if (typeof renderExpenseList === 'function' && document.getElementById('exp-list')) renderExpenseList();
});

db.ref('logs').on('value', snap => {
    globalLogs = snap.val() || [];
    if (typeof renderLogs === 'function' && document.getElementById('log-table-body')) renderLogs();
});

db.ref('permissions').on('value', snap => {
    globalPermissions = snap.val() || {};
    if (typeof applyPermissions === 'function') applyPermissions();
    if (typeof renderUsersPage === 'function' && document.getElementById('users-table-body')) renderUsersPage();
});

db.ref('tables').on('value', snap => {
    globalTables = snap.val() || {};
    if (typeof tableData !== 'undefined' && typeof renderFloorMap === 'function' && document.getElementById('indoor-tables')) {
        tableData = globalTables;
        renderFloorMap();
        if (typeof activeTableKey !== 'undefined' && activeTableKey && typeof openTablePanel === 'function') {
            const num = activeTableKey.split('-')[1];
            const zone = activeTableKey.split('-')[0];
            openTablePanel(activeTableKey, num, zone);
        }
    }
});
// SHIFTS LISTENER
db.ref('shifts').on('value', snap => {
    globalShifts = snap.val() || [];
    if (typeof updateShiftUI === 'function') updateShiftUI();
    if (typeof renderShifts === 'function') renderShifts();
});

// PROFILES LISTENER
let globalProfiles = null;
db.ref('userProfiles').on('value', snap => {
    globalProfiles = snap.val() || {};
    if (typeof loadProfileUI === 'function') loadProfileUI();
});

// USERS LISTENER (Auth & Management)
let globalUsers = null;
db.ref('users').on('value', snap => {
    globalUsers = snap.val() || null;
    if (typeof renderUsersPage === 'function' && document.getElementById('users-table-body')) renderUsersPage();
});
