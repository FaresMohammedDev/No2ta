const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'no2ta.db');
const db = new sqlite3.Database(dbPath);

// Helper for Promisified Queries
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
};

// Initialize Tables
const initDB = async () => {
    await run(`PRAGMA foreign_keys = ON;`);

    // Users
    await run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        device_id TEXT UNIQUE,
        ip_address TEXT,
        mac_address TEXT,
        nickname TEXT NOT NULL,
        avatar TEXT,
        bio TEXT DEFAULT 'طالب جامد في فصل العباقرة ⚡',
        role TEXT DEFAULT 'student',
        is_online INTEGER DEFAULT 0,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    // Messages
    await run(`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT,
        chat_type TEXT DEFAULT 'general',
        content TEXT,
        media_url TEXT,
        media_type TEXT,
        media_name TEXT,
        media_size INTEGER DEFAULT 0,
        is_disappearing INTEGER DEFAULT 0,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Message Reactions
    await run(`CREATE TABLE IF NOT EXISTS message_reactions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        emoji TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id),
        FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Stories
    await run(`CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        media_url TEXT,
        media_type TEXT DEFAULT 'text',
        text_content TEXT,
        bg_gradient TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Story Views
    await run(`CREATE TABLE IF NOT EXISTS story_views (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(story_id, user_id),
        FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Streaks
    await run(`CREATE TABLE IF NOT EXISTS streaks (
        id TEXT PRIMARY KEY,
        user_a TEXT NOT NULL,
        user_b TEXT NOT NULL,
        streak_count INTEGER DEFAULT 1,
        last_interaction_date TEXT,
        is_frozen INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_a, user_b),
        FOREIGN KEY(user_a) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(user_b) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // Classroom AirDrop Files
    await run(`CREATE TABLE IF NOT EXISTS airdrop_files (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        file_url TEXT NOT NULL,
        downloads_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );`);

    // System Settings (Focus mode, Stealth status, etc.)
    await run(`CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );`);

    // Default settings
    await run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('focus_mode', '0');`);
    await run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('stealth_active', '0');`);
    await run(`INSERT OR IGNORE INTO system_settings (key, value) VALUES ('whiteboard_locked', '0');`);

    console.log('✅ SQLite Database & Tables Initialized Successfully');
};

module.exports = {
    db,
    run,
    get,
    all,
    initDB
};
