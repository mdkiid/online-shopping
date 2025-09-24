const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs').promises;
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');
const Seller = require('./models/Seller');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置EJS为模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 中间件设置
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'simple-shop-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// API路由
app.use('/api', apiRoutes);

// 中间件：检查卖家是否已登录
const requireSellerAuth = (req, res, next) => {
  if (req.session.sellerId) {
    next();
  } else {
    res.redirect('/seller/login');
  }
};

// 前台路由
// 首页 - 展示当前可购买的商品
app.get('/', async (req, res) => {
  try {
    const products = await Product.getAvailable();
    const product = products.length > 0 ? products[0] : null;
    res.render('index', { product });
  } catch (err) {
    res.status(500).send('读取数据失败');
  }
});

// 购买页面 - 填写用户信息
app.get('/checkout', async (req, res) => {
  try {
    const products = await Product.getAvailable();
    const product = products.length > 0 ? products[0] : null;
    
    if (!product) {
      return res.redirect('/');
    }
    res.render('checkout', { product });
  } catch (err) {
    res.status(500).send('读取数据失败');
  }
});

// 处理购买请求
app.post('/checkout', async (req, res) => {
  const { name, email, phone } = req.body;
  
  try {
    // 创建用户
    const userId = require('uuid').v4();
    const newUser = { id: userId, name, email, phone };
    await User.create(newUser);
    
    // 获取当前可购买的商品
    const products = await Product.getAvailable();
    if (products.length === 0) {
      return res.status(500).send('获取商品失败');
    }
    
    const product = products[0];
    
    // 创建订单
    const orderId = require('uuid').v4();
    const newOrder = { id: orderId, product_id: product.id, user_id: userId };
    await Order.create(newOrder);
    
    // 冻结商品
    await Product.updateStatus(product.id, 'frozen');
    
    res.redirect('/order-success');
  } catch (err) {
    res.status(500).send('创建订单失败: ' + err.message);
  }
});

// 订单成功页面
app.get('/order-success', (req, res) => {
  res.render('order-success');
});

// 卖家路由
// 卖家登录页面
app.get('/seller/login', (req, res) => {
  res.render('seller/login');
});

// 处理卖家登录
app.post('/seller/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const seller = await Seller.findByUsername(username);
    
    if (seller && require('bcryptjs').compareSync(password, seller.password_hash)) {
      req.session.sellerId = seller.id;
      res.redirect('/seller/dashboard');
    } else {
      res.render('seller/login', { error: '用户名或密码错误' });
    }
  } catch (err) {
    res.status(500).send('数据库错误');
  }
});

// 卖家登出
app.get('/seller/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/seller/login');
});

// 卖家仪表盘
app.get('/seller/dashboard', requireSellerAuth, async (req, res) => {
  try {
    // 获取最新商品
    const products = await Product.getAll();
    const product = products.length > 0 ? products[0] : null;
    
    // 获取待处理订单
    const orders = await Order.getPending();
    
    res.render('seller/dashboard', { product, orders });
  } catch (err) {
    res.status(500).send('读取数据失败');
  }
});

// 发布新商品
app.post('/seller/product', requireSellerAuth, async (req, res) => {
  const { name, description, price, image_url } = req.body;
  
  try {
    const newProduct = {
      id: require('uuid').v4(),
      name,
      description,
      image_url: image_url || '/images/default.jpg',
      price: parseFloat(price)
    };
    await Product.create(newProduct);
    res.redirect('/seller/dashboard');
  } catch (err) {
    res.status(500).send('发布商品失败');
  }
});

// 完成交易
app.post('/seller/order/:id/complete', requireSellerAuth, async (req, res) => {
  const orderId = req.params.id;
  
  try {
    // 更新订单状态
    const order = await Order.findById(orderId);
    if (order) {
      await Order.updateStatus(orderId, 'completed');
      // 更新商品状态为已售
      await Product.updateStatus(order.product_id, 'sold');
    }
    
    res.redirect('/seller/dashboard');
  } catch (err) {
    res.status(500).send('更新订单失败');
  }
});

// 取消交易
app.post('/seller/order/:id/cancel', requireSellerAuth, async (req, res) => {
  const orderId = req.params.id;
  
  try {
    // 更新订单状态
    const order = await Order.findById(orderId);
    if (order) {
      await Order.updateStatus(orderId, 'cancelled');
      // 恢复商品状态为可售
      await Product.updateStatus(order.product_id, 'available');
    }
    
    res.redirect('/seller/dashboard');
  } catch (err) {
    res.status(500).send('更新订单失败');
  }
});

// 查看历史商品
app.get('/seller/products/history', requireSellerAuth, async (req, res) => {
  try {
    const products = await Product.getAll();
    res.render('seller/history', { products });
  } catch (err) {
    res.status(500).send('读取数据失败');
  }
});

// 修改密码页面
app.get('/seller/change-password', requireSellerAuth, (req, res) => {
  res.render('seller/change-password');
});

// 处理修改密码
app.post('/seller/change-password', requireSellerAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  try {
    const seller = await Seller.findById(req.session.sellerId);
    
    if (seller && require('bcryptjs').compareSync(oldPassword, seller.password_hash)) {
      await Seller.updatePassword(req.session.sellerId, newPassword);
      res.render('seller/change-password', { success: '密码修改成功' });
    } else {
      res.render('seller/change-password', { error: '原密码错误' });
    }
  } catch (err) {
    res.status(500).send('更新密码失败');
  }
});

// 初始化数据库
async function initializeDatabase() {
  try {
    await Product.createTable();
    await User.createTable();
    await Order.createTable();
    await Seller.createTable();
    await Seller.initializeDefaultSeller();
    console.log('数据库初始化完成');
  } catch (err) {
    console.error('数据库初始化失败:', err);
  }
}

// 启动服务器
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('启动服务器失败:', err);
});