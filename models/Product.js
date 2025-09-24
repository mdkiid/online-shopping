// 文件名: models/Product.js
const db = require('../config/db');

class Product {
  // 创建商品表
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        price DECIMAL(10, 2) NOT NULL,
        status ENUM('available', 'frozen', 'sold') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.execute(sql);
  }

  // 获取所有可用商品
  static async getAvailable() {
    const [rows] = await db.execute(
      'SELECT * FROM products WHERE status = ? ORDER BY created_at DESC',
      ['available']
    );
    return rows;
  }

  // 获取所有商品（按创建时间倒序）
  static async getAll() {
    const [rows] = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
    return rows;
  }

  // 根据ID获取商品
  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0];
  }

  // 创建新商品
  static async create(product) {
    const { id, name, description, image_url, price } = product;
    const sql = `
      INSERT INTO products (id, name, description, image_url, price, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [id, name, description, image_url, price, 'available']);
    return result;
  }

  // 更新商品状态
  static async updateStatus(id, status) {
    const sql = 'UPDATE products SET status = ? WHERE id = ?';
    const [result] = await db.execute(sql, [status, id]);
    return result;
  }
}

module.exports = Product;