// 文件名: models/Seller.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

class Seller {
  // 创建卖家表
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS sellers (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL
      )
    `;
    await db.execute(sql);
  }

  // 初始化默认卖家账户
  static async initializeDefaultSeller() {
    const [rows] = await db.execute('SELECT COUNT(*) as count FROM sellers');
    if (rows[0].count === 0) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync("password123", salt);
      const id = require('uuid').v4();
      const sql = 'INSERT INTO sellers (id, username, password_hash) VALUES (?, ?, ?)';
      await db.execute(sql, [id, 'admin', hash]);
    }
  }

  // 根据用户名查找卖家
  static async findByUsername(username) {
    const [rows] = await db.execute('SELECT * FROM sellers WHERE username = ?', [username]);
    return rows[0];
  }

  // 根据ID查找卖家
  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM sellers WHERE id = ?', [id]);
    return rows[0];
  }

  // 更新密码
  static async updatePassword(id, newPassword) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    const sql = 'UPDATE sellers SET password_hash = ? WHERE id = ?';
    const [result] = await db.execute(sql, [hash, id]);
    return result;
  }
}

module.exports = Seller;