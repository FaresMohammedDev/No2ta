const crypto = require('crypto');
const { run, get } = require('../data/db');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function cookie(headers, name) {
    const value = (headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
    return value ? value.slice(name.length + 1) : '';
}
async function initialize() {
    await run(`CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL)`);
}
async function resolve(headers) {
    const token = cookie(headers, 'no2ta_session');
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    return get(`SELECT u.*, s.token_hash as session_hash FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`, [hash(token), Date.now()]);
}
async function issue(res, user, secure) {
    const token = crypto.randomBytes(32).toString('hex');
    await run('DELETE FROM auth_sessions WHERE expires_at <= ?', [Date.now()]);
    await run('INSERT INTO auth_sessions VALUES (?, ?, ?)', [hash(token), user.id, Date.now() + 12*60*60*1000]);
    res.cookie('no2ta_session', token, { httpOnly: true, sameSite: 'strict', secure, maxAge: 12*60*60*1000, path: '/' });
}
module.exports = { initialize, resolve, issue, cookie, hash };
