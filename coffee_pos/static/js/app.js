const API_URL = '';
const VND_DENOMS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];

// State
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let products = [];
let ingredients = [];
let categories = [];
let currentUser = null;
let currentShop = null;
let appliedDiscount = null;

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ========== TOAST SYSTEM ==========
function createToastContainer() {
    if (!document.getElementById('toast-container')) {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.innerHTML = `
            <div id="toast" class="fixed top-4 right-4 z-50 transform translate-x-full transition-transform duration-300">
                <div class="bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
                    <i class="fas fa-check-circle text-green-400"></i>
                    <span id="toast-message"></span>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }
}

function showToast(message, type = 'success') {
    createToastContainer();
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const icon = toast.querySelector('i');
    
    msgEl.textContent = message;
    icon.className = type === 'error' ? 'fas fa-exclamation-circle text-red-400' : 'fas fa-check-circle text-green-400';
    
    toast.classList.remove('translate-x-full');
    setTimeout(() => toast.classList.add('translate-x-full'), 3000);
}

// ========== AUTH ==========
function checkAuth() {
    fetch('/api/auth/me')
        .then(r => r.json())
        .then(data => {
            if (data.error) showLoginPage();
            else {
                currentUser = data.user;
                currentShop = data.shop;
                initApp();
            }
        })
        .catch(() => showLoginPage());
}

function showLoginPage() {
    document.body.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md">
                <div class="text-center mb-6 md:mb-8">
                    <div class="w-16 h-16 md:w-20 md:h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <i class="fas fa-coffee text-2xl md:text-3xl text-white"></i>
                    </div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-800">Coffee POS</h1>
                    <p class="text-gray-500 mt-2 text-sm md:text-base">Quản lý bán hàng đa quán</p>
                </div>
                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="space-y-3 md:space-y-4">
                        <input type="text" name="username" placeholder="Tên đăng nhập" class="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-base" required>
                        <input type="password" name="password" placeholder="Mật khẩu" class="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-base" required>
                    </div>
                    <p id="login-error" class="text-red-500 text-sm mt-3 hidden"></p>
                    <button type="submit" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 md:py-4 rounded-xl font-bold mt-4 md:mt-6 text-base shadow-lg">Đăng nhập</button>
                </form>
                <p class="text-center mt-4 md:mt-6 text-sm text-gray-500">
                    Chưa có tài khoản? <a href="#" onclick="showRegisterPage()" class="text-blue-500 font-medium hover:underline">Đăng ký quán mới</a>
                </p>
            </div>
        </div>`;
    createToastContainer();
}

function showRegisterPage() {
    document.body.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md">
                <div class="text-center mb-6 md:mb-8">
                    <div class="w-16 h-16 md:w-20 md:h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <i class="fas fa-store text-2xl md:text-3xl text-white"></i>
                    </div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-800">Đăng ký quán</h1>
                    <p class="text-gray-500 mt-2 text-sm md:text-base">Tạo quán mới hoàn toàn miễn phí</p>
                </div>
                <form id="register-form" onsubmit="handleRegister(event)">
                    <div class="space-y-3 md:space-y-4">
                        <input type="text" name="shop_name" placeholder="Tên quán" class="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-base" required>
                        <input type="text" name="username" placeholder="Tên đăng nhập" class="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-base" required>
                        <input type="password" name="password" placeholder="Mật khẩu" class="w-full p-3 md:p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-base" required>
                    </div>
                    <p id="register-error" class="text-red-500 text-sm mt-3 hidden"></p>
                    <button type="submit" class="w-full bg-green-500 hover:bg-green-600 text-white py-3 md:py-4 rounded-xl font-bold mt-4 md:mt-6 text-base shadow-lg">Đăng ký</button>
                </form>
                <p class="text-center mt-4 md:mt-6 text-sm text-gray-500">
                    <a href="#" onclick="showLoginPage()" class="text-blue-500 font-medium hover:underline">← Quay lại đăng nhập</a>
                </p>
            </div>
        </div>`;
    createToastContainer();
}

async function handleLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');
    
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
    });
    
    if (res.ok) {
        location.reload();
    } else {
        errorEl.textContent = 'Sai thông tin đăng nhập';
        errorEl.classList.remove('hidden');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('register-error');
    const originalText = btn.textContent;
    
    btn.textContent = 'Đang xử lý...';
    btn.disabled = true;
    errorEl.classList.add('hidden');
    
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
    });
    
    if (res.ok) {
        showToast('Đăng ký thành công! Vui lòng đăng nhập.');
        setTimeout(showLoginPage, 1500);
    } else {
        const err = await res.json();
        errorEl.textContent = err.error || 'Lỗi đăng ký';
        errorEl.classList.remove('hidden');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function logout() {
    await fetch('/api/auth/logout', {method: 'POST'});
    localStorage.removeItem('cart');
    location.reload();
}

// ========== APP INIT ==========
function initApp() {
    document.body.innerHTML = `
        <div id="app" class="h-screen flex flex-col md:flex-row bg-gray-50">
            <!-- Sidebar -->
            <nav class="hidden md:flex md:w-64 bg-white border-r flex-col">
                <div class="p-6">
                    <h1 class="font-bold text-lg mb-6 truncate">${currentShop?.name || 'POS'}</h1>
                    <div class="space-y-1">
                        <button onclick="router.navigate('sales')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" data-page="sales">
                            <i class="fas fa-shopping-cart w-5"></i> Bán hàng
                        </button>
                        <button onclick="router.navigate('products')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" data-page="products">
                            <i class="fas fa-utensils w-5"></i> Sản phẩm
                        </button>
                        <button onclick="router.navigate('categories')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" data-page="categories">
                            <i class="fas fa-tags w-5"></i> Danh mục
                        </button>
                        <button onclick="router.navigate('ingredients')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" data-page="ingredients">
                            <i class="fas fa-boxes w-5"></i> Nguyên liệu
                        </button>
                        <button onclick="router.navigate('stock')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" data-page="stock">
                            <i class="fas fa-history w-5"></i> Nhập kho
                        </button>
                        <button onclick="router.navigate('orders')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" data-page="orders">
                            <i class="fas fa-receipt w-5"></i> Đơn hàng
                        </button>
                        <button onclick="router.navigate('reports')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" data-page="reports">
                            <i class="fas fa-chart-bar w-5"></i> Báo cáo
                        </button>
                        <button onclick="router.navigate('settings')" class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left" data-page="settings">
                            <i class="fas fa-cog w-5"></i> Cài đặt
                        </button>
                    </div>
                </div>
                <div class="mt-auto p-4 border-t">
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <i class="fas fa-user text-gray-500"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-sm truncate">${currentUser?.full_name || currentUser?.username}</p>
                            <p class="text-xs text-gray-500">${currentUser?.role === 'admin' ? 'Admin' : 'Nhân viên'}</p>
                        </div>
                        <button onclick="logout()" class="text-gray-400 hover:text-red-500">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
            </nav>
            
            <!-- Mobile nav -->
            <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50">
                <button onclick="router.navigate('sales')" class="nav-btn-mobile p-2" data-page="sales">
                    <i class="fas fa-shopping-cart text-lg"></i>
                </button>
                <button onclick="router.navigate('products')" class="nav-btn-mobile p-2" data-page="products">
                    <i class="fas fa-utensils text-lg"></i>
                </button>
                <button onclick="router.navigate('orders')" class="nav-btn-mobile p-2" data-page="orders">
                    <i class="fas fa-receipt text-lg"></i>
                </button>
                <button onclick="router.navigate('settings')" class="nav-btn-mobile p-2" data-page="settings">
                    <i class="fas fa-cog text-lg"></i>
                </button>
            </nav>

            <main class="flex-1 overflow-hidden flex flex-col">
                <header class="bg-white border-b px-4 py-3 flex justify-between items-center">
                    <h2 id="page-title" class="text-xl font-bold">Bán hàng</h2>
                    <span id="current-time" class="text-sm text-gray-500"></span>
                </header>
                <div id="page-content" class="flex-1 overflow-y-auto p-4 pb-20 md:pb-4"></div>
            </main>
        </div>
        
        <!-- Modal Container - Full size like image 3 -->
        <div id="modal" class="fixed inset-0 z-50 hidden">
            <div class="absolute inset-0 bg-black/50" onclick="closeModal()"></div>
            <div id="modal-content" class="absolute bg-white rounded-t-2xl md:rounded-2xl bottom-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[500px] shadow-2xl" style="min-height:650px;"></div>
        </div>
    `;
    
    createToastContainer();
    
    setInterval(() => {
        const el = document.getElementById('current-time');
        if(el) el.textContent = new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
    }, 1000);
    
    router.navigate('sales');
}

// ========== ROUTER ==========
const router = {
    currentPage: 'sales',
    navigate(page) {
        this.currentPage = page;
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.dataset.page === page;
            btn.className = `nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'}`;
        });
        document.querySelectorAll('.nav-btn-mobile').forEach(btn => {
            const isActive = btn.dataset.page === page;
            btn.className = `nav-btn-mobile p-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`;
        });
        
        const titles = {
            'sales': 'Bán hàng', 'products': 'Sản phẩm', 'categories': 'Danh mục',
            'ingredients': 'Nguyên liệu', 'stock': 'Lịch sử nhập kho',
            'orders': 'Đơn hàng', 'reports': 'Báo cáo', 'settings': 'Cài đặt'
        };
        document.getElementById('page-title').textContent = titles[page] || '';
        this.loadPage(page);
    },
    loadPage(page) {
        const content = document.getElementById('page-content');
        content.innerHTML = '';
        switch(page) {
            case 'sales': loadSalesPage(content); break;
            case 'products': loadProductsPage(content); break;
            case 'categories': loadCategoriesPage(content); break;
            case 'ingredients': loadIngredientsPage(content); break;
            case 'stock': loadStockHistoryPage(content); break;
            case 'orders': loadOrdersPage(content); break;
            case 'reports': loadReportsPage(content); break;
            case 'settings': loadSettingsPage(content); break;
        }
    }
};

