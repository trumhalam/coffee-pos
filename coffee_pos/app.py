"""
Coffee POS - Multi-tenant POS System
"""
from flask import Flask, render_template, jsonify, request, session, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from functools import wraps
import os
import io
import pandas as pd
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Secret key from environment or default
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# Database: Use PostgreSQL in production, SQLite for local dev
# Format: postgresql://user:password@host:port/database
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Render.com provides DATABASE_URL starting with postgres://, need to change to postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # Fallback to SQLite for local development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///coffee_pos.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_timeout': 30,
    'pool_recycle': 1800
}

db = SQLAlchemy(app)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ============== MODELS ==============

class Shop(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), default='')
    phone = db.Column(db.String(20), default='')
    tax_rate = db.Column(db.Float, default=0)
    tax_mode = db.Column(db.String(20), default='exclusive')
    receipt_footer = db.Column(db.String(200), default='Cảm ơn quý khách!')
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    users = db.relationship('User', backref='shop', lazy=True)
    categories = db.relationship('Category', backref='shop', lazy=True)
    ingredients = db.relationship('Ingredient', backref='shop', lazy=True)
    products = db.relationship('Product', backref='shop', lazy=True)
    orders = db.relationship('Order', backref='shop', lazy=True)
    
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'address': self.address, 'phone': self.phone,
                'tax_rate': self.tax_rate, 'tax_mode': self.tax_mode, 'receipt_footer': self.receipt_footer}

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'))
    username = db.Column(db.String(50), nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    full_name = db.Column(db.String(100), default='')
    role = db.Column(db.String(20), default='staff')
    is_active = db.Column(db.Boolean, default=True)
    
    __table_args__ = (db.UniqueConstraint('username', name='unique_username'),)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'full_name': self.full_name, 
                'role': self.role, 'is_active': self.is_active}

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'))
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), default='product')

class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'))
    name = db.Column(db.String(100), nullable=False)
    unit = db.Column(db.String(20), nullable=False)
    stock_quantity = db.Column(db.Float, default=0)
    reorder_level = db.Column(db.Float, default=10)
    avg_cost = db.Column(db.Float, default=0)  # Giá vốn trung bình
    
    stock_entries = db.relationship('StockEntry', backref='ingredient', lazy=True)
    
    def to_dict(self):
        total_import = sum(e.quantity * e.unit_cost for e in self.stock_entries if e.quantity > 0)
        return {'id': self.id, 'name': self.name, 'unit': self.unit,
                'stock_quantity': round(self.stock_quantity, 2),
                'reorder_level': self.reorder_level,
                'avg_cost': round(self.avg_cost, 2),
                'total_import_value': round(total_import, 0)}

class StockEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.id'))
    quantity = db.Column(db.Float, nullable=False)
    unit_cost = db.Column(db.Float, default=0)
    total_cost = db.Column(db.Float, default=0)
    entry_type = db.Column(db.String(20), default='import')  # import, sale
    note = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {'id': self.id, 'ingredient_name': self.ingredient.name if self.ingredient else '',
                'quantity': self.quantity, 'unit_cost': self.unit_cost,
                'total_cost': self.total_cost, 'entry_type': self.entry_type,
                'note': self.note, 'created_at': self.created_at.strftime('%H:%M %d/%m/%Y')}

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'))
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
    image = db.Column(db.String(500), default='')
    is_active = db.Column(db.Boolean, default=True)
    
    recipe_items = db.relationship('RecipeItem', backref='product', cascade='all, delete-orphan')
    
    def to_dict(self):
        cat = Category.query.get(self.category_id)
        recipe = []
        for ri in self.recipe_items:
            ing = Ingredient.query.get(ri.ingredient_id)
            if ing:
                recipe.append({'ingredient_id': ri.ingredient_id, 'ingredient_name': ing.name,
                              'amount': ri.amount, 'unit': ing.unit})
        return {'id': self.id, 'name': self.name, 'price': self.price,
                'category_id': self.category_id, 'category_name': cat.name if cat else '',
                'image': self.image, 'is_active': self.is_active, 'recipe': recipe}

class RecipeItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'))
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.id'))
    amount = db.Column(db.Float, nullable=False)

class Discount(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'))
    code = db.Column(db.String(20), nullable=False)
    discount_type = db.Column(db.String(10), default='percent')
    discount_value = db.Column(db.Float, default=0)
    is_active = db.Column(db.Boolean, default=True)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'))
    order_code = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    customer_name = db.Column(db.String(100), default='Khách lẻ')
    subtotal = db.Column(db.Integer, default=0)
    tax_amount = db.Column(db.Integer, default=0)
    discount_amount = db.Column(db.Integer, default=0)
    total_amount = db.Column(db.Integer, default=0)
    payment_method = db.Column(db.String(20), default='cash')
    status = db.Column(db.String(20), default='completed')
    note = db.Column(db.String(500), default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    items = db.relationship('OrderItem', backref='order', cascade='all, delete-orphan')
    creator = db.relationship('User', foreign_keys=[user_id])
    
    def to_dict(self):
        return {'id': self.id, 'order_code': self.order_code,
                'customer_name': self.customer_name, 'subtotal': self.subtotal,
                'tax_amount': self.tax_amount, 'discount_amount': self.discount_amount,
                'total_amount': self.total_amount, 'payment_method': self.payment_method,
                'payment_method_text': {'cash': 'Tiền mặt', 'card': 'Thẻ', 'transfer': 'Chuyển khoản'}.get(self.payment_method, self.payment_method),
                'status': self.status, 'note': self.note,
                'created_by_name': self.creator.full_name or self.creator.username if self.creator else '',
                'created_at': self.created_at.strftime('%H:%M %d/%m/%Y'),
                'items': [i.to_dict() for i in self.items]}

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'))
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'))
    product_name = db.Column(db.String(100))
    quantity = db.Column(db.Integer)
    price = db.Column(db.Integer)
    
    def to_dict(self):
        return {'product_name': self.product_name, 'quantity': self.quantity,
                'price': self.price, 'subtotal': self.price * self.quantity}

# ============== AUTH ==============

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Sai thông tin đăng nhập'}), 400
    if not user.is_active:
        return jsonify({'error': 'Tài khoản bị khóa'}), 400
    
    shop = Shop.query.get(user.shop_id)
    session['user_id'] = user.id
    session['shop_id'] = shop.id
    session['user_role'] = user.role
    
    return jsonify({'user': user.to_dict(), 'shop': {'id': shop.id, 'name': shop.name}})

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username đã tồn tại'}), 400
    
    shop = Shop(name=data['shop_name'])
    db.session.add(shop)
    db.session.flush()
    
    user = User(shop_id=shop.id, username=data['username'],
                password_hash=generate_password_hash(data['password']),
                full_name=data.get('full_name', ''), role='admin')
    db.session.add(user)
    db.session.commit()
    
    # Tạo dữ liệu mẫu
    init_sample_data(shop.id)
    
    return jsonify({'message': 'Đăng ký thành công', 'shop': shop.to_dict()})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Đã đăng xuất'})

@app.route('/api/auth/me')
@login_required
def get_me():
    user = User.query.get(session['user_id'])
    shop = Shop.query.get(session['shop_id'])
    if not user or not shop:
        session.clear()
        return jsonify({'error': 'Session expired'}), 401
    return jsonify({'user': user.to_dict(), 'shop': shop.to_dict()})

# ============== CATEGORIES ==============

@app.route('/api/categories', methods=['GET', 'POST'])
@login_required
def categories():
    shop = Shop.query.get(session['shop_id'])
    if request.method == 'POST':
        data = request.json
        cat = Category(shop_id=shop.id, name=data['name'], type='product')
        db.session.add(cat)
        db.session.commit()
        return jsonify({'id': cat.id, 'name': cat.name})
    
    cats = Category.query.filter_by(shop_id=shop.id, type='product').all()
    return jsonify([{'id': c.id, 'name': c.name} for c in cats])

@app.route('/api/categories/<int:id>', methods=['PUT', 'DELETE'])
@login_required
def category_detail(id):
    cat = Category.query.filter_by(id=id, shop_id=session['shop_id']).first_or_404()
    if request.method == 'PUT':
        cat.name = request.json.get('name', cat.name)
        db.session.commit()
        return jsonify({'id': cat.id, 'name': cat.name})
    elif request.method == 'DELETE':
        # Kiểm tra có sản phẩm đang dùng không
        if Product.query.filter_by(category_id=id).first():
            return jsonify({'error': 'Có sản phẩm đang dùng danh mục này'}), 400
        db.session.delete(cat)
        db.session.commit()
        return jsonify({'message': 'Đã xóa'})

# ============== PRODUCTS ==============

@app.route('/api/products', methods=['GET', 'POST'])
@login_required
def products():
    shop = Shop.query.get(session['shop_id'])
    if request.method == 'POST':
        data = request.json
        prod = Product(shop_id=shop.id, name=data['name'], price=data['price'],
                       category_id=data.get('category_id'), image=data.get('image', ''))
        db.session.add(prod)
        db.session.flush()
        
        # Thêm công thức
        for item in data.get('recipe', []):
            db.session.add(RecipeItem(product_id=prod.id, 
                         ingredient_id=item['ingredient_id'], amount=item['amount']))
        db.session.commit()
        return jsonify(prod.to_dict())
    
    prods = Product.query.filter_by(shop_id=shop.id, is_active=True).all()
    return jsonify([p.to_dict() for p in prods])

@app.route('/api/products/<int:id>', methods=['PUT', 'DELETE'])
@login_required
def product_detail(id):
    prod = Product.query.filter_by(id=id, shop_id=session['shop_id']).first_or_404()
    if request.method == 'PUT':
        data = request.json
        prod.name = data.get('name', prod.name)
        prod.price = data.get('price', prod.price)
        prod.category_id = data.get('category_id', prod.category_id)
        prod.image = data.get('image', prod.image)
        
        # Cập nhật công thức
        if 'recipe' in data:
            RecipeItem.query.filter_by(product_id=prod.id).delete()
            for item in data['recipe']:
                db.session.add(RecipeItem(product_id=prod.id,
                             ingredient_id=item['ingredient_id'], amount=item['amount']))
        db.session.commit()
        return jsonify(prod.to_dict())
    
    elif request.method == 'DELETE':
        prod.is_active = False
        db.session.commit()
        return jsonify({'message': 'Đã xóa'})

@app.route('/api/products/<int:id>/recipe')
@login_required
def product_recipe(id):
    items = RecipeItem.query.filter_by(product_id=id).all()
    result = []
    for i in items:
        ing = Ingredient.query.get(i.ingredient_id)
        if ing:
            result.append({'ingredient_id': i.ingredient_id, 
                          'ingredient_name': ing.name,
                          'amount': i.amount, 'unit': ing.unit})
    return jsonify(result)

# ============== INGREDIENTS & STOCK ==============

@app.route('/api/ingredients', methods=['GET', 'POST'])
@login_required
def ingredients():
    shop = Shop.query.get(session['shop_id'])
    if request.method == 'POST':
        data = request.json
        if Ingredient.query.filter_by(shop_id=shop.id, name=data['name']).first():
            return jsonify({'error': 'Nguyên liệu đã tồn tại'}), 400
        
        ing = Ingredient(shop_id=shop.id, name=data['name'], 
                         unit=data['unit'], reorder_level=data.get('reorder_level', 10))
        db.session.add(ing)
        db.session.commit()
        return jsonify(ing.to_dict())
    
    ings = Ingredient.query.filter_by(shop_id=shop.id).all()
    return jsonify([i.to_dict() for i in ings])

@app.route('/api/ingredients/<int:id>/stock', methods=['POST', 'GET'])
@login_required
def ingredient_stock(id):
    shop = Shop.query.get(session['shop_id'])
    ing = Ingredient.query.filter_by(id=id, shop_id=shop.id).first_or_404()
    
    if request.method == 'POST':
        data = request.json
        qty = float(data['quantity'])
        unit_cost = float(data.get('unit_cost', 0))
        
        if qty <= 0:
            return jsonify({'error': 'Số lượng phải > 0'}), 400
        
        total = qty * unit_cost
        entry = StockEntry(ingredient_id=id, quantity=qty, unit_cost=unit_cost,
                          total_cost=total, note=data.get('note', 'Nhập kho'))
        db.session.add(entry)
        
        # Cập nhật tồn kho và giá vốn trung bình
        old_qty = ing.stock_quantity
        old_cost = ing.avg_cost
        new_qty = old_qty + qty
        
        if new_qty > 0:
            ing.avg_cost = ((old_qty * old_cost) + total) / new_qty
        ing.stock_quantity = new_qty
        db.session.commit()
        
        return jsonify({'message': 'Nhập kho thành công', 'ingredient': ing.to_dict()})
    
    # GET - lịch sử
    entries = StockEntry.query.filter_by(ingredient_id=id).order_by(StockEntry.created_at.desc()).all()
    return jsonify([e.to_dict() for e in entries])

@app.route('/api/stock/history')
@login_required
def all_stock_history():
    shop = Shop.query.get(session['shop_id'])
    filter_type = request.args.get('filter', 'all')
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    
    query = db.session.query(StockEntry).join(Ingredient).filter(
        Ingredient.shop_id == shop.id
    )
    
    today = datetime.now().date()
    
    if filter_type == 'today':
        query = query.filter(db.func.date(StockEntry.created_at) == today)
    elif filter_type == 'week':
        week_start = today - timedelta(days=today.weekday())
        query = query.filter(db.func.date(StockEntry.created_at) >= week_start)
    elif filter_type == 'month':
        month_start = today.replace(day=1)
        query = query.filter(db.func.date(StockEntry.created_at) >= month_start)
    elif filter_type == 'custom' and start_date and end_date:
        query = query.filter(
            db.func.date(StockEntry.created_at) >= start_date,
            db.func.date(StockEntry.created_at) <= end_date
        )
    
    entries = query.order_by(StockEntry.created_at.desc()).limit(100).all()
    return jsonify([e.to_dict() for e in entries])

# ============== ORDERS ==============

@app.route('/api/orders', methods=['GET', 'POST'])
@login_required
def orders():
    shop = Shop.query.get(session['shop_id'])
    if request.method == 'POST':
        data = request.json
        count = Order.query.filter_by(shop_id=shop.id).count() + 1
        order_code = f'HD{count:04d}'
        
        order = Order(shop_id=shop.id, order_code=order_code,
                     user_id=session['user_id'],
                     customer_name=data.get('customer_name', 'Khách lẻ'),
                     subtotal=data['subtotal'], tax_amount=data.get('tax_amount', 0),
                     discount_amount=data.get('discount_amount', 0),
                     total_amount=data['total_amount'],
                     payment_method=data.get('payment_method', 'cash'),
                     note=data.get('note', ''))
        db.session.add(order)
        db.session.flush()
        
        # Thêm items và trừ nguyên liệu
        for item in data['items']:
            db.session.add(OrderItem(order_id=order.id, product_id=item['product_id'],
                           product_name=item['product_name'], quantity=item['quantity'],
                           price=item['price']))
            
            # Trừ nguyên liệu
            for ri in RecipeItem.query.filter_by(product_id=item['product_id']).all():
                ing = Ingredient.query.get(ri.ingredient_id)
                if ing:
                    used_qty = ri.amount * item['quantity']
                    ing.stock_quantity -= used_qty
                    cost = used_qty * ing.avg_cost
                    db.session.add(StockEntry(ingredient_id=ing.id, quantity=-used_qty,
                                    unit_cost=ing.avg_cost, total_cost=-cost,
                                    entry_type='sale', note=f'Bán {order_code}'))
        db.session.commit()
        return jsonify(order.to_dict())
    
    # GET
    page = request.args.get('page', 1, type=int)
    orders = Order.query.filter_by(shop_id=shop.id).order_by(Order.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False)
    return jsonify({'items': [o.to_dict() for o in orders.items], 'total': orders.total})

@app.route('/api/orders/<int:id>', methods=['DELETE'])
@login_required
def delete_order(id):
    order = Order.query.filter_by(id=id, shop_id=session['shop_id']).first_or_404()
    if session.get('user_role') != 'admin':
        return jsonify({'error': 'Không có quyền'}), 403
    
    # Hoàn trả nguyên liệu
    for item in order.items:
        for ri in RecipeItem.query.filter_by(product_id=item.product_id).all():
            ing = Ingredient.query.get(ri.ingredient_id)
            if ing:
                ing.stock_quantity += ri.amount * item.quantity
    
    order.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Đã hủy đơn'})

@app.route('/api/orders/<int:id>/cancel', methods=['POST'])
@login_required
def cancel_order(id):
    order = Order.query.filter_by(id=id, shop_id=session['shop_id']).first_or_404()
    if session.get('user_role') != 'admin':
        return jsonify({'error': 'Không có quyền'}), 403
    
    if order.status == 'cancelled':
        return jsonify({'error': 'Đơn hàng đã hủy'}), 400
    
    # Hoàn trả nguyên liệu
    for item in order.items:
        for ri in RecipeItem.query.filter_by(product_id=item.product_id).all():
            ing = Ingredient.query.get(ri.ingredient_id)
            if ing:
                return_qty = ri.amount * item.quantity
                ing.stock_quantity += return_qty
                cost = return_qty * ing.avg_cost
                db.session.add(StockEntry(ingredient_id=ing.id, quantity=return_qty,
                                unit_cost=ing.avg_cost, total_cost=cost,
                                entry_type='return', note=f'Hoàn hàng {order.order_code}'))
    
    order.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Đã hủy đơn và hoàn trả nguyên liệu'})

@app.route('/api/stock/entries/<int:id>/cancel', methods=['POST'])
@login_required
def cancel_stock_entry(id):
    entry = StockEntry.query.get_or_404(id)
    ing = Ingredient.query.get(entry.ingredient_id)
    
    if not ing or ing.shop_id != session['shop_id']:
        return jsonify({'error': 'Không tìm thấy'}), 404
    
    # Chỉ cho phép hủy phiếu nhập (không hủy phiếu xuất/bán)
    if entry.entry_type != 'import':
        return jsonify({'error': 'Chỉ có thể hủy phiếu nhập kho'}), 400
    
    # Trừ nguyên liệu đã nhập
    if ing.stock_quantity < entry.quantity:
        return jsonify({'error': 'Không đủ tồn kho để hủy'}), 400
    
    ing.stock_quantity -= entry.quantity
    # Tính lại giá vốn trung bình (đơn giản: giữ nguyên)
    
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Đã hủy phiếu nhập kho'})

# ============== REPORTS ==============

@app.route('/api/reports/dashboard')
@login_required
def dashboard():
    shop = Shop.query.get(session['shop_id'])
    today = datetime.now().date()
    
    # Doanh thu hôm nay
    today_revenue = db.session.query(db.func.sum(Order.total_amount)).filter(
        db.func.date(Order.created_at) == today, Order.shop_id == shop.id,
        Order.status != 'cancelled').scalar() or 0
    
    # Đơn hôm nay
    today_orders = Order.query.filter(db.func.date(Order.created_at) == today,
                                      Order.shop_id == shop.id, Order.status != 'cancelled').count()
    
    # Tổng đơn và doanh thu
    total_orders = Order.query.filter_by(shop_id=shop.id, status='completed').count()
    total_revenue = db.session.query(db.func.sum(Order.total_amount)).filter(
        Order.shop_id == shop.id, Order.status != 'cancelled').scalar() or 0
    
    # Phương thức thanh toán
    payments = db.session.query(Order.payment_method, 
                               db.func.sum(Order.total_amount)).filter(
        Order.shop_id == shop.id, Order.status != 'cancelled'
    ).group_by(Order.payment_method).all()
    
    payment_data = [{'method': {'cash': 'Tiền mặt', 'card': 'Thẻ', 'transfer': 'Chuyển khoản'}.get(p[0], p[0]),
                     'amount': p[1]} for p in payments]
    
    # Top sản phẩm
    top_products = db.session.query(OrderItem.product_name,
                                   db.func.sum(OrderItem.quantity)).join(Order).filter(
        Order.shop_id == shop.id, Order.status != 'cancelled'
    ).group_by(OrderItem.product_name).order_by(db.desc(db.func.sum(OrderItem.quantity))).limit(5).all()
    
    # Đơn gần đây
    recent = Order.query.filter_by(shop_id=shop.id, status='completed').order_by(
        Order.created_at.desc()).limit(5).all()
    
    return jsonify({
        'today_revenue': today_revenue, 'today_orders': today_orders,
        'total_orders': total_orders, 'total_revenue': total_revenue,
        'payments': payment_data,
        'top_products': [{'name': p[0], 'quantity': p[1]} for p in top_products],
        'recent_orders': [o.to_dict() for o in recent]
    })

@app.route('/api/reports/profit')
@login_required
def profit_report():
    shop = Shop.query.get(session['shop_id'])
    start = request.args.get('start')
    end = request.args.get('end')
    
    query = Order.query.filter_by(shop_id=shop.id, status='completed')
    if start:
        query = query.filter(db.func.date(Order.created_at) >= start)
    if end:
        query = query.filter(db.func.date(Order.created_at) <= end)
    
    orders = query.all()
    total_revenue = sum(o.total_amount for o in orders)
    
    # Tính giá vốn từ nguyên liệu đã dùng
    total_cost = 0
    for order in orders:
        for item in order.items:
            for ri in RecipeItem.query.filter_by(product_id=item.product_id).all():
                ing = Ingredient.query.get(ri.ingredient_id)
                if ing:
                    total_cost += ri.amount * item.quantity * ing.avg_cost
    
    profit = total_revenue - total_cost
    
    return jsonify({
        'revenue': round(total_revenue, 0),
        'cost': round(total_cost, 0),
        'profit': round(profit, 0),
        'margin': round((profit / total_revenue * 100) if total_revenue > 0 else 0, 1)
    })

# ============== UPLOAD ==============

@app.route('/api/upload', methods=['POST'])
@login_required
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file'}), 400
    filename = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    return jsonify({'url': f'/static/uploads/{filename}'})

# ============== SETTINGS ==============

@app.route('/api/settings')
@login_required
def get_settings():
    shop = Shop.query.get(session.get('shop_id'))
    return jsonify(shop.to_dict())

@app.route('/api/settings', methods=['PUT'])
@login_required
def update_settings():
    shop = Shop.query.get(session.get('shop_id'))
    data = request.get_json()
    shop.name = data.get('name', shop.name)
    shop.address = data.get('address', shop.address)
    shop.phone = data.get('phone', shop.phone)
    shop.tax_rate = data.get('tax_rate', shop.tax_rate)
    shop.tax_mode = data.get('tax_mode', shop.tax_mode)
    shop.receipt_footer = data.get('receipt_footer', shop.receipt_footer)
    db.session.commit()
    return jsonify(shop.to_dict())

# ============== USERS ==============

@app.route('/api/users')
@login_required
def list_users():
    shop_id = session.get('shop_id')
    users = User.query.filter_by(shop_id=shop_id).all()
    return jsonify([u.to_dict() for u in users])

@app.route('/api/users', methods=['POST'])
@login_required
def create_user():
    shop_id = session.get('shop_id')
    data = request.get_json()
    user = User(
        shop_id=shop_id,
        username=data['username'],
        password_hash=generate_password_hash(data['password']),
        full_name=data.get('full_name', ''),
        role=data.get('role', 'staff')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/users/<int:id>', methods=['DELETE'])
@login_required
def delete_user(id):
    user = User.query.get_or_404(id)
    if user.id == session.get('user_id'):
        return jsonify({'error': 'Cannot delete yourself'}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({'success': True})

# ============== DISCOUNTS ==============

@app.route('/api/discounts')
@login_required
def list_discounts():
    shop_id = session.get('shop_id')
    discounts = Discount.query.filter_by(shop_id=shop_id).all()
    return jsonify([{'id': d.id, 'code': d.code, 'discount_type': d.discount_type, 
                     'discount_value': d.discount_value, 'is_active': d.is_active} for d in discounts])

@app.route('/api/discounts', methods=['POST'])
@login_required
def create_discount():
    shop_id = session.get('shop_id')
    data = request.get_json()
    discount = Discount(
        shop_id=shop_id,
        code=data['code'].upper(),
        discount_type=data['discount_type'],
        discount_value=data['discount_value']
    )
    db.session.add(discount)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/discounts/validate', methods=['POST'])
@login_required
def validate_discount():
    shop_id = session.get('shop_id')
    data = request.get_json()
    discount = Discount.query.filter_by(shop_id=shop_id, code=data['code'].upper(), is_active=True).first()
    if not discount:
        return jsonify({'valid': False, 'error': 'Mã không tồn tại'})
    
    order_total = data.get('order_total', 0)
    if discount.discount_type == 'percent':
        discount_amount = int(order_total * discount.discount_value / 100)
    else:
        discount_amount = int(discount.discount_value)
    
    return jsonify({'valid': True, 'discount': {'code': discount.code}, 'discount_amount': discount_amount})

# ============== DATA CLEAR ==============

@app.route('/api/data/clear', methods=['POST'])
@login_required
def clear_data():
    shop_id = session.get('shop_id')
    data = request.get_json()
    type_clear = data.get('type', 'all')
    
    if type_clear == 'orders':
        Order.query.filter_by(shop_id=shop_id).delete()
    elif type_clear == 'products':
        Product.query.filter_by(shop_id=shop_id).delete()
    elif type_clear == 'all':
        # Keep categories
        Order.query.filter_by(shop_id=shop_id).delete()
        Product.query.filter_by(shop_id=shop_id).delete()
        Ingredient.query.filter_by(shop_id=shop_id).delete()
    
    db.session.commit()
    return jsonify({'success': True})

# ============== INIT ==============

def init_sample_data(shop_id):
    # Danh mục mặc định
    cat1 = Category(shop_id=shop_id, name='Đồ uống', type='product')
    cat2 = Category(shop_id=shop_id, name='Đồ ăn', type='product')
    db.session.add_all([cat1, cat2])
    db.session.flush()
    
    # Nguyên liệu mẫu
    ings = [
        Ingredient(shop_id=shop_id, name='Cà phê', unit='g', stock_quantity=0, reorder_level=500),
        Ingredient(shop_id=shop_id, name='Sữa', unit='ml', stock_quantity=0, reorder_level=1000),
    ]
    db.session.add_all(ings)
    db.session.flush()
    
    # Nhập kho mẫu
    for ing in ings:
        entry = StockEntry(ingredient_id=ing.id, quantity=1000, unit_cost=0.1, 
                          total_cost=100, note='Nhập đầu')
        db.session.add(entry)
        ing.stock_quantity = 1000
        ing.avg_cost = 0.1
    
    # Sản phẩm mẫu
    prods = [
        Product(shop_id=shop_id, name='Cà phê đen', price=25000, category_id=cat1.id,
               image='https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300'),
        Product(shop_id=shop_id, name='Bánh mì', price=20000, category_id=cat2.id,
               image='https://images.unsplash.com/photo-1600454309261-3dc9b7594592?w=300'),
    ]
    db.session.add_all(prods)
    db.session.commit()

@app.route('/')
def index():
    return render_template('index.html')

# Health check endpoint for monitoring
@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Get port from environment variable (for Render/Railway/Heroku)
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)
