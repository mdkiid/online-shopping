// 文件名: routes/api.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Seller = require('../models/Seller');

const router = express.Router();

// 前台API路由
// 获取首页商品
router.get('/products/latest', async (req, res) => {
  try {
    const products = await Product.getAvailable();
    const product = products.length > 0 ? products[0] : null;
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: '获取商品失败' });
  }
});

// 创建订单
router.post('/checkout', async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    // 创建用户
    const userId = uuidv4();
    const newUser = { id: userId, name, email, phone };
    await User.create(newUser);

    // 获取当前可购买的商品
    const products = await Product.getAvailable();
    if (products.length === 0) {
      return res.status(400).json({ error: '没有可购买的商品' });
    }

    const product = products[0];

    // 创建订单
    const orderId = uuidv4();
    const newOrder = { id: orderId, product_id: product.id, user_id: userId };
    await Order.create(newOrder);

    // 冻结商品
    await Product.updateStatus(product.id, 'frozen');

    res.json({ success: true, orderId });
  } catch (err) {
    res.status(500).json({ error: '创建订单失败: ' + err.message });
  }
});

// 卖家API路由
// 卖家登录
router.post('/seller/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const seller = await Seller.findByUsername(username);

    if (seller && bcrypt.compareSync(password, seller.password_hash)) {
      req.session.sellerId = seller.id;
      res.json({ success: true, seller: { id: seller.id, username: seller.username } });
    } else {
      res.status(401).json({ error: '用户名或密码错误' });
    }
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

// 卖家登出
router.post('/seller/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// 卖家仪表盘数据
router.get('/seller/dashboard', async (req, res) => {
  if (!req.session.sellerId) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    // 获取最新商品
    const products = await Product.getAll();
    const product = products.length > 0 ? products[0] : null;

    // 获取待处理订单
    const orders = await Order.getPending();

    res.json({ product, orders });
  } catch (err) {
    res.status(500).json({ error: '获取数据失败' });
  }
});

// 发布新商品
router.post('/seller/product', async (req, res) => {
  if (!req.session.sellerId) {
    return res.status(401).json({ error: '未登录' });
  }

  const { name, description, price, image_url } = req.body;

  try {
    const newProduct = {
      id: uuidv4(),
      name,
      description,
      image_url: image_url || '/images/default.jpg',
      price: parseFloat(price)
    };
    await Product.create(newProduct);
    res.json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ error: '发布商品失败' });
  }
});

// 完成订单
router.post('/seller/order/:id/complete', async (req, res) => {
  if (!req.session.sellerId) {
    return res.status(401).json({ error: '未登录' });
  }

  const orderId = req.params.id;

  try {
    // 更新订单状态
    const order = await Order.findById(orderId);
    if (order) {
      await Order.updateStatus(orderId, 'completed');
      // 更新商品状态为已售
      await Product.updateStatus(order.product_id, 'sold');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '订单不存在' });
    }
  } catch (err) {
    res.status(500).json({ error: '更新订单失败' });
  }
});

// 取消订单
router.post('/seller/order/:id/cancel', async (req, res) => {
  if (!req.session.sellerId) {
    return res.status(401).json({ error: '未登录' });
  }

  const orderId = req.params.id;

  try {
    // 更新订单状态
    const order = await Order.findById(orderId);
    if (order) {
      await Order.updateStatus(orderId, 'cancelled');
      // 恢复商品状态为可售
      await Product.updateStatus(order.product_id, 'available');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '订单不存在' });
    }
  } catch (err) {
    res.status(500).json({ error: '更新订单失败' });
  }
});

// 获取历史商品
router.get('/seller/products/history', async (req, res) => {
  if (!req.session.sellerId) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const products = await Product.getAll();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: '获取商品失败' });
  }
});

// 修改密码
router.post('/seller/change-password', async (req, res) => {
  if (!req.session.sellerId) {
    return res.status(401).json({ error: '未登录' });
  }

  const { oldPassword, newPassword } = req.body;

  try {
    const seller = await Seller.findById(req.session.sellerId);

    if (seller && bcrypt.compareSync(oldPassword, seller.password_hash)) {
      await Seller.updatePassword(req.session.sellerId, newPassword);
      res.json({ success: true, message: '密码修改成功' });
    } else {
      res.status(400).json({ error: '原密码错误' });
    }
  } catch (err) {
    res.status(500).json({ error: '更新密码失败' });
  }
});

module.exports = router;