// ========== SALES PAGE ==========
async function loadSalesPage(container) {
    await Promise.all([loadProducts(), loadCategories(), loadIngredients()]);
    
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            <div class="lg:col-span-2 flex flex-col">
                <div class="flex gap-2 mb-4">
                    <div class="flex-1 relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="product-search" placeholder="Tìm sản phẩm..." 
                            class="w-full pl-10 pr-4 py-2 border rounded-xl"
                            oninput="searchProducts(this.value)">
                    </div>
                </div>
                <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button onclick="filterProducts(0)" class="cat-filter px-4 py-2 bg-blue-500 text-white rounded-full text-sm whitespace-nowrap" data-cat="0">Tất cả</button>
                    ${categories.map(c => `<button onclick="filterProducts(${c.id})" class="cat-filter px-4 py-2 bg-gray-100 rounded-full text-sm whitespace-nowrap" data-cat="${c.id}">${c.name}</button>`).join('')}
                </div>
                <div id="products-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1 pb-4 content-start"></div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border flex flex-col h-[calc(100vh-200px)] lg:h-auto">
                <div class="p-4 border-b flex justify-between items-center">
                    <h3 class="font-bold text-lg">Giỏ hàng</h3>
                    <button onclick="clearCart()" class="text-red-500 text-sm">Xóa</button>
                </div>
                <div id="cart-items" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
                <div class="p-4 border-t bg-gray-50 rounded-b-2xl">
                    <button onclick="showDiscountModal()" id="discount-btn" class="w-full mb-3 py-2 text-blue-600 text-sm font-medium border border-blue-200 rounded-lg hover:bg-blue-50">
                        <i class="fas fa-tag mr-2"></i>Thêm mã giảm giá
                    </button>
                    <div id="discount-display" class="hidden mb-3 p-2 bg-green-50 rounded-lg flex justify-between">
                        <span class="text-sm text-green-700">Giảm giá</span>
                        <span class="font-bold text-green-700">-<span id="discount-amount">0</span>đ</span>
                    </div>
                    <div class="flex justify-between mb-2 text-sm">
                        <span class="text-gray-500">Tạm tính</span>
                        <span id="cart-subtotal" class="font-medium">0đ</span>
                    </div>
                    <div class="flex justify-between mb-4 text-lg font-bold">
                        <span>Tổng cộng</span>
                        <span id="cart-total" class="text-blue-600">0đ</span>
                    </div>
                    <button onclick="showCheckoutModal()" id="checkout-btn" disabled class="w-full bg-green-500 text-white py-3 rounded-xl font-bold disabled:bg-gray-300 disabled:cursor-not-allowed">
                        Thanh toán
                    </button>
                </div>
            </div>
        </div>
    `;
    renderProducts();
    updateCartUI();
}

function searchProducts(keyword) {
    if (!keyword.trim()) {
        renderProducts(currentFilter || 0);
        return;
    }
    const filtered = products.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
    renderProductGrid(filtered);
}

let currentFilter = 0;
function filterProducts(catId) {
    currentFilter = catId;
    document.querySelectorAll('.cat-filter').forEach(btn => {
        const active = parseInt(btn.dataset.cat) === catId;
        btn.className = `cat-filter px-4 py-2 rounded-full text-sm whitespace-nowrap ${active ? 'bg-blue-500 text-white' : 'bg-gray-100'}`;
    });
    document.getElementById('product-search').value = '';
    renderProducts(catId);
}

function renderProducts(filterCat = 0) {
    const filtered = filterCat === 0 ? products : products.filter(p => p.category_id === filterCat);
    renderProductGrid(filtered);
}

function renderProductGrid(filtered) {
    const grid = document.getElementById('products-grid');
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">Không tìm thấy sản phẩm</div>';
        return;
    }
    grid.innerHTML = filtered.map(p => `
        <div onclick="addToCart(${p.id})" class="bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer active:scale-95 transition hover:shadow-md">
            <div class="aspect-[4/3] bg-gray-100 relative">
                <img src="${p.image || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover" 
                     onerror="this.src='https://via.placeholder.com/300'" alt="${p.name}">
            </div>
            <div class="p-2">
                <h4 class="font-medium text-sm truncate">${p.name}</h4>
                <p class="text-blue-600 font-bold text-sm">${formatMoney(p.price)}</p>
            </div>
        </div>
    `).join('');
}

// ========== CART ==========
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = cart.find(item => item.product_id === productId);
    if (existing) existing.quantity++;
    else cart.push({product_id: product.id, product_name: product.name, price: product.price, quantity: 1});
    
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.product_id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.product_id !== productId);
        }
        saveCart();
        updateCartUI();
    }
}

function clearCart() {
    cart = [];
    appliedDiscount = null;
    saveCart();
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-items');
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
    const total = Math.max(0, subtotal - discountAmount);
    
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
    if (totalEl) totalEl.textContent = formatMoney(total);
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
    
    const discountDisplay = document.getElementById('discount-display');
    if (discountDisplay) {
        if (appliedDiscount && discountAmount > 0) {
            discountDisplay.classList.remove('hidden');
            document.getElementById('discount-amount').textContent = formatMoney(discountAmount).replace('đ', '');
        } else {
            discountDisplay.classList.add('hidden');
        }
    }
    
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-10"><i class="fas fa-shopping-basket text-4xl mb-2 opacity-30"></i><p>Chưa có sản phẩm</p></div>';
        return;
    }
    container.innerHTML = cart.map(item => `
        <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
            <div class="flex-1">
                <h4 class="font-medium text-sm">${item.product_name}</h4>
                <p class="text-gray-500 text-xs">${formatMoney(item.price)}</p>
            </div>
            <div class="flex items-center gap-2 bg-white rounded-lg border">
                <button onclick="updateQuantity(${item.product_id}, -1)" class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100">-</button>
                <span class="w-8 text-center font-medium text-sm">${item.quantity}</span>
                <button onclick="updateQuantity(${item.product_id}, 1)" class="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100">+</button>
            </div>
        </div>
    `).join('');
}

// ========== DISCOUNT ==========
async function showDiscountModal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Mã giảm giá</h3>
            <div class="flex gap-2">
                <input type="text" id="discount-code" class="flex-1 p-3 border rounded-xl uppercase" placeholder="Nhập mã">
                <button onclick="applyDiscount(${subtotal})" class="px-6 bg-blue-500 text-white rounded-xl">Áp dụng</button>
            </div>
            <p id="discount-error" class="text-red-500 text-sm mt-2 hidden"></p>
        </div>
    `);
}

