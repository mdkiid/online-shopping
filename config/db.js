// 文件名: config/db.js
// MySQL数据库配置
const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '123', // 请根据实际情况修改
  database: 'onlineshop', // 请根据实际情况修改
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

module.exports = pool;