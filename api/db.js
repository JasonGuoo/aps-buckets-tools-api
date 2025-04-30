// db.js - SQLite 数据库初始化与连接管理
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '../server/job.db');

function initDb() {
    if (!fs.existsSync(DB_PATH)) {
        const db = new sqlite3.Database(DB_PATH);
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS job (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        status TEXT,
        progress INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        zip_path TEXT,
        error_msg TEXT
      )`);
        });
        db.close();
    }
}

// 初始化数据库（只在首次 require 时执行一次）
initDb();

// 导出数据库连接工厂
function getDb() {
    return new sqlite3.Database(DB_PATH);
}

module.exports = {
    getDb
}; 