async function applyDiscount(subtotal) {
    const code = document.getElementById('discount-code').value.trim();
    const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code, order_total: subtotal})
    });
    const result = await res.json();
    if (result.valid) {
        appliedDiscount = {code: result.discount.code, amount: result.discount_amount};
        updateCartUI();
        closeModal();
        showToast(`Đã áp dụng giảm ${formatMoney(result.discount_amount)}`);
    } else {
        document.getElementById('discount-error').textContent = result.error;
        document.getElementById('discount-error').classList.remove('hidden');
    }
}

// ========== CHECKOUT ==========
function showCheckoutModal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
    const total = Math.max(0, subtotal - discountAmount);
    
    // Tạo mảng gợi ý tiền mặt - chỉ 4 nút
    const suggestions = [];
    suggestions.push({label: formatMoney(total), amount: total});
    
    const common = [50000, 100000, 200000, 500000];
    for (let amt of common) {
        if (amt > total && suggestions.length < 4) {
            suggestions.push({label: formatMoney(amt), amount: amt});
        }
    }
    
    // Đặt chiều cao tự động cho modal
    const modalContent = document.getElementById('modal-content');
    modalContent.style.height = 'auto';
    modalContent.style.maxHeight = 'none';
    
    showModal(`
        <div class="bg-white w-full" style="min-height:600px;">
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Thanh toán</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>
                
                <div class="text-center mb-5">
                    <p class="text-gray-500 text-sm mb-1">Tổng thanh toán</p>
                    <p class="text-4xl font-bold text-blue-600">${formatMoney(total)}</p>
                    ${discountAmount > 0 ? `<p class="text-sm text-green-600 mt-1">Đã giảm: ${formatMoney(discountAmount)}</p>` : ''}
                </div>
                
                <div class="grid grid-cols-3 gap-3 mb-5">
                    <button onclick="selectPayment(this, 'cash')" class="payment-btn p-4 border-2 border-blue-500 bg-blue-50 rounded-xl text-center" data-method="cash">
                        <i class="fas fa-money-bill-wave text-2xl mb-2 text-blue-500"></i>
                        <p class="text-sm font-medium">Tiền mặt</p>
                    </button>
                    <button onclick="selectPayment(this, 'card')" class="payment-btn p-4 border-2 border-gray-200 rounded-xl text-center" data-method="card">
                        <i class="fas fa-credit-card text-2xl mb-2 text-gray-400"></i>
                        <p class="text-sm font-medium">Thẻ</p>
                    </button>
                    <button onclick="selectPayment(this, 'transfer')" class="payment-btn p-4 border-2 border-gray-200 rounded-xl text-center" data-method="transfer">
                        <i class="fas fa-check-circle text-2xl mb-2 text-gray-400"></i>
                        <p class="text-sm font-medium">Chuyển khoản</p>
                    </button>
                </div>
                
                <div id="cash-section">
                    <label class="block text-sm font-medium mb-2">Tiền khách đưa</label>
                    <input type="number" id="cash-received" class="w-full p-4 text-2xl text-center border-2 border-gray-200 rounded-xl mb-3 bg-gray-50" placeholder="0" oninput="calculateChange(${total})">
                    <div class="grid grid-cols-4 gap-2 mb-4">
                        ${suggestions.map(s => `<button type="button" onclick="setCash(${s.amount}, ${total})" class="py-3 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">${s.label}</button>`).join('')}
                    </div>
                    <div class="p-4 bg-green-50 rounded-xl text-center mb-5">
                        <p class="text-sm text-gray-600 mb-1">Tiền thối</p>
                        <p id="change-amount" class="text-3xl font-bold text-green-600">0đ</p>
                    </div>
                </div>
                
                <div class="mb-5">
                    <label class="block text-sm font-medium mb-2">Ghi chú</label>
                    <input type="text" id="order-note" class="w-full p-3 border rounded-xl" placeholder="Ghi chú đơn hàng (tùy chọn)">
                </div>
                
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal()" class="flex-1 py-4 border-2 border-gray-300 rounded-xl font-medium bg-white hover:bg-gray-50">Hủy</button>
                    <button type="button" onclick="processCheckout(${total})" class="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg">Xác nhận thanh toán</button>
                </div>
            </div>
        </div>
    `);
    window.selectedPayment = 'cash';
}

function selectPayment(btn, method) {
    document.querySelectorAll('.payment-btn').forEach(b => {
        b.className = 'payment-btn p-4 border-2 border-gray-200 rounded-xl text-center';
        b.querySelector('i').classList.remove('text-blue-500');
        b.querySelector('i').classList.add('text-gray-400');
    });
    btn.className = 'payment-btn p-4 border-2 border-blue-500 bg-blue-50 rounded-xl text-center';
    btn.querySelector('i').classList.remove('text-gray-400');
    btn.querySelector('i').classList.add('text-blue-500');
    window.selectedPayment = method;
    
    const cashSection = document.getElementById('cash-section');
    if (cashSection) {
        cashSection.style.display = method === 'cash' ? 'block' : 'none';
    }
}

function setCash(amount, total) {
    document.getElementById('cash-received').value = amount;
    calculateChange(total);
}

function calculateChange(total) {
    const received = parseInt(document.getElementById('cash-received').value) || 0;
    const change = received - total;
    document.getElementById('change-amount').textContent = formatMoney(change > 0 ? change : 0);
}

async function processCheckout(total) {
    const btn = document.querySelector('button[onclick^="processCheckout"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xử lý...';
    }
    
    try {
        const note = document.getElementById('order-note')?.value || '';
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                items: cart,
                subtotal: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
                total_amount: total,
                discount_amount: appliedDiscount ? appliedDiscount.amount : 0,
                discount_code: appliedDiscount ? appliedDiscount.code : '',
                payment_method: window.selectedPayment || 'cash',
                note: note
            })
        });
        
        if (res.ok) {
            const order = await res.json();
            cart = [];
            appliedDiscount = null;
            saveCart();
            closeModal();
            showToast('Thanh toán thành công!');
            showReceipt(order);
        } else {
            const err = await res.json();
            showToast(err.error || 'Lỗi thanh toán', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Xác nhận thanh toán';
            }
        }
    } catch (err) {
        console.error('Checkout error:', err);
        showToast('Lỗi kết nối server', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Xác nhận thanh toán';
        }
    }
}

function showReceipt(order) {
    const items = order.items.map(i => `
        <div class="flex justify-between py-1 text-sm">
            <span>${i.product_name} x${i.quantity}</span>
            <span>${formatMoney(i.subtotal)}</span>
        </div>
    `).join('');
    
    showModal(`
        <div class="p-5 overflow-y-auto flex-1">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold">Hóa đơn ${order.order_code}</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl mb-4 font-mono text-sm">
                <div class="text-center mb-4 border-b border-dashed border-gray-300 pb-4">
                    <h4 class="font-bold text-lg">${currentShop?.name || 'SHOP'}</h4>
                    <p class="text-gray-500 text-xs">${currentShop?.address || ''}</p>
                    <p class="text-gray-500 text-xs">${currentShop?.phone || ''}</p>
                    <p class="text-gray-500 mt-2">${order.created_at}</p>
                </div>
                <div class="mb-2 pb-2 border-b border-dashed border-gray-300">
                    <p>KH: ${order.customer_name}</p>
                </div>
                ${items}
                <div class="border-t border-dashed border-gray-300 mt-2 pt-2">
                    <div class="flex justify-between">
                        <span>Tạm tính:</span>
                        <span>${formatMoney(order.subtotal)}</span>
                    </div>
                    ${order.discount_amount > 0 ? `
                    <div class="flex justify-between text-green-600">
                        <span>Giảm giá:</span>
                        <span>-${formatMoney(order.discount_amount)}</span>
                    </div>` : ''}
                    <div class="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                        <span>TỔNG CỘNG</span>
                        <span>${formatMoney(order.total_amount)}</span>
                    </div>
                    <div class="flex justify-between text-xs mt-2">
                        <span>Thanh toán: ${order.payment_method_text}</span>
                    </div>
                </div>
                <div class="text-center mt-4 text-gray-500 text-xs">
                    ${currentShop?.receipt_footer || 'Cảm ơn quý khách!'}
                </div>
            </div>
        </div>
        <div class="p-5 border-t flex gap-3">
            <button onclick="closeModal()" class="flex-1 py-3 border border-gray-200 rounded-xl font-medium">Đóng</button>
            <button onclick="window.print()" class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium">
                <i class="fas fa-print mr-2"></i>In hóa đơn
            </button>
        </div>
    `);
}

