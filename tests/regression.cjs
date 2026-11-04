const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fork } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('UI ships compiled CSS and statically named Lucide icons locally', () => {
    const html = read('public/index.html');
    assert(!html.includes('cdn.tailwindcss.com'));
    assert(!html.includes('unpkg.com'));
    assert(!html.includes('tailwind.config'));
    assert(html.includes('/css/tailwind.css'));
    assert(html.includes('/js/vendor/lucide.min.js'));
    assert(!read('public/css/style.css').includes('fonts.googleapis.com'));
    const fonts = read('public/css/fonts.css');
    for (const match of fonts.matchAll(/url\(\.\.\/fonts\/([^)]*)\)/g)) {
        assert(fs.existsSync(path.join(root, 'public/fonts', match[1])), `Missing font: ${match[1]}`);
    }
    const lucide = require('../public/js/vendor/lucide.min.js');
    const source = html + read('public/js/app.js');
    const names = [...new Set([...source.matchAll(/data-lucide=["']([a-z0-9-]+)["']/g)].map(m => m[1]))];
    for (const name of names) {
        const key = name.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
        assert(lucide.icons[key], `Missing icon: ${name}`);
    }
    const css = read('public/css/tailwind.css');
    for (const selector of ['.hidden{', '.flex{', '.fixed{', '.bg-slate-900{']) assert(css.includes(selector), selector);
});

test('fresh and legacy databases support direct-message streaks; migration is repeatable', async () => {
    for (const legacy of [false, true]) {
        const module = { exports: {} };
        vm.runInNewContext(read('data/db.js').replace("path.join(__dirname, 'no2ta.db')", "':memory:'"), {
            require, module, __dirname: path.join(root, 'data'), console: { log() {} }
        });
        const db = module.exports;
        try {
            if (legacy) await db.run(`CREATE TABLE streaks (id TEXT PRIMARY KEY, user_a TEXT, user_b TEXT, streak_count INTEGER DEFAULT 1, last_interaction_date TEXT, is_frozen INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_a,user_b))`);
            await db.initDB();
            await db.initDB();
            assert((await db.all('PRAGMA table_info(streaks)')).some(c => c.name === 'interaction_count'));
            await db.run("INSERT INTO users(id,nickname) VALUES ('a','A'),('b','B')");
            const streakModule = { exports: {} };
            vm.runInNewContext(read('services/streaks.js'), {
                require: name => name === '../data/db' ? db : require(name), module: streakModule
            });
            for (let i = 0; i < 3; i++) await streakModule.exports.recordInteraction('a', 'b');
            const row = await db.get('SELECT * FROM streaks');
            assert.equal(row.interaction_count, 3);
            assert.equal(row.streak_count, 2);
            const sessionModule = { exports: {} };
            vm.runInNewContext(read('services/sessions.js'), {
                require: name => name === '../data/db' ? db : require(name), module: sessionModule
            });
            const sessions = sessionModule.exports;
            await sessions.initialize();
            let token;
            await sessions.issue({cookie(name, value, options) { token = value; assert(options.httpOnly); }}, {id:'a'}, false);
            const headers = {cookie:'no2ta_session=' + token};
            assert.equal((await sessions.resolve(headers)).id, 'a');
            assert.notEqual((await db.get('SELECT token_hash FROM auth_sessions')).token_hash, token);
            await db.run('UPDATE auth_sessions SET expires_at=0');
            assert.equal(await sessions.resolve(headers), undefined);
        } finally { await new Promise((resolve, reject) => db.db.close(err => err ? reject(err) : resolve())); }
    }
});

function event(socket, name) {
    return new Promise((resolve, reject) => {
        const listener = data => { clearTimeout(timer); resolve(data); };
        const timer = setTimeout(() => { socket.off(name, listener); reject(new Error(`Timed out: ${name}`)); }, 7000);
        socket.once(name, listener);
    });
}

test('two clients receive game state, direct messages and paginated history', { timeout: 120000 }, async () => {
    const child = fork(path.join(root, 'scripts/qa-server.cjs'), [], { env: { ...process.env, PORT: '5002' }, silent: true });
    child.stdout.resume();
    child.stderr.resume();
    const base = 'http://127.0.0.1:5002';
    const clients = [];
    try {
        let ready = false;
        for (let i = 0; i < 40; i++) {
            try { ready = (await fetch(base + '/api/tasbeeh')).ok; } catch {}
            if (ready) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert(ready, 'Isolated server did not start');
        for (const url of ['/css/tailwind.css', '/js/vendor/lucide.min.js']) assert((await fetch(base + url)).ok);
        const io = require('socket.io-client').io;
        const password = read('server.js').match(/const MASTER_PASSWORD = '([^']+)'/)[1];
        const users = [], cookies = [];
        assert.equal((await fetch(base + '/api/messages')).status, 401);
        for (let i = 0; i < 2; i++) {
            const response = await fetch(base + '/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, nickname: 'QA ' + i })
            });
            users.push((await response.json()).user);
            const cookie = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
            cookies.push(cookie);
            const socket = io(base, { transports: ['websocket'], reconnection: false, extraHeaders: { Cookie: cookie } });
            clients.push(socket);
            await event(socket, 'connect');
            const presence = event(socket, 'codepad_sync');
            socket.emit('register_presence', users[i]);
            await presence;
        }
        const authFetch = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, Cookie: cookies[0] } });
        assert.equal((await authFetch(base + '/api/users/profile', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:users[1].id,nickname:'forged'}) })).status,403);
        assert.equal((await authFetch(base + '/api/messages?chat_type=direct&user_id=' + users[1].id + '&recipient_id=' + users[0].id)).status,403);
        const deniedSocket = io(base, {transports:['websocket'],reconnection:false});
        assert.equal((await event(deniedSocket,'connect_error')).message,'Unauthorized');
        deniedSocket.disconnect();
        const [a, b] = clients;
        const roleSync = event(b, 'codepad_sync');
        b.emit('register_presence', {...users[1], role:'admin'});
        await roleSync;
        assert.equal((await (await fetch(base + '/api/auth/me', {headers:{Cookie:cookies[1]}})).json()).user.role, 'student');
        assert.equal((await authFetch(base + '/api/admin/devices')).status, 403);
        const groupResponse = await authFetch(base + '/api/groups', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Private QA',creatorId:users[0].id})});
        const privateGroup = (await groupResponse.json()).group;
        assert(privateGroup);
        const forbiddenGroup = await fetch(base + '/api/messages?chat_type=group&group_id=' + privateGroup.id + '&user_id=' + users[1].id, {headers:{Cookie:cookies[1]}});
        assert.equal(forbiddenGroup.status,403);
        const groupDenied = event(b, 'error_notification');
        b.emit('send_message', {senderId:users[1].id,recipientId:privateGroup.id,chatType:'group',content:'not a member'});
        assert((await groupDenied).message);
        const first = event(a, 'math_game_state');
        const second = event(b, 'math_game_state');
        a.emit('math_game_start');
        const [stateA, stateB] = await Promise.all([first, second]);
        assert.equal(stateA.question, stateB.question);
        assert.equal(stateA.total, 8);
        const denied = event(b, 'error_notification');
        b.emit('math_game_start');
        assert((await denied).message.includes('تحدي'));
        const [x, op, y] = stateA.question.split(' ');
        const answer = op === '+' ? +x + +y : op === '-' ? +x - +y : +x * +y;
        const winner = event(b, 'math_game_round_result');
        a.emit('math_game_answer', { answer, nickname: 'QA' });
        assert.equal((await winner).winner, 'QA');

        assert.notEqual(users[0].id, users[1].id);
        const received = event(b, 'new_message');
        a.emit('send_message', { senderId: users[0].id, recipientId: users[1].id, chatType: 'direct', content: 'QA direct message' });
        const message = await received;
        assert.equal(message.message.content, 'QA direct message');
        assert.equal(message.streakInfo.streak_count, 1);
        const spoof = event(b, 'error_notification');
        b.emit('send_message', { senderId: users[0].id, chatType:'general', content:'forged' });
        assert((await spoof).message);
        for (let i = 0; i < 155; i++) {
            const delivered = event(a, 'new_message');
            a.emit('send_message', { senderId: users[0].id, chatType: 'general', content: `history-${i}` });
            await delivered;
        }
        const latest = await (await authFetch(base + '/api/messages')).json();
        assert.equal(latest.length, 150);
        assert.equal(latest[0].content, 'history-5');
        assert.equal(latest[149].content, 'history-154');
        const previous = await (await authFetch(base + '/api/messages?before=' + latest[0].sequence)).json();
        assert.equal(previous.length, 5);
        assert.equal(previous[0].content, 'history-0');
        assert.equal(new Set([...previous, ...latest].map(m => m.id)).size, 155);
        assert.equal((await authFetch(base + '/api/messages?before=invalid')).status, 400);
        const disconnected = event(a, 'disconnect');
        assert.equal((await authFetch(base + '/api/auth/logout', {method:'POST'})).status, 200);
        await disconnected;
        assert.equal((await authFetch(base + '/api/auth/me')).status, 401);
    } finally {
        for (const socket of clients) socket.disconnect();
        if (child.connected) {
            const exited = new Promise(resolve => child.once('exit', resolve));
            child.send('stop');
            await exited;
        }
    }
});
