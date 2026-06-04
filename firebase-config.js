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
let globalShifts = null;

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

// Helper to convert Firebase Object to Array safely
function firebaseValToArray(val) {
    if (!val) return [];
    if (typeof val === 'object' && !Array.isArray(val)) {
        return Object.values(val);
    }
    return Array.isArray(val) ? val : [];
}

// REALTIME LISTENERS
db.ref('menu').on('value', snap => {
    let val = snap.val();
    if (val && typeof val === 'object' && !Array.isArray(val)) {
        val = Object.values(val);
    }
    globalMenu = Array.isArray(val) ? val : null;
    
    if (typeof allItems !== 'undefined' && typeof renderTable === 'function' && document.getElementById('menu-table-body')) {
        // Don't overwrite allItems while a save is in progress (prevents race condition)
        if (typeof window._isSavingMenu === 'undefined' || !window._isSavingMenu) {
            allItems = globalMenu || (typeof defaultMenu !== 'undefined' ? defaultMenu : []);
        }
        renderTable(allItems);
    }
    if (typeof renderMenu === 'function' && document.getElementById('menu-grid')) {
        menuData = globalMenu || (typeof defaultMenuData !== 'undefined' ? defaultMenuData : []);
        const activeFilter = document.querySelector('.filter-btn.active');
        const cat = activeFilter ? activeFilter.dataset.category : 'all';
        renderMenu(cat === 'all' ? menuData : menuData.filter(i => i.category === cat));
    }
});

db.ref('revenue').on('value', snap => {
    globalRevenue = firebaseValToArray(snap.val());
    if (typeof renderRevenuePage === 'function' && document.getElementById('rev-date-input')) renderRevenuePage();
});

db.ref('inventory').on('value', snap => {
    globalInventory = firebaseValToArray(snap.val());
    if (typeof renderInventoryTable === 'function' && document.getElementById('inv-table-body')) renderInventoryTable();
});

db.ref('inventory_export').on('value', snap => {
    globalInventoryExport = firebaseValToArray(snap.val());
    if (typeof renderInventoryExportTable === 'function' && document.getElementById('inv-export-table-body')) {
        renderInventoryExportTable();
        if (typeof populateInvExportDropdown === 'function') populateInvExportDropdown();
    }
});

db.ref('expenses').on('value', snap => {
    globalExpenses = firebaseValToArray(snap.val());
    if (typeof renderExpenseList === 'function' && document.getElementById('exp-list')) renderExpenseList();
});

db.ref('logs').on('value', snap => {
    globalLogs = firebaseValToArray(snap.val());
    // Sort logs descending by timestamp to keep recent logs on top
    globalLogs.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
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
    globalShifts = firebaseValToArray(snap.val());
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

// ============================================================
// GEMINI AI CONFIGURATION
// ============================================================
const GEMINI_CONFIG = {
    apiKey: "PASTE_YOUR_GEMINI_API_KEY_HERE", // Lấy tại https://aistudio.google.com/
    model: "gemini-2.5-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/",
    maxTokens: 2048,
    temperature: 0.7,
    systemPrompt: `Bạn là "Trợ Lý AI Chà Là Quán" — trợ lý thông minh chuyên về F&B (Thực phẩm & Đồ uống).
Bạn LUÔN LUÔN trả lời hoàn toàn bằng TIẾNG VIỆT. TUYỆT ĐỐI KHÔNG dùng ngôn ngữ khác.

Vai trò của bạn:
- Hướng dẫn nhân viên cách pha chế đồ uống (cà phê, trà, sinh tố, nước ép...)
- Gợi ý combo, upsell cho khách hàng
- Tư vấn thực đơn phù hợp theo sở thích khách (ít đường, nhiều đá, thuần chay...)
- Giải đáp về nguyên liệu, bảo quản, vệ sinh an toàn thực phẩm
- Hỗ trợ tính toán food cost, định giá sản phẩm

Khi trả lời công thức, trình bày rõ ràng:
📋 Nguyên liệu (kèm định lượng chính xác)
🔧 Dụng cụ cần thiết
📝 Các bước thực hiện (đánh số rõ ràng)
💡 Mẹo/Lưu ý quan trọng

Giữ câu trả lời ngắn gọn, dễ hiểu, thực tế. Tối đa 300 từ mỗi câu trả lời.
Dùng emoji phù hợp để sinh động hơn.`
};

/**
 * Gọi Gemini API với lịch sử hội thoại
 * @param {Array} chatHistory - Mảng [{role:'user'|'model', parts:[{text:'...'}]}]
 * @returns {Promise<string>} - Phản hồi từ AI
 */
async function callGeminiAPI(chatHistory) {
    if (GEMINI_CONFIG.apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        return "⚠️ Chưa cấu hình API Key!\n\nVui lòng mở file `firebase-config.js`, tìm dòng `PASTE_YOUR_GEMINI_API_KEY_HERE` và thay bằng API key từ https://aistudio.google.com/";
    }

    const url = `${GEMINI_CONFIG.endpoint}${GEMINI_CONFIG.model}:generateContent?key=${GEMINI_CONFIG.apiKey}`;

    const body = {
        system_instruction: {
            parts: [{ text: GEMINI_CONFIG.systemPrompt }]
        },
        contents: chatHistory,
        generationConfig: {
            maxOutputTokens: GEMINI_CONFIG.maxTokens,
            temperature: GEMINI_CONFIG.temperature
        }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (resp.status === 429) {
            return "⏳ AI đang bận, vui lòng thử lại sau 30 giây...";
        }
        if (resp.status === 403) {
            return "🔑 API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong firebase-config.js";
        }
        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            console.error("Gemini API Error:", resp.status, errData);
            return `❌ Lỗi AI (${resp.status}). Vui lòng thử lại.`;
        }

        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return "🤔 AI không có phản hồi. Vui lòng thử câu hỏi khác.";
        return text;

    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            return "⏱️ Hết thời gian chờ (15s). Kiểm tra kết nối mạng và thử lại.";
        }
        if (!navigator.onLine) {
            return "📡 Không có kết nối mạng. AI cần Internet để hoạt động.";
        }
        console.error("Gemini fetch error:", err);
        return "❌ Không thể kết nối AI. Kiểm tra kết nối mạng và thử lại.";
    }
}