// ========== PRODUCTS PAGE ==========
async function loadProductsPage(container) {
    await loadProducts();
    await loadCategories();
    await loadIngredients();
    
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">Danh sách sản phẩm (${products.length})</h3>
            <button onclick="showAddProductModal()" class="bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
                <i class="fas fa-plus"></i> Thêm mới
            </button>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50">
                        <tr class="text-sm">
                            <th class="text-left p-3 font-medium text-gray-600">Sản phẩm</th>
                            <th class="text-left p-3 font-medium text-gray-600">Danh mục</th>
                            <th class="text-left p-3 font-medium text-gray-600">Công thức</th>
                            <th class="text-right p-3 font-medium text-gray-600">Giá</th>
                            <th class="text-center p-3 font-medium text-gray-600" style="width:100px">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(p => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="p-3">
                                    <div class="flex items-center gap-3">
                                        <img src="${p.image || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-lg object-cover bg-gray-100">
                                        <span class="font-medium">${p.name}</span>
                                    </div>
                                </td>
                                <td class="p-3">
                                    <span class="px-2 py-1 bg-gray-100 rounded text-sm">${p.category_name || '-'}</span>
                                </td>
                                <td class="p-3 text-sm text-gray-500">
                                    ${p.recipe && p.recipe.length > 0 
                                        ? p.recipe.map(r => `${r.ingredient_name}: ${r.amount}${r.unit}`).join(', ')
                                        : '<span class="text-orange-500">Chưa có công thức</span>'}
                                </td>
                                <td class="p-3 text-right font-bold text-blue-600">${formatMoney(p.price)}</td>
                                <td class="p-3 text-center">
                                    <button onclick="editProduct(${p.id})" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg mr-1" title="Sửa"><i class="fas fa-edit"></i></button>
                                    <button onclick="deleteProduct(${p.id})" class="text-red-500 hover:bg-red-50 p-2 rounded-lg" title="Xóa"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function editProduct(id) {
    const p = products.find(x => x.id === id);
    const recipeRes = await fetch(`/api/products/${id}/recipe`);
    const recipe = await recipeRes.json();
    
    // Tạo form recipe items
    let recipeHtml = '';
    if (recipe.length > 0) {
        recipeHtml = recipe.map((r, idx) => `
            <div class="flex gap-2 mb-2 recipe-item" data-index="${idx}">
                <select class="recipe-ingredient flex-1 p-2 border rounded-lg text-sm">
                    ${ingredients.map(ing => `<option value="${ing.id}" ${ing.id === r.ingredient_id ? 'selected' : ''}>${ing.name}</option>`).join('')}
                </select>
                <input type="number" step="0.01" class="recipe-amount w-20 p-2 border rounded-lg text-sm" value="${r.amount}" placeholder="SL">
                <button onclick="this.parentElement.remove()" class="text-red-500 px-2"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }
    
    showModal(`
        <div class="p-5 overflow-y-auto flex-1" style="max-height:70vh">
            <h3 class="text-lg font-bold mb-4">Sửa sản phẩm</h3>
            <form id="edit-product-form" onsubmit="handleEditProduct(event, ${id})">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Tên sản phẩm</label>
                    <input type="text" name="name" value="${p.name}" class="w-full p-3 border rounded-xl" required>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Giá bán</label>
                        <input type="number" name="price" value="${p.price}" class="w-full p-3 border rounded-xl" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Danh mục</label>
                        <select name="category_id" class="w-full p-3 border rounded-xl">
                            ${categories.map(c => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Hình ảnh</label>
                    <div class="flex items-center gap-4 mb-3">
                        <img id="preview-image" src="${p.image || 'https://via.placeholder.com/80'}" class="w-20 h-20 rounded-lg object-cover bg-gray-100">
                        <div class="flex-1 space-y-2">
                            <label class="block p-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500">
                                <i class="fas fa-cloud-upload-alt text-gray-400"></i>
                                <span class="text-sm text-gray-500 ml-2">Tải ảnh từ máy</span>
                                <input type="file" name="image_file" accept="image/*" class="hidden" onchange="previewImage(event)">
                            </label>
                            <input type="text" name="image_url" id="image-url-input" value="${p.image || ''}" placeholder="Hoặc nhập link ảnh..." class="w-full p-2 border rounded-lg text-sm" onchange="previewExternalImage(this.value)">
                        </div>
                    </div>
                </div>
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-medium">Công thức (nguyên liệu)</label>
                        <button type="button" onclick="addRecipeItem()" class="text-blue-500 text-sm"><i class="fas fa-plus"></i> Thêm nguyên liệu</button>
                    </div>
                    <div id="recipe-list" class="space-y-2">
                        ${recipeHtml}
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Nguyên liệu sẽ bị trừ khi bán sản phẩm</p>
                </div>
            </form>
        </div>
        <div class="p-5 border-t bg-gray-50 flex gap-3">
            <button onclick="closeModal()" class="flex-1 py-3 border border-gray-300 rounded-xl font-medium bg-white">Hủy</button>
            <button onclick="submitEditProduct(${id})" class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold">Lưu</button>
        </div>
    `);
}

function addRecipeItem() {
    const container = document.getElementById('recipe-list');
    const div = document.createElement('div');
    div.className = 'flex gap-2 mb-2 recipe-item';
    div.innerHTML = `
        <select class="recipe-ingredient flex-1 p-2 border rounded-lg text-sm">
            ${ingredients.map(ing => `<option value="${ing.id}">${ing.name}</option>`).join('')}
        </select>
        <input type="number" step="0.01" class="recipe-amount w-20 p-2 border rounded-lg text-sm" placeholder="SL">
        <button onclick="this.parentElement.remove()" class="text-red-500 px-2"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);
}

function getRecipeFromForm() {
    const items = [];
    document.querySelectorAll('.recipe-item').forEach(item => {
        const ingId = item.querySelector('.recipe-ingredient')?.value;
        const amount = parseFloat(item.querySelector('.recipe-amount')?.value);
        if (ingId && amount > 0) {
            items.push({ingredient_id: parseInt(ingId), amount});
        }
    });
    return items;
}

async function submitEditProduct(id) {
    const form = document.getElementById('edit-product-form');
    const formData = new FormData(form);
    
    let imageUrl = formData.get('image_url') || '';
    const imageFile = formData.get('image_file');
    if (imageFile && imageFile.size > 0) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await fetch('/api/upload', {method: 'POST', body: uploadData});
        const uploadResult = await uploadRes.json();
        imageUrl = uploadResult.url;
    }
    
    const data = {
        name: formData.get('name'),
        price: parseInt(formData.get('price')),
        category_id: parseInt(formData.get('category_id')),
        image: imageUrl,
        recipe: getRecipeFromForm()
    };
    
    const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        showToast('Đã cập nhật');
        closeModal();
        router.loadPage('products');
    }
}

async function handleEditProduct(e, id) {
    e.preventDefault();
    await submitEditProduct(id);
}

async function deleteProduct(id) {
    if (!confirm('Xóa sản phẩm này?')) return;
    await fetch(`/api/products/${id}`, {method: 'DELETE'});
    router.loadPage('products');
}

function showAddProductModal() {
    showModal(`
        <div class="p-5 overflow-y-auto flex-1" style="max-height:70vh">
            <h3 class="text-lg font-bold mb-4">Thêm sản phẩm mới</h3>
            <form id="add-product-form" onsubmit="handleAddProduct(event)">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Tên sản phẩm</label>
                    <input type="text" name="name" class="w-full p-3 border rounded-xl" required>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Giá bán</label>
                        <input type="number" name="price" class="w-full p-3 border rounded-xl" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Danh mục</label>
                        <select name="category_id" class="w-full p-3 border rounded-xl">
                            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Hình ảnh</label>
                    <div class="flex items-center gap-4 mb-3">
                        <img id="preview-image" src="https://via.placeholder.com/80" class="w-20 h-20 rounded-lg object-cover bg-gray-100">
                        <div class="flex-1 space-y-2">
                            <label class="block p-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500">
                                <i class="fas fa-cloud-upload-alt text-gray-400"></i>
                                <span class="text-sm text-gray-500 ml-2">Tải ảnh từ máy</span>
                                <input type="file" name="image_file" accept="image/*" class="hidden" onchange="previewImage(event)">
                            </label>
                            <input type="text" name="image_url" id="image-url-input" placeholder="Hoặc nhập link ảnh..." class="w-full p-2 border rounded-lg text-sm" onchange="previewExternalImage(this.value)">
                        </div>
                    </div>
                </div>
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-medium">Công thức (nguyên liệu)</label>
                        <button type="button" onclick="addRecipeItem()" class="text-blue-500 text-sm"><i class="fas fa-plus"></i> Thêm nguyên liệu</button>
                    </div>
                    <div id="recipe-list" class="space-y-2"></div>
                    <p class="text-xs text-gray-500 mt-2">Nguyên liệu sẽ bị trừ khi bán sản phẩm</p>
                </div>
            </form>
        </div>
        <div class="p-5 border-t bg-gray-50 flex gap-3">
            <button onclick="closeModal()" class="flex-1 py-3 border border-gray-300 rounded-xl font-medium bg-white">Hủy</button>
            <button onclick="submitAddProduct()" class="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold">Thêm</button>
        </div>
    `);
}

async function submitAddProduct() {
    const form = document.getElementById('add-product-form');
    const formData = new FormData(form);
    
    let imageUrl = formData.get('image_url') || '';
    const imageFile = formData.get('image_file');
    if (imageFile && imageFile.size > 0) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadRes = await fetch('/api/upload', {method: 'POST', body: uploadData});
        const uploadResult = await uploadRes.json();
        imageUrl = uploadResult.url;
    }
    
    const data = {
        name: formData.get('name'),
        price: parseInt(formData.get('price')),
        category_id: parseInt(formData.get('category_id')),
        image: imageUrl,
        recipe: getRecipeFromForm()
    };
    
    const res = await fetch('/api/products', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        showToast('Thêm thành công');
        closeModal();
        router.loadPage('products');
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    await submitAddProduct();
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => document.getElementById('preview-image').src = e.target.result;
        reader.readAsDataURL(file);
    }
}

function previewExternalImage(url) {
    if (url && url.startsWith('http')) {
        document.getElementById('preview-image').src = url;
    }
}

// ========== CATEGORIES PAGE ==========
async function loadCategoriesPage(container) {
    await loadCategories();
    
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">Danh mục sản phẩm (${categories.length})</h3>
            <button onclick="showAddCategoryModal()" class="bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
                <i class="fas fa-plus"></i> Thêm
            </button>
        </div>
        <div class="grid gap-3">
            ${categories.map(c => `
                <div class="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                    <span class="font-medium">${c.name}</span>
                    <div>
                        <button onclick="editCategory(${c.id}, '${c.name}')" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg mr-1"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteCategory(${c.id})" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showAddCategoryModal() {
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Thêm danh mục</h3>
            <form onsubmit="handleAddCategory(event)">
                <input type="text" name="name" placeholder="Tên danh mục" class="w-full p-3 border rounded-xl mb-4" required>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 border border-gray-200 rounded-xl">Hủy</button>
                    <button type="submit" class="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold">Thêm</button>
                </div>
            </form>
        </div>
    `);
}

async function handleAddCategory(e) {
    e.preventDefault();
    await fetch('/api/categories', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
    });
    closeModal();
    router.loadPage('categories');
}

async function editCategory(id, name) {
    const newName = prompt('Tên danh mục mới:', name);
    if (newName && newName !== name) {
        await fetch(`/api/categories/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: newName})
        });
        router.loadPage('categories');
    }
}

async function deleteCategory(id) {
    if (!confirm('Xóa danh mục này?')) return;
    const res = await fetch(`/api/categories/${id}`, {method: 'DELETE'});
    if (!res.ok) {
        const err = await res.json();
        showToast(err.error, 'error');
    } else router.loadPage('categories');
}

// ========== INGREDIENTS PAGE ==========
async function loadIngredientsPage(container) {
    await loadIngredients();
    
    const totalValue = ingredients.reduce((sum, i) => sum + (i.stock_quantity * i.avg_cost), 0);
    
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">Quản lý nguyên liệu</h3>
            <button onclick="showAddIngredientModal()" class="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm">+ Thêm mới</button>
        </div>
        <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4">
            <div class="flex justify-between">
                <div>
                    <p class="text-sm text-blue-600">Tổng giá trị kho</p>
                    <p class="text-2xl font-bold text-blue-800">${formatMoney(totalValue)}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-blue-600">Số loại</p>
                    <p class="text-2xl font-bold text-blue-800">${ingredients.length}</p>
                </div>
            </div>
        </div>
        <div class="grid gap-3">
            ${ingredients.map(i => {
                const isLow = i.stock_quantity <= i.reorder_level;
                return `
                <div class="bg-white p-4 rounded-xl shadow-sm border ${isLow ? 'border-red-200' : ''}">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-medium">${i.name}</span>
                                ${isLow ? '<span class="text-xs px-2 py-0.5 bg-red-500 text-white rounded">Sắp hết</span>' : ''}
                            </div>
                            <p class="text-sm text-gray-500">Tồn: ${i.stock_quantity} ${i.unit}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm">${formatMoney(i.avg_cost)}/${i.unit}</p>
                            <p class="text-xs text-gray-400">Giá trị: ${formatMoney(i.stock_quantity * i.avg_cost)}</p>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button onclick="showImportModal(${i.id}, '${i.name}')" class="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm">
                            <i class="fas fa-plus"></i> Nhập thêm
                        </button>
                        <button onclick="viewIngredientHistory(${i.id})" class="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                            <i class="fas fa-history"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

function showAddIngredientModal() {
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Thêm nguyên liệu mới</h3>
            <form onsubmit="handleAddIngredient(event)">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Tên nguyên liệu</label>
                    <input type="text" name="name" class="w-full p-3 border rounded-xl" required>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Đơn vị</label>
                        <select name="unit" class="w-full p-3 border rounded-xl">
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="l">lít</option>
                            <option value="ml">ml</option>
                            <option value="quả">quả</option>
                            <option value="hộp">hộp</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Cảnh báo khi dưới</label>
                        <input type="number" step="0.01" name="reorder_level" value="10" class="w-full p-3 border rounded-xl">
                    </div>
                </div>
                <p class="text-xs text-gray-500 mb-4">Lưu ý: Sau khi tạo, cần nhập kho để thêm số lượng.</p>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 border border-gray-200 rounded-xl">Hủy</button>
                    <button type="submit" class="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold">Thêm</button>
                </div>
            </form>
        </div>
    `);
}

async function handleAddIngredient(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.reorder_level = parseFloat(data.reorder_level);
    
    const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        showToast('Thêm thành công! Vui lòng nhập kho.');
        closeModal();
        router.loadPage('ingredients');
    } else {
        const err = await res.json();
        showToast(err.error, 'error');
    }
}

function showImportModal(id, name) {
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Nhập kho: ${name}</h3>
            <form onsubmit="handleImportStock(event, ${id})">
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Số lượng</label>
                        <input type="number" step="0.01" name="quantity" class="w-full p-3 border rounded-xl" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Đơn giá</label>
                        <input type="number" name="unit_cost" class="w-full p-3 border rounded-xl" required>
                    </div>
                </div>
                <div class="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">Tổng tiền: <span id="import-total" class="font-bold">0đ</span></p>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">Ghi chú</label>
                    <input type="text" name="note" class="w-full p-3 border rounded-xl" placeholder="VD: Nhập đầu tháng">
                </div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 border border-gray-200 rounded-xl">Hủy</button>
                    <button type="submit" class="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold">Nhập kho</button>
                </div>
            </form>
        </div>
    `);
    
    setTimeout(() => {
        const qtyInput = document.querySelector('input[name="quantity"]');
        const costInput = document.querySelector('input[name="unit_cost"]');
        const totalEl = document.getElementById('import-total');
        function updateTotal() {
            const qty = parseFloat(qtyInput.value) || 0;
            const cost = parseFloat(costInput.value) || 0;
            totalEl.textContent = formatMoney(qty * cost);
        }
        qtyInput.addEventListener('input', updateTotal);
        costInput.addEventListener('input', updateTotal);
    }, 100);
}

async function handleImportStock(e, id) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        quantity: parseFloat(formData.get('quantity')),
        unit_cost: parseFloat(formData.get('unit_cost')),
        note: formData.get('note')
    };
    
    if (data.quantity <= 0) {
        showToast('Số lượng phải > 0', 'error');
        return;
    }
    
    const res = await fetch(`/api/ingredients/${id}/stock`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        showToast(`Nhập kho thành công! Tổng: ${formatMoney(data.quantity * data.unit_cost)}`);
        closeModal();
        router.loadPage('ingredients');
    }
}

async function viewIngredientHistory(id) {
    const res = await fetch(`/api/ingredients/${id}/stock`);
    const entries = await res.json();
    
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Lịch sử nhập/xuất</h3>
            <div class="space-y-2 max-h-96 overflow-y-auto">
                ${entries.length === 0 ? '<p class="text-gray-500 text-center py-4">Chưa có lịch sử</p>' : ''}
                ${entries.map(e => `
                    <div class="p-3 ${e.quantity > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg">
                        <div class="flex justify-between">
                            <span class="font-medium ${e.quantity > 0 ? 'text-green-600' : 'text-red-600'}">${e.quantity > 0 ? '+' : ''}${e.quantity}</span>
                            <span class="font-bold">${formatMoney(e.total_cost)}</span>
                        </div>
                        <p class="text-xs text-gray-500">${e.note} · ${e.created_at}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `);
}

// ========== STOCK HISTORY PAGE ==========
let currentStockFilter = 'all'; // all, today, week, month

async function loadStockHistoryPage(container, filter = 'all', startDate = '', endDate = '') {
    currentStockFilter = filter;
    
    // Xây dựng URL với filter
    let url = '/api/stock/history';
    const params = new URLSearchParams();
    if (filter !== 'all') params.append('filter', filter);
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    if (params.toString()) url += '?' + params.toString();
    
    const res = await fetch(url);
    const entries = await res.json();
    
    // Tính tổng nhập/xuất
    const totalImport = entries.filter(e => e.quantity > 0).reduce((sum, e) => sum + e.total_cost, 0);
    const totalExport = entries.filter(e => e.quantity < 0).reduce((sum, e) => sum + Math.abs(e.total_cost), 0);
    
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">Lịch sử nhập kho</h3>
        </div>
        
        <!-- Filter buttons -->
        <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button onclick="loadStockHistoryPage(document.getElementById('page-content'), 'all')" class="px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'}">Tất cả</button>
            <button onclick="loadStockHistoryPage(document.getElementById('page-content'), 'today')" class="px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-100'}">Hôm nay</button>
            <button onclick="loadStockHistoryPage(document.getElementById('page-content'), 'week')" class="px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-100'}">Tuần này</button>
            <button onclick="loadStockHistoryPage(document.getElementById('page-content'), 'month')" class="px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-100'}">Tháng này</button>
            <button onclick="showStockDateFilter()" class="px-4 py-2 rounded-full text-sm whitespace-nowrap bg-gray-100 hover:bg-gray-200"><i class="fas fa-calendar mr-1"></i>Tùy chọn</button>
        </div>
        
        <!-- Summary -->
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-green-50 border border-green-200 p-4 rounded-xl">
                <p class="text-sm text-green-600">Tổng nhập</p>
                <p class="text-xl font-bold text-green-800">${formatMoney(totalImport)}</p>
            </div>
            <div class="bg-red-50 border border-red-200 p-4 rounded-xl">
                <p class="text-sm text-red-600">Tổng xuất</p>
                <p class="text-xl font-bold text-red-800">${formatMoney(totalExport)}</p>
            </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50">
                        <tr class="text-sm">
                            <th class="text-left p-3">Nguyên liệu</th>
                            <th class="text-right p-3">SL</th>
                            <th class="text-right p-3">Thành tiền</th>
                            <th class="text-left p-3">Loại</th>
                            <th class="text-left p-3">Ghi chú</th>
                            <th class="text-left p-3">Thời gian</th>
                            <th class="text-center p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entries.length === 0 ? '<tr><td colspan="7" class="p-8 text-center text-gray-500">Không có dữ liệu</td></tr>' : ''}
                        ${entries.map(e => `
                            <tr class="border-t ${e.entry_type === 'sale' ? 'bg-red-50/50' : e.entry_type === 'return' ? 'bg-blue-50/50' : ''}">
                                <td class="p-3">${e.ingredient_name}</td>
                                <td class="p-3 text-right ${e.quantity > 0 ? 'text-green-600' : 'text-red-600'}">${e.quantity > 0 ? '+' : ''}${e.quantity}</td>
                                <td class="p-3 text-right">${formatMoney(e.total_cost)}</td>
                                <td class="p-3 text-sm">
                                    <span class="px-2 py-0.5 rounded text-xs ${e.entry_type === 'import' ? 'bg-green-100 text-green-700' : e.entry_type === 'sale' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}">
                                        ${e.entry_type === 'import' ? 'Nhập' : e.entry_type === 'sale' ? 'Bán' : 'Hoàn'}
                                    </span>
                                </td>
                                <td class="p-3 text-sm text-gray-500">${e.note}</td>
                                <td class="p-3 text-sm text-gray-500">${e.created_at}</td>
                                <td class="p-3 text-center">
                                    ${e.entry_type === 'import' ? `<button onclick="cancelStockEntry(${e.id})" class="text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm" title="Hủy nhập kho"><i class="fas fa-undo"></i></button>` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function showStockDateFilter() {
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Lọc theo thờ gian</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Từ ngày</label>
                    <input type="date" id="stock-start-date" class="w-full p-3 border rounded-xl">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Đến ngày</label>
                    <input type="date" id="stock-end-date" class="w-full p-3 border rounded-xl">
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="closeModal()" class="flex-1 py-3 border border-gray-300 rounded-xl">Hủy</button>
                <button onclick="applyStockDateFilter()" class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold">Áp dụng</button>
            </div>
        </div>
    `);
}

function applyStockDateFilter() {
    const start = document.getElementById('stock-start-date').value;
    const end = document.getElementById('stock-end-date').value;
    if (!start || !end) {
        showToast('Vui lòng chọn đầy đủ ngày', 'error');
        return;
    }
    closeModal();
    loadStockHistoryPage(document.getElementById('page-content'), 'custom', start, end);
}

async function cancelStockEntry(entryId) {
    if (!confirm('Hủy phiếu nhập kho này? Nguyên liệu sẽ bị trừ khỏi kho.')) return;
    
    const res = await fetch(`/api/stock/entries/${entryId}/cancel`, {method: 'POST'});
    if (res.ok) {
        showToast('Đã hủy phiếu nhập kho');
        router.loadPage('stock');
    } else {
        const err = await res.json();
        showToast(err.error || 'Không thể hủy', 'error');
    }
}

// ========== ORDERS PAGE ==========
async function loadOrdersPage(container) {
    try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    
    if (!data.items) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">Chưa có đơn hàng nào</div>';
        return;
    }
    
    const completedOrders = data.items.filter(o => o.status === 'completed');
    const cancelledOrders = data.items.filter(o => o.status === 'cancelled');
    
    container.innerHTML = `
        <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-white p-4 rounded-xl shadow-sm border text-center">
                <p class="text-2xl font-bold">${completedOrders.length}</p>
                <p class="text-sm text-gray-500">Đơn hoàn thành</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border text-center">
                <p class="text-2xl font-bold text-red-500">${cancelledOrders.length}</p>
                <p class="text-sm text-gray-500">Đơn đã hủy</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border text-center">
                <p class="text-2xl font-bold text-blue-600">${formatMoney(completedOrders.reduce((s, o) => s + o.total_amount, 0))}</p>
                <p class="text-sm text-gray-500">Doanh thu</p>
            </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50">
                        <tr class="text-sm">
                            <th class="text-left p-3">Mã đơn</th>
                            <th class="text-left p-3">Thời gian</th>
                            <th class="text-left p-3">Khách hàng</th>
                            <th class="text-left p-3">Thanh toán</th>
                            <th class="text-right p-3">Tổng tiền</th>
                            <th class="text-left p-3">Trạng thái</th>
                            <th class="text-center p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(o => `
                            <tr class="border-t hover:bg-gray-50 ${o.status === 'cancelled' ? 'opacity-60 bg-gray-50' : ''}">
                                <td class="p-3 font-medium">${o.order_code}</td>
                                <td class="p-3 text-sm text-gray-500">${o.created_at}</td>
                                <td class="p-3">${o.customer_name}</td>
                                <td class="p-3">
                                    <span class="px-2 py-1 rounded-full text-xs ${o.payment_method === 'cash' ? 'bg-green-100 text-green-700' : o.payment_method === 'transfer' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">
                                        ${o.payment_method_text}
                                    </span>
                                </td>
                                <td class="p-3 text-right font-bold">${formatMoney(o.total_amount)}</td>
                                <td class="p-3">
                                    <span class="px-2 py-1 rounded-full text-xs ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                        ${o.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                                    </span>
                                </td>
                                <td class="p-3 text-center">
                                    <button onclick="viewOrderDetail(${o.id})" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg mr-1" title="Xem"><i class="fas fa-eye"></i></button>
                                    ${currentUser?.role === 'admin' && o.status === 'completed' ? `<button onclick="cancelOrder(${o.id})" class="text-red-500 hover:bg-red-50 p-2 rounded-lg" title="Hủy đơn"><i class="fas fa-times"></i></button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    } catch (err) {
        console.error('Orders error:', err);
        container.innerHTML = '<div class="text-center py-10 text-red-500">Lỗi tải dữ liệu đơn hàng</div>';
    }
}

async function viewOrderDetail(id) {
    const res = await fetch('/api/orders');
    const data = await res.json();
    const order = data.items.find(o => o.id === id);
    if (!order) return;
    
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">${order.order_code}</h3>
            <div class="space-y-2 mb-4">
                ${order.items.map(i => `
                    <div class="flex justify-between py-2 border-b">
                        <span>${i.product_name} x${i.quantity}</span>
                        <span>${formatMoney(i.subtotal)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="bg-gray-50 p-4 rounded-xl">
                <div class="flex justify-between font-bold text-lg">
                    <span>Tổng</span>
                    <span>${formatMoney(order.total_amount)}</span>
                </div>
                <p class="text-sm text-gray-500 mt-2">Thanh toán: ${order.payment_method_text}</p>
                <p class="text-sm ${order.status === 'completed' ? 'text-green-600' : 'text-red-600'}">Trạng thái: ${order.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}</p>
            </div>
            <button onclick="closeModal()" class="w-full mt-4 py-3 border rounded-xl">Đóng</button>
        </div>
    `);
}

async function cancelOrder(id) {
    if (!confirm('Hủy đơn hàng này? Nguyên liệu sẽ được hoàn trả về kho.')) return;
    const res = await fetch(`/api/orders/${id}/cancel`, {method: 'POST'});
    if (res.ok) {
        showToast('Đã hủy đơn hàng và hoàn trả nguyên liệu');
        router.loadPage('orders');
    } else {
        const err = await res.json();
        showToast(err.error || 'Không thể hủy', 'error');
    }
}

// ========== REPORTS PAGE ==========
async function loadReportsPage(container) {
    try {
    const res = await fetch('/api/reports/dashboard');
    const data = await res.json();
    
    const profitRes = await fetch('/api/reports/profit');
    const profitData = await profitRes.json() || {profit: 0, margin: 0};
    
    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-4 rounded-xl shadow-sm border">
                <p class="text-2xl font-bold text-blue-600">${formatMoney(data.today_revenue)}</p>
                <p class="text-sm text-gray-500">Doanh thu hôm nay</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border">
                <p class="text-2xl font-bold">${data.today_orders}</p>
                <p class="text-sm text-gray-500">Đơn hôm nay</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border">
                <p class="text-2xl font-bold text-green-600">${formatMoney(profitData.profit)}</p>
                <p class="text-sm text-gray-500">Lợi nhuận</p>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border">
                <p class="text-2xl font-bold">${profitData.margin}%</p>
                <p class="text-sm text-gray-500">Biên lợi nhuận</p>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="bg-white p-4 rounded-xl shadow-sm border">
                <h4 class="font-bold mb-4">Hình thức thanh toán</h4>
                <div class="space-y-3">
                    ${data.payments.map(p => `
                        <div class="flex items-center gap-3">
                            <div class="w-3 h-3 rounded-full ${p.method === 'Tiền mặt' ? 'bg-green-500' : p.method === 'Chuyển khoản' ? 'bg-blue-500' : 'bg-purple-500'}"></div>
                            <span class="flex-1">${p.method}</span>
                            <span class="font-bold">${formatMoney(p.amount)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="bg-white p-4 rounded-xl shadow-sm border">
                <h4 class="font-bold mb-4">Sản phẩm bán chạy</h4>
                <div class="space-y-3">
                    ${data.top_products.map((p, i) => `
                        <div class="flex items-center gap-3">
                            <span class="w-6 h-6 rounded-full ${i < 3 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100'} flex items-center justify-center text-sm font-bold">${i+1}</span>
                            <span class="flex-1">${p.name}</span>
                            <span class="font-bold">${p.quantity}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="bg-white p-4 rounded-xl shadow-sm border mb-6">
            <h4 class="font-bold mb-4">Tính lợi nhuận theo thời gian</h4>
            <div class="flex gap-2 mb-4">
                <input type="date" id="profit-start" class="p-2 border rounded-lg">
                <input type="date" id="profit-end" class="p-2 border rounded-lg">
                <button onclick="calculateProfit()" class="px-4 py-2 bg-blue-500 text-white rounded-lg">Tính</button>
            </div>
            <div id="profit-result"></div>
        </div>
        
        <div class="bg-white p-4 rounded-xl shadow-sm border">
            <h4 class="font-bold mb-4">Đơn hàng gần đây</h4>
            <table class="w-full">
                <thead>
                    <tr class="text-left text-sm text-gray-500">
                        <th class="pb-2">Mã đơn</th>
                        <th class="pb-2">Thời gian</th>
                        <th class="pb-2 text-right">Tổng</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.recent_orders.map(o => `
                        <tr class="border-t">
                            <td class="py-3">${o.order_code}</td>
                            <td class="py-3 text-sm text-gray-500">${o.created_at}</td>
                            <td class="py-3 text-right font-bold">${formatMoney(o.total_amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    } catch (err) {
        console.error('Reports error:', err);
        container.innerHTML = '<div class="text-center py-10 text-red-500">Lỗi tải dữ liệu báo cáo</div>';
    }
}

async function calculateProfit() {
    const start = document.getElementById('profit-start').value;
    const end = document.getElementById('profit-end').value;
    
    const url = new URL('/api/reports/profit', window.location.origin);
    if (start) url.searchParams.append('start', start);
    if (end) url.searchParams.append('end', end);
    
    const res = await fetch(url);
    const data = await res.json();
    
    document.getElementById('profit-result').innerHTML = `
        <div class="grid grid-cols-3 gap-4">
            <div class="p-4 bg-blue-50 rounded-lg text-center">
                <p class="text-lg font-bold text-blue-800">${formatMoney(data.revenue)}</p>
                <p class="text-sm text-blue-600">Doanh thu</p>
            </div>
            <div class="p-4 bg-red-50 rounded-lg text-center">
                <p class="text-lg font-bold text-red-800">${formatMoney(data.cost)}</p>
                <p class="text-sm text-red-600">Giá vốn</p>
            </div>
            <div class="p-4 bg-green-50 rounded-lg text-center">
                <p class="text-lg font-bold text-green-800">${formatMoney(data.profit)}</p>
                <p class="text-sm text-green-600">Lợi nhuận (${data.margin}%)</p>
            </div>
        </div>
    `;
}

// ========== SETTINGS PAGE ==========
async function loadSettingsPage(container) {
    const [usersRes, discountsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/discounts')
    ]);
    const users = await usersRes.json();
    const discounts = await discountsRes.json();
    const isAdmin = currentUser?.role === 'admin';
    
    container.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-6">
            <!-- Shop Info -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border">
                <h4 class="font-bold mb-4">Thông tin cửa hàng</h4>
                <form id="shop-form" onsubmit="updateShopSettings(event)">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Tên cửa hàng</label>
                        <input type="text" name="name" value="${currentShop?.name || ''}" class="w-full p-3 border rounded-xl" ${!isAdmin ? 'disabled' : ''}>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Địa chỉ</label>
                            <input type="text" name="address" value="${currentShop?.address || ''}" class="w-full p-3 border rounded-xl" ${!isAdmin ? 'disabled' : ''}>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Số điện thoại</label>
                            <input type="text" name="phone" value="${currentShop?.phone || ''}" class="w-full p-3 border rounded-xl" ${!isAdmin ? 'disabled' : ''}>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Thuế VAT (%)</label>
                            <input type="number" name="tax_rate" value="${currentShop?.tax_rate || 0}" class="w-full p-3 border rounded-xl" ${!isAdmin ? 'disabled' : ''}>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Cách tính thuế</label>
                            <select name="tax_mode" class="w-full p-3 border rounded-xl" ${!isAdmin ? 'disabled' : ''}>
                                <option value="exclusive" ${currentShop?.tax_mode === 'exclusive' ? 'selected' : ''}>Cộng thêm</option>
                                <option value="inclusive" ${currentShop?.tax_mode === 'inclusive' ? 'selected' : ''}>Đã bao gồm</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">Chân trang hóa đơn</label>
                        <textarea name="receipt_footer" class="w-full p-3 border rounded-xl" ${!isAdmin ? 'disabled' : ''}>${currentShop?.receipt_footer || 'Cảm ơn quý khách!'}</textarea>
                    </div>
                    ${isAdmin ? `<button type="submit" class="w-full bg-blue-500 text-white py-3 rounded-xl font-bold">Lưu thay đổi</button>` : ''}
                </form>
            </div>
            
            <!-- Staff Management -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold">Quản lý nhân viên</h4>
                    ${isAdmin ? `<button onclick="showAddUserModal()" class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">+ Thêm</button>` : ''}
                </div>
                <div class="space-y-3">
                    ${users.map(u => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <i class="fas fa-user text-gray-500"></i>
                                </div>
                                <div>
                                    <p class="font-medium">${u.full_name || u.username}</p>
                                    <p class="text-xs text-gray-500">${u.role === 'admin' ? 'Admin' : 'Nhân viên'}</p>
                                </div>
                            </div>
                            ${isAdmin && u.id !== currentUser.id ? `
                                <button onclick="deleteUser(${u.id})" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="fas fa-trash"></i></button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Discounts -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold">Mã giảm giá</h4>
                    ${isAdmin ? `<button onclick="showAddDiscountModal()" class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm">+ Thêm</button>` : ''}
                </div>
                <div class="space-y-2">
                    ${discounts.map(d => `
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                            <div>
                                <p class="font-medium">${d.code}</p>
                                <p class="text-xs text-gray-500">${d.discount_type === 'percent' ? `Giảm ${d.discount_value}%` : `Giảm ${formatMoney(d.discount_value)}`}</p>
                            </div>
                            <span class="text-xs ${d.is_active ? 'text-green-600' : 'text-gray-400'}">${d.is_active ? 'Hoạt động' : 'Đã tắt'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Danger Zone -->
            ${isAdmin ? `
            <div class="bg-red-50 border border-red-200 p-5 rounded-2xl">
                <h4 class="font-bold text-red-600 mb-4">Vùng nguy hiểm</h4>
                <div class="flex flex-wrap gap-2">
                    <button onclick="clearData('orders')" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Xóa đơn hàng</button>
                    <button onclick="clearData('products')" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Xóa sản phẩm</button>
                    <button onclick="clearData('all')" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">Xóa tất cả</button>
                </div>
            </div>
            ` : ''}
            
            <button onclick="logout()" class="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">
                <i class="fas fa-sign-out-alt mr-2"></i>Đăng xuất
            </button>
        </div>
    `;
}

async function updateShopSettings(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        address: formData.get('address'),
        phone: formData.get('phone'),
        tax_rate: parseFloat(formData.get('tax_rate')) || 0,
        tax_mode: formData.get('tax_mode'),
        receipt_footer: formData.get('receipt_footer')
    };
    
    const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        const result = await res.json();
        currentShop = result;
        showToast('Cập nhật thành công!');
    }
}

function showAddUserModal() {
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Thêm nhân viên</h3>
            <form onsubmit="handleAddUser(event)">
                <input type="text" name="username" placeholder="Username" class="w-full p-3 border rounded-xl mb-4" required>
                <input type="text" name="full_name" placeholder="Họ tên" class="w-full p-3 border rounded-xl mb-4">
                <input type="password" name="password" placeholder="Mật khẩu" class="w-full p-3 border rounded-xl mb-4" required>
                <select name="role" class="w-full p-3 border rounded-xl mb-4">
                    <option value="staff">Nhân viên</option>
                    <option value="admin">Admin</option>
                </select>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 border border-gray-200 rounded-xl">Hủy</button>
                    <button type="submit" class="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold">Thêm</button>
                </div>
            </form>
        </div>
    `);
}

async function handleAddUser(e) {
    e.preventDefault();
    await fetch('/api/users', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
    });
    closeModal();
    router.loadPage('settings');
}

async function deleteUser(id) {
    if (!confirm('Xóa nhân viên này?')) return;
    await fetch(`/api/users/${id}`, {method: 'DELETE'});
    router.loadPage('settings');
}

function showAddDiscountModal() {
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4">Thêm mã giảm giá</h3>
            <form onsubmit="handleAddDiscount(event)">
                <input type="text" name="code" placeholder="Mã giảm giá" class="w-full p-3 border rounded-xl mb-4 uppercase" required>
                <select name="discount_type" class="w-full p-3 border rounded-xl mb-4">
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định</option>
                </select>
                <input type="number" name="discount_value" placeholder="Giá trị giảm" class="w-full p-3 border rounded-xl mb-4" required>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 border border-gray-200 rounded-xl">Hủy</button>
                    <button type="submit" class="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold">Thêm</button>
                </div>
            </form>
        </div>
    `);
}

async function handleAddDiscount(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.discount_value = parseFloat(data.discount_value);
    
    await fetch('/api/discounts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    closeModal();
    router.loadPage('settings');
}

async function clearData(type) {
    if (!confirm('Xác nhận xóa?')) return;
    await fetch('/api/data/clear', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({type})
    });
    showToast('Đã xóa dữ liệu');
}

// ========== UTILS ==========
async function loadProducts() {
    const res = await fetch('/api/products');
    products = await res.json();
}

async function loadCategories() {
    const res = await fetch('/api/categories');
    categories = await res.json();
}

async function loadIngredients() {
    const res = await fetch('/api/ingredients');
    ingredients = await res.json();
}

function formatMoney(amount) {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + 'đ';
}

function showModal(content) {
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal-content').innerHTML = content;
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    // Reset modal size về mặc định (không max-height, không overflow)
    document.getElementById('modal-content').className = 'absolute bg-white rounded-t-2xl md:rounded-2xl bottom-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[480px] shadow-2xl';
}

// Init
checkAuth();
