// 文件名: models/User.js
const db = require('../config/db');

class User {
  // 创建用户表
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.execute(sql);
  }

  // 创建新用户
  static async create(user) {
    const { id, name, email, phone } = user;
    const sql = `
      INSERT INTO users (id, name, email, phone)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [id, name, email, phone]);
    return result;
  }

  // 根据ID查找用户
  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }
}

module.exports = User;