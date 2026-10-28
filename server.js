const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const crypto = require('crypto');

const { db, run, get, all, initDB } = require('./data/db');
const { cleanIP, getServerLanIPs, resolveMacAddress } = require('./services/network');
const { recordInteraction, getStreakBetween, getAllUserStreaks, isWeekendFreeze } = require('./services/streaks');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 50 * 1024 * 1024 // 50MB max file transfer
});

const PORT = process.env.PORT || 5000;
const MASTER_PASSWORD = 'SdSdSdSd';
const ADMIN_PASSWORD = 'SdSdSdSdAdmin';

// MAC Addresses for the Host Admin Device
const HOST_ADMIN_MACS = new Set([
    'D0:8E:79:18:9F:A0',
    'D0-8E-79-18-9F-A0',
    'd0:8e:79:18:9f:a0',
    '00:50:56:C0:00:01',
    '00:50:56:C0:00:08'
]);

// Helper to determine if the connecting device is THIS Admin Machine
function isHostAdmin(clientIp, clientMac) {
    if (clientMac) {
        const cleanMac = clientMac.toUpperCase().replace(/-/g, ':');
        for (const m of HOST_ADMIN_MACS) {
            if (m.toUpperCase().replace(/-/g, ':') === cleanMac) return true;
        }
    }
    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') return true;
    const lanIps = getServerLanIPs();
    if (lanIps.some(item => item.address === clientIp)) return true;
    return false;
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure Upload directories exist
const uploadDirs = ['uploads', 'uploads/media', 'uploads/audio', 'uploads/stories', 'uploads/airdrop'];
uploadDirs.forEach(dir => {
    const full = path.join(__dirname, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// Configure Multer for Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = 'uploads/media';
        if (req.path.includes('audio')) dest = 'uploads/audio';
        else if (req.path.includes('story')) dest = 'uploads/stories';
        else if (req.path.includes('airdrop')) dest = 'uploads/airdrop';
        cb(null, path.join(__dirname, dest));
    },
    filename: (req, file, cb) => {
        const unique = crypto.randomUUID();
        const ext = path.extname(file.originalname);
        cb(null, `${unique}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// In-Memory Real-time State
const onlineUsers = new Map(); // socketId -> { userId, ip, mac, nickname, role, ping }
const userSockets = new Map(); // userId -> Set of socketIds
let whiteboardHistory = []; // Last 1000 draw actions for live sync
let isChatFocusLocked = false;
let isStealthEngaged = false;

// ---------------------- REST API ROUTES ----------------------

// 1. Network Info & QR Code
app.get('/api/network-info', async (req, res) => {
    try {
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);
        const lanIps = getServerLanIPs();
        const primaryLan = lanIps.find(i => i.address.startsWith('192.168.')) || lanIps[0] || { address: '127.0.0.1' };
        const joinUrl = `http://${primaryLan.address}:${PORT}`;
        const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, { margin: 2, scale: 6 });

        res.json({
            clientIp,
            clientMac: clientMac || 'N/A',
            isHostAdmin: isDeviceAdmin,
            isAdmin: isDeviceAdmin,
            lanIps,
            primaryLanIp: primaryLan.address,
            port: PORT,
            joinUrl,
            qrCodeDataUrl,
            isWeekend: isWeekendFreeze()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Authentication & Auto-Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { password, nickname, avatar, bio, deviceId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);

        // Hardware-based Admin detection: THIS MACHINE (MAC D0:8E:79:18:9F:A0 / localhost) is ALWAYS ADMIN!
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);
        const isAdmin = isDeviceAdmin || (password === ADMIN_PASSWORD);

        if (!isDeviceAdmin && password !== MASTER_PASSWORD && password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'كلمة السر غير صحيحة! الباسوورد هو SdSdSdSd' });
        }

        const effectiveDeviceId = deviceId || (clientMac ? `mac_${clientMac}` : `ip_${clientIp}`);

        // Check if user already exists
        let user = await get(`SELECT * FROM users WHERE device_id = ? OR mac_address = ?`, [effectiveDeviceId, clientMac]);

        const defaultNickname = isAdmin ? 'كبير الفصل (الأدمن)' : `عبقري_${clientIp.split('.').pop()}`;
        const chosenNickname = nickname ? nickname.trim() : (user ? user.nickname : defaultNickname);
        const chosenAvatar = avatar || (user ? user.avatar : (isAdmin ? '👑' : '🚀'));
        const chosenBio = bio || (user ? user.bio : (isAdmin ? 'أدمن الفصل والمتحكم في الشبكة 👑⚡' : 'طالب جامد في فصل العباقرة ⚡'));
        const chosenRole = isAdmin ? 'admin' : (user ? user.role : 'student');

        if (user) {
            // Update existing user
            await run(
                `UPDATE users SET ip_address = ?, mac_address = ?, nickname = ?, avatar = ?, bio = ?, role = ?, is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
                [clientIp, clientMac || user.mac_address, chosenNickname, chosenAvatar, chosenBio, chosenRole, user.id]
            );
            user = await get(`SELECT * FROM users WHERE id = ?`, [user.id]);
        } else {
            // Create new user
            const newId = crypto.randomUUID();
            await run(
                `INSERT INTO users (id, device_id, ip_address, mac_address, nickname, avatar, bio, role, is_online)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [newId, effectiveDeviceId, clientIp, clientMac, chosenNickname, chosenAvatar, chosenBio, chosenRole]
            );
            user = await get(`SELECT * FROM users WHERE id = ?`, [newId]);
        }

        res.json({
            success: true,
            user,
            isAdmin: user.role === 'admin',
            masterPasswordCorrect: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get All Users
app.get('/api/users', async (req, res) => {
    try {
        const users = await all(`SELECT id, nickname, avatar, bio, role, is_online, last_seen, ip_address, mac_address FROM users ORDER BY is_online DESC, nickname ASC`);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Update Profile
app.post('/api/users/profile', async (req, res) => {
    try {
        const { userId, nickname, avatar, bio } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        await run(
            `UPDATE users SET nickname = COALESCE(?, nickname), avatar = COALESCE(?, avatar), bio = COALESCE(?, bio) WHERE id = ?`,
            [nickname, avatar, bio, userId]
        );
        const updated = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
        io.emit('user_profile_updated', updated);
        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Get Messages
app.get('/api/messages', async (req, res) => {
    try {
        const { chat_type = 'general', recipient_id, user_id } = req.query;

        // Clean up expired disappearing messages before query
        await run(`DELETE FROM messages WHERE is_disappearing = 1 AND expires_at < CURRENT_TIMESTAMP`);

        let messages = [];
        if (chat_type === 'general') {
            messages = await all(
                `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'general'
                 ORDER BY m.created_at ASC
                 LIMIT 150`
            );
        } else if (chat_type === 'direct' && recipient_id && user_id) {
            messages = await all(
                `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'direct' AND
                 ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
                 ORDER BY m.created_at ASC
                 LIMIT 150`,
                [user_id, recipient_id, recipient_id, user_id]
            );
        }

        // Attach reactions
        const msgIds = messages.map(m => m.id);
        let reactionsMap = {};
        if (msgIds.length > 0) {
            const placeholders = msgIds.map(() => '?').join(',');
            const reactions = await all(
                `SELECT r.*, u.nickname as user_name FROM message_reactions r
                 JOIN users u ON r.user_id = u.id
                 WHERE r.message_id IN (${placeholders})`,
                msgIds
            );
            reactions.forEach(r => {
                if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
                reactionsMap[r.message_id].push(r);
            });
        }

        const enriched = messages.map(m => ({
            ...m,
            reactions: reactionsMap[m.id] || []
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Media and Audio Upload Endpoints
app.post('/api/upload/media', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/media/${req.file.filename}`;
    res.json({
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype.startsWith('image/') ? 'image' : (req.file.mimetype.startsWith('video/') ? 'video' : 'file')
    });
});

app.post('/api/upload/audio', upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No audio recorded' });
    const audioUrl = `/uploads/audio/${req.file.filename}`;
    res.json({
        url: audioUrl,
        name: 'تسجيل صوتي 🎙️',
        size: req.file.size,
        type: 'audio'
    });
});

// 7. Instagram Stories Endpoints
app.get('/api/stories', async (req, res) => {
    try {
        const { userId } = req.query;
        // Expire stories older than 24h
        await run(`DELETE FROM stories WHERE expires_at < CURRENT_TIMESTAMP`);

        const stories = await all(
            `SELECT s.*, u.nickname as author_name, u.avatar as author_avatar, u.role as author_role,
                (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) as views_count
             FROM stories s
             JOIN users u ON s.user_id = u.id
             ORDER BY s.created_at DESC`
        );

        // Group stories by author
        const authorGroups = {};
        for (const story of stories) {
            if (!authorGroups[story.user_id]) {
                authorGroups[story.user_id] = {
                    userId: story.user_id,
                    authorName: story.author_name,
                    authorAvatar: story.author_avatar,
                    stories: [],
                    hasUnseen: false
                };
            }
            // Check if current user viewed this story
            let viewed = false;
            if (userId) {
                const view = await get(`SELECT id FROM story_views WHERE story_id = ? AND user_id = ?`, [story.id, userId]);
                viewed = !!view;
            }
            if (!viewed) authorGroups[story.user_id].hasUnseen = true;
            authorGroups[story.user_id].stories.push({ ...story, viewed });
        }

        res.json(Object.values(authorGroups));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stories', upload.single('file'), async (req, res) => {
    try {
        const { userId, text_content, bg_gradient } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID is required' });

        let mediaUrl = null;
        let mediaType = 'text';

        if (req.file) {
            mediaUrl = `/uploads/stories/${req.file.filename}`;
            mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
        }

        const id = crypto.randomUUID();
        // Expires in 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        await run(
            `INSERT INTO stories (id, user_id, media_url, media_type, text_content, bg_gradient, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, mediaUrl, mediaType, text_content || '', bg_gradient || 'from-purple-600 to-pink-500', expiresAt]
        );

        const newStory = await get(
            `SELECT s.*, u.nickname as author_name, u.avatar as author_avatar
             FROM stories s JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
            [id]
        );

        io.emit('new_story_published', newStory);
        res.json({ success: true, story: newStory });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stories/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'User ID required' });

        const viewId = crypto.randomUUID();
        await run(`INSERT OR IGNORE INTO story_views (id, story_id, user_id) VALUES (?, ?, ?)`, [viewId, id, userId]);

        const viewsCount = await get(`SELECT COUNT(*) as count FROM story_views WHERE story_id = ?`, [id]);
        io.emit('story_view_updated', { storyId: id, viewsCount: viewsCount.count });

        res.json({ success: true, viewsCount: viewsCount.count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Streaks API
app.get('/api/streaks/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const streaks = await getAllUserStreaks(userId);
        res.json({
            isWeekend: isWeekendFreeze(),
            streaks
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Classroom AirDrop API
app.get('/api/airdrop/files', async (req, res) => {
    try {
        const files = await all(
            `SELECT a.*, u.nickname as sender_name, u.avatar as sender_avatar
             FROM airdrop_files a
             JOIN users u ON a.sender_id = u.id
             ORDER BY a.created_at DESC`
        );
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/airdrop/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });
        const { senderId } = req.body;
        const id = crypto.randomUUID();
        const fileUrl = `/uploads/airdrop/${req.file.filename}`;

        await run(
            `INSERT INTO airdrop_files (id, sender_id, file_name, file_size, file_url)
             VALUES (?, ?, ?, ?, ?)`,
            [id, senderId, req.file.originalname, req.file.size, fileUrl]
        );

        const newDrop = await get(
            `SELECT a.*, u.nickname as sender_name, u.avatar as sender_avatar
             FROM airdrop_files a JOIN users u ON a.sender_id = u.id WHERE a.id = ?`,
            [id]
        );

        io.emit('airdrop_new_file', newDrop);
        res.json({ success: true, file: newDrop });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/airdrop/download/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await run(`UPDATE airdrop_files SET downloads_count = downloads_count + 1 WHERE id = ?`, [id]);
        const file = await get(`SELECT * FROM airdrop_files WHERE id = ?`, [id]);
        io.emit('airdrop_download_incremented', { id, count: file ? file.downloads_count : 0 });
        res.json({ success: true, count: file ? file.downloads_count : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Admin API
app.get('/api/admin/devices', async (req, res) => {
    try {
        const devices = [];
        for (const [socketId, info] of onlineUsers.entries()) {
            devices.push({ socketId, ...info });
        }
        res.json({
            isChatFocusLocked,
            isStealthEngaged,
            totalOnline: onlineUsers.size,
            devices
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/action', async (req, res) => {
    try {
        const { adminKey, action, payload } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        if (!isDeviceAdmin && adminKey !== ADMIN_PASSWORD && adminKey !== MASTER_PASSWORD) {
            return res.status(403).json({ error: 'غير مصرح لك بعمليات الأدمن!' });
        }

        switch (action) {
            case 'broadcast_alert':
                io.emit('admin_global_announcement', {
                    message: payload.message,
                    title: payload.title || '📢 إذاعة الفصل العامة من الأدمن',
                    time: new Date().toLocaleTimeString('ar-EG')
                });
                break;

            case 'toggle_focus_mode':
                isChatFocusLocked = !isChatFocusLocked;
                await run(`UPDATE system_settings SET value = ? WHERE key = 'focus_mode'`, [isChatFocusLocked ? '1' : '0']);
                io.emit('chat_focus_mode_changed', { isLocked: isChatFocusLocked });
                break;

            case 'stealth_release':
                isStealthEngaged = false;
                await run(`UPDATE system_settings SET value = '0' WHERE key = 'stealth_active'`);
                io.emit('GLOBAL_STEALTH_RELEASED', { message: 'البشمهندسة مشيت! عودوا للشات بأمان 🚀' });
                break;

            case 'kick_user':
                const targetSocketIds = userSockets.get(payload.userId);
                if (targetSocketIds) {
                    targetSocketIds.forEach(sId => {
                        io.to(sId).emit('user_kicked', { reason: payload.reason || 'تم طردك بواسطة الأدمن!' });
                    });
                }
                break;

            case 'delete_message':
                await run(`DELETE FROM messages WHERE id = ?`, [payload.messageId]);
                io.emit('message_deleted', { messageId: payload.messageId });
                break;

            case 'delete_story':
                await run(`DELETE FROM stories WHERE id = ?`, [payload.storyId]);
                io.emit('story_deleted', { storyId: payload.storyId });
                break;

            case 'boost_streak':
                const streakId = payload.streakId;
                const bonus = parseInt(payload.bonus || 1);
                await run(`UPDATE streaks SET streak_count = streak_count + ? WHERE id = ?`, [bonus, streakId]);
                const updatedStreak = await get(`SELECT * FROM streaks WHERE id = ?`, [streakId]);
                io.emit('streak_boosted', updatedStreak);
                break;

            case 'clear_whiteboard':
                whiteboardHistory = [];
                io.emit('whiteboard_cleared');
                break;
        }

        res.json({ success: true, action, isChatFocusLocked, isStealthEngaged });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------- SOCKET.IO REALTIME ENGINE ----------------------

io.on('connection', async (socket) => {
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const clientIp = cleanIP(rawIp);
    const clientMac = await resolveMacAddress(clientIp);

    // Initial Registration
    socket.on('register_presence', async (userData) => {
        if (!userData || !userData.id) return;

        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);
        const effectiveRole = isDeviceAdmin ? 'admin' : (userData.role || 'student');

        onlineUsers.set(socket.id, {
            socketId: socket.id,
            userId: userData.id,
            nickname: userData.nickname,
            avatar: userData.avatar,
            role: effectiveRole,
            ip: clientIp,
            mac: clientMac || 'N/A',
            connectedAt: new Date()
        });

        if (!userSockets.has(userData.id)) {
            userSockets.set(userData.id, new Set());
        }
        userSockets.get(userData.id).add(socket.id);

        await run(`UPDATE users SET is_online = 1, role = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [effectiveRole, userData.id]);

        // Send current whiteboard history
        socket.emit('whiteboard_init', whiteboardHistory);
        // Send current focus mode state
        socket.emit('chat_focus_mode_changed', { isLocked: isChatFocusLocked });
        // Send stealth state if already engaged
        if (isStealthEngaged) {
            socket.emit('GLOBAL_STEALTH_ENGAGED');
        }

        // Broadcast presence
        const onlineList = Array.from(userSockets.keys());
        io.emit('presence_update', { onlineUserIds: onlineList });
    });

    // 1. Send Message
    socket.on('send_message', async (data) => {
        try {
            if (isChatFocusLocked && data.role !== 'admin') {
                return socket.emit('error_notification', { message: 'الشات مقفول مؤقتاً بوضع التركيز من الأدمن!' });
            }

            const { senderId, recipientId, chatType, content, mediaUrl, mediaType, mediaName, mediaSize, disappearingSeconds } = data;
            const messageId = crypto.randomUUID();

            let isDisappearing = 0;
            let expiresAt = null;
            if (disappearingSeconds && Number(disappearingSeconds) > 0) {
                isDisappearing = 1;
                expiresAt = new Date(Date.now() + Number(disappearingSeconds) * 1000).toISOString().replace('T', ' ').slice(0, 19);
            }

            await run(
                `INSERT INTO messages (id, sender_id, recipient_id, chat_type, content, media_url, media_type, media_name, media_size, is_disappearing, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [messageId, senderId, recipientId || null, chatType || 'general', content || '', mediaUrl || null, mediaType || 'text', mediaName || null, mediaSize || 0, isDisappearing, expiresAt]
            );

            // Fetch created message with sender info
            const newMsg = await get(
                `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`,
                [messageId]
            );
            newMsg.reactions = [];

            // Update streak between sender and recipient
            let streakInfo = null;
            if (chatType === 'direct' && recipientId) {
                streakInfo = await recordInteraction(senderId, recipientId);
            }

            // Emit to appropriate clients
            if (chatType === 'general') {
                io.emit('new_message', { message: newMsg, streakInfo });
            } else if (chatType === 'direct') {
                // Send to sender sockets
                const senderSockets = userSockets.get(senderId);
                if (senderSockets) senderSockets.forEach(s => io.to(s).emit('new_message', { message: newMsg, streakInfo }));
                // Send to recipient sockets
                const recipientSockets = userSockets.get(recipientId);
                if (recipientSockets) recipientSockets.forEach(s => io.to(s).emit('new_message', { message: newMsg, streakInfo }));
            }
        } catch (err) {
            console.error('Error sending message:', err);
        }
    });

    // 2. Typing Indicator
    socket.on('typing_start', (data) => {
        socket.broadcast.emit('user_typing_start', data);
    });

    socket.on('typing_stop', (data) => {
        socket.broadcast.emit('user_typing_stop', data);
    });

    // 3. Message Reaction
    socket.on('toggle_reaction', async ({ messageId, userId, emoji }) => {
        try {
            const existing = await get(`SELECT id, emoji FROM message_reactions WHERE message_id = ? AND user_id = ?`, [messageId, userId]);
            if (existing) {
                if (existing.emoji === emoji) {
                    await run(`DELETE FROM message_reactions WHERE id = ?`, [existing.id]);
                } else {
                    await run(`UPDATE message_reactions SET emoji = ? WHERE id = ?`, [emoji, existing.id]);
                }
            } else {
                const reactionId = crypto.randomUUID();
                await run(`INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)`, [reactionId, messageId, userId, emoji]);
            }

            // Get updated reactions list
            const reactions = await all(
                `SELECT r.*, u.nickname as user_name FROM message_reactions r
                 JOIN users u ON r.user_id = u.id WHERE r.message_id = ?`,
                [messageId]
            );

            io.emit('message_reactions_updated', { messageId, reactions });
        } catch (err) {
            console.error('Error toggling reaction:', err);
        }
    });

    // 4. Collaborative Live Whiteboard
    socket.on('whiteboard_draw_step', (drawData) => {
        whiteboardHistory.push(drawData);
        if (whiteboardHistory.length > 2000) whiteboardHistory.shift();
        socket.broadcast.emit('whiteboard_draw_step', drawData);
    });

    socket.on('whiteboard_clear_board', () => {
        whiteboardHistory = [];
        io.emit('whiteboard_cleared');
    });

    // 5. GLOBAL PANIC BUTTON ("زر البشمهندسة" 🚨)
    // Accessible by ANY student! Instantly broadcasts to everyone in <15ms
    socket.on('TRIGGER_GLOBAL_PANIC', async () => {
        isStealthEngaged = true;
        await run(`UPDATE system_settings SET value = '1' WHERE key = 'stealth_active'`);
        const senderInfo = onlineUsers.get(socket.id);
        console.log(`🚨 [GLOBAL PANIC] Triggered by ${senderInfo ? senderInfo.nickname : 'Unknown'} (${clientIp})`);
        io.emit('GLOBAL_STEALTH_ENGAGED', {
            triggeredBy: senderInfo ? senderInfo.nickname : 'أحد الزملاء',
            timestamp: Date.now()
        });
    });

    // 6. Stealth Release
    socket.on('TRIGGER_STEALTH_RELEASE', async (pass) => {
        if (pass === MASTER_PASSWORD || pass === ADMIN_PASSWORD) {
            isStealthEngaged = false;
            await run(`UPDATE system_settings SET value = '0' WHERE key = 'stealth_active'`);
            io.emit('GLOBAL_STEALTH_RELEASED', { message: 'تم إيقاف وضع التمويه! عدنا للدردشة 🚀' });
        }
    });

    // Disconnect Handling
    socket.on('disconnect', async () => {
        const userInfo = onlineUsers.get(socket.id);
        if (userInfo) {
            onlineUsers.delete(socket.id);
            const userSet = userSockets.get(userInfo.userId);
            if (userSet) {
                userSet.delete(socket.id);
                if (userSet.size === 0) {
                    userSockets.delete(userInfo.userId);
                    await run(`UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [userInfo.userId]);
                }
            }
            const onlineList = Array.from(userSockets.keys());
            io.emit('presence_update', { onlineUserIds: onlineList });
        }
    });
});

// ---------------------- BACKGROUND CLEANUP INTERVALS ----------------------

// 1. Cleanup expired disappearing messages every 3 seconds
setInterval(async () => {
    try {
        const expired = await all(`SELECT id FROM messages WHERE is_disappearing = 1 AND expires_at < CURRENT_TIMESTAMP`);
        if (expired.length > 0) {
            const ids = expired.map(m => m.id);
            const placeholders = ids.map(() => '?').join(',');
            await run(`DELETE FROM messages WHERE id IN (${placeholders})`, ids);
            io.emit('disappearing_messages_expired', { messageIds: ids });
        }
    } catch (e) {
        // Silent error in background
    }
}, 3000);

// 2. Cleanup expired stories every 5 minutes
setInterval(async () => {
    try {
        await run(`DELETE FROM stories WHERE expires_at < CURRENT_TIMESTAMP`);
    } catch (e) {}
}, 5 * 60 * 1000);

// ---------------------- SERVER INITIALIZATION ----------------------

async function startServer() {
    await initDB();

    server.listen(PORT, '0.0.0.0', async () => {
        const lanIps = getServerLanIPs();
        console.log('\n=============================================================');
        console.log('⚡🚀 تطبيق "نؤطة" (No2ta) - شبكة الفصل الاجتماعية والسرية يعمل بنجاح! 🚀⚡');
        console.log('=============================================================');
        console.log(`📡 الجهاز المحلي (Host): http://localhost:${PORT}`);
        lanIps.forEach(ip => {
            console.log(`🌐 رابط شبكة الفصل (${ip.interface}): http://${ip.address}:${PORT}`);
        });
        console.log(`🔑 كلمة المرور الرئيسية: ${MASTER_PASSWORD}`);
        console.log(`👑 كلمة مرور الأدمن: ${ADMIN_PASSWORD}`);
        console.log(`🚨 زر البشمهندسة مفعل ومتاح لجميع الطلاب عبر السيرفر اللحظي`);
        console.log('=============================================================\n');

        // Print ASCII QR Code for primary LAN IP in console
        const primary = lanIps.find(i => i.address.startsWith('192.168.')) || lanIps[0];
        if (primary) {
            try {
                const qrString = await QRCode.toString(`http://${primary.address}:${PORT}`, { type: 'terminal', small: true });
                console.log('📱 امسح الـ QR Code بكاميرا الموبايل للدخول المباشر:');
                console.log(qrString);
            } catch (err) {}
        }
    });
}

startServer();
