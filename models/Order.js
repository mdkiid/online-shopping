// 文件名: models/Order.js
const db = require('../config/db');

class Order {
  // 创建订单表
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.execute(sql);
  }

  // 创建新订单
  static async create(order) {
    const { id, product_id, user_id } = order;
    const sql = `
      INSERT INTO orders (id, product_id, user_id, status)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [id, product_id, user_id, 'pending']);
    return result;
  }

  // 获取所有待处理订单
  static async getPending() {
    const sql = `
      SELECT o.*, p.name as product_name, u.name as user_name, u.email, u.phone
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE o.status = ?
      ORDER BY o.created_at DESC
    `;
    const [rows] = await db.execute(sql, ['pending']);
    return rows;
  }

  // 根据ID查找订单
  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM orders WHERE id = ?', [id]);
    return rows[0];
  }

  // 更新订单状态
  static async updateStatus(id, status) {
    const sql = 'UPDATE orders SET status = ? WHERE id = ?';
    const [result] = await db.execute(sql, [status, id]);
    return result;
  }
}

module.exports = Order;