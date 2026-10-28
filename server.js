const express = require('express');
const http = require('http');
const https = require('https');
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

let startBeacon = () => {};
try {
    startBeacon = require('./services/discovery').startBeacon;
} catch (e) {
    console.log('Discovery service notice:', e.message);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 50 * 1024 * 1024 // 50MB max file transfer
});

const PORT = process.env.PORT || 5000;
const MASTER_PASSWORD = 'SdSdSdSd';

// The ONE and ONLY physical MAC address of the Classroom Admin machine
const STRICT_ADMIN_MAC = 'D0:8E:79:18:9F:A0';

// Helper to determine if the connecting device is THIS Admin Machine
function isHostAdmin(clientIp, clientMac) {
    if (clientMac) {
        const cleanMac = clientMac.toUpperCase().replace(/-/g, ':');
        if (cleanMac === STRICT_ADMIN_MAC) return true;
    }
    // Only allow localhost if THIS physical machine has the STRICT_ADMIN_MAC adapter!
    const hostLanIps = getServerLanIPs();
    const hasAdminHardware = hostLanIps.some(net => net.mac && net.mac.toUpperCase().replace(/-/g, ':') === STRICT_ADMIN_MAC);
    if (hasAdminHardware && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost')) {
        return true;
    }
    return false;
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Story images fallback resolver (checks both uploads/stories and uploads/media)
app.use('/uploads/stories/:filename', (req, res, next) => {
    const storiesPath = path.join(__dirname, 'uploads/stories', req.params.filename);
    const mediaPath = path.join(__dirname, 'uploads/media', req.params.filename);
    if (fs.existsSync(storiesPath)) {
        return res.sendFile(storiesPath);
    } else if (fs.existsSync(mediaPath)) {
        return res.sendFile(mediaPath);
    }
    next();
});

// Ensure Upload directories exist
const uploadDirs = ['uploads', 'uploads/media', 'uploads/audio', 'uploads/stories', 'uploads/airdrop', 'uploads/avatars'];
uploadDirs.forEach(dir => {
    const full = path.join(__dirname, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// Configure Multer for Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = 'uploads/media';
        if (req.path.includes('audio')) dest = 'uploads/audio';
        else if (req.path.includes('stori') || req.path.includes('story')) dest = 'uploads/stories';
        else if (req.path.includes('airdrop')) dest = 'uploads/airdrop';
        else if (req.path.includes('avatar')) dest = 'uploads/avatars';
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
let sharedCodePadText = '// كشكول الأكواد والنصوص المشترك للفصل 💻⚡\n// الصق أي كود أو مسألة برمجية هنا ليراها الجميع فوراً!';
let isChatFocusLocked = false;
let isStealthEngaged = false;
let activeScreenShare = null; // { presenterSocketId, presenterId, presenterName, hasAudio, startedAt }
let activeRadioTrack = null; // { track: { id, title, artist, cover, audioUrl }, currentTime, isPlaying, startedAt, djName, djId }

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

        // Hardware-based Admin detection: ONLY physical MAC D0:8E:79:18:9F:A0 is Admin!
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        if (password !== MASTER_PASSWORD) {
            return res.status(401).json({ error: 'كلمة السر غير صحيحة! الباسوورد هو SdSdSdSd' });
        }

        const effectiveDeviceId = deviceId || (clientMac ? `mac_${clientMac}` : `ip_${clientIp}`);

        // Check if user already exists
        let user = await get(`SELECT * FROM users WHERE device_id = ? OR mac_address = ?`, [effectiveDeviceId, clientMac]);

        const defaultNickname = isDeviceAdmin ? 'كبير الفصل (الأدمن)' : `عبقري_${clientIp.split('.').pop()}`;
        const chosenNickname = nickname ? nickname.trim() : (user ? user.nickname : defaultNickname);
        const chosenAvatar = avatar || (user ? user.avatar : (isDeviceAdmin ? '👑' : '🚀'));
        const chosenBio = bio || (user ? user.bio : (isDeviceAdmin ? 'أدمن الفصل والمتحكم في الشبكة 👑⚡' : 'طالب جامد في فصل العباقرة ⚡'));
        const chosenRole = isDeviceAdmin ? 'admin' : 'student';

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
            isAdmin: isDeviceAdmin,
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

// 5b. Delete Message (Allowed for Message Sender OR Hardware Admin/Host)
app.delete('/api/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const message = await get(`SELECT * FROM messages WHERE id = ?`, [id]);
        if (!message) return res.status(404).json({ error: 'الرسالة غير موجودة أو تم حذفها بالفعل' });

        if (!isDeviceAdmin && message.sender_id !== userId) {
            return res.status(403).json({ error: 'غير مسموح لك بحذف هذه الرسالة!' });
        }

        await run(`DELETE FROM messages WHERE id = ?`, [id]);
        await run(`DELETE FROM message_reactions WHERE message_id = ?`, [id]);
        io.emit('message_deleted', { messageId: id });
        res.json({ success: true, messageId: id });
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

app.post('/api/upload/avatar', upload.single('avatar'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({ success: true, url: avatarUrl });
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

// 7b. Delete Story (Allowed for Story Author OR Hardware Admin/Host)
app.delete('/api/stories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const story = await get(`SELECT * FROM stories WHERE id = ?`, [id]);
        if (!story) return res.status(404).json({ error: 'الاستوري غير موجود أو انتهت صلاحيته' });

        if (!isDeviceAdmin && story.user_id !== userId) {
            return res.status(403).json({ error: 'غير مسموح لك بحذف هذا الاستوري!' });
        }

        await run(`DELETE FROM stories WHERE id = ?`, [id]);
        await run(`DELETE FROM story_views WHERE story_id = ?`, [id]);
        io.emit('story_deleted', { storyId: id });
        res.json({ success: true, storyId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7c. Story Viewers List Endpoint
app.get('/api/stories/:id/views', async (req, res) => {
    try {
        const { id } = req.params;
        const viewers = await all(
            `SELECT sv.viewed_at, u.id as user_id, u.nickname, u.avatar, u.role
             FROM story_views sv
             JOIN users u ON sv.user_id = u.id
             WHERE sv.story_id = ?
             ORDER BY sv.viewed_at DESC`,
            [id]
        );
        res.json({ success: true, viewers });
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

// 10. Live Screen Share Status Endpoint
app.get('/api/screen-share/status', (req, res) => {
    res.json({
        active: !!activeScreenShare,
        share: activeScreenShare
    });
});

// 11. Online Free Music API (YouTube Music + JioSaavn + iTunes) 🎵
app.get('/api/music/search', async (req, res) => {
    const query = req.query.q || '';
    if (!query.trim()) return res.json({ success: true, tracks: [] });

    try {
        const agent = new https.Agent({ rejectUnauthorized: false });

        // 1. Primary Engine: YouTube Music Catalog (Full support for Arabic, Egyptian, Mahraganat, Rap & Pop)
        const ytResults = await new Promise((resolve) => {
            const clientReq = https.get({
                hostname: 'yoyt.vercel.app',
                path: `/api/public/search?q=${encodeURIComponent(query)}&filter=songs&limit=15`,
                agent,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000
            }, (apiRes) => {
                let d = '';
                apiRes.on('data', c => d += c);
                apiRes.on('end', () => {
                    try {
                        const json = JSON.parse(d);
                        const items = json.items || [];
                        const tracks = items.map(item => {
                            const artistName = (item.artists || []).map(a => a.name).join(', ') || 'فنان';
                            const cover = item.thumbnails?.[item.thumbnails.length - 1]?.url ||
                                          `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
                            return {
                                id: item.videoId,
                                videoId: item.videoId,
                                title: item.title,
                                artist: artistName,
                                cover,
                                duration: item.duration || '',
                                audioUrl: null,
                                rawAudioUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
                                youtubeUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
                                source: 'youtube'
                            };
                        });
                        resolve(tracks);
                    } catch(e) {
                        resolve([]);
                    }
                });
            });
            clientReq.on('error', () => resolve([]));
            clientReq.on('timeout', () => { clientReq.destroy(); resolve([]); });
        });

        if (ytResults && ytResults.length > 0) {
            return res.json({ success: true, tracks: ytResults });
        }

        // 2. Secondary Engine: JioSaavn API on Vercel
        const jioResults = await new Promise((resolve) => {
            const clientReq = https.get({
                hostname: 'jiosaavn-api.vercel.app',
                path: '/search?query=' + encodeURIComponent(query),
                agent,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000
            }, (apiRes) => {
                let d = '';
                apiRes.on('data', c => d += c);
                apiRes.on('end', async () => {
                    try {
                        const json = JSON.parse(d);
                        const results = (json.results || []).slice(0, 10);
                        const detailed = await Promise.all(results.map(async r => {
                            return new Promise((resDetails) => {
                                https.get({
                                    hostname: 'jiosaavn-api.vercel.app',
                                    path: '/song?id=' + r.id,
                                    agent,
                                    headers: { 'User-Agent': 'Mozilla/5.0' },
                                    timeout: 4000
                                }, (dRes) => {
                                    let detData = '';
                                    dRes.on('data', c => detData += c);
                                    dRes.on('end', () => {
                                        try {
                                            const song = JSON.parse(detData);
                                            resDetails({
                                                id: r.id,
                                                title: song.song || r.title,
                                                artist: song.singers || r.description || r.more_info?.singers || 'فنان',
                                                cover: song.image || r.image,
                                                audioUrl: song.media_url ? `/api/music/stream?url=${encodeURIComponent(song.media_url)}` : null,
                                                rawAudioUrl: song.media_url,
                                                duration: song.duration || ''
                                            });
                                        } catch(e) {
                                            resDetails(null);
                                        }
                                    });
                                }).on('error', () => resDetails(null));
                            });
                        }));
                        resolve(detailed.filter(t => t && t.audioUrl));
                    } catch(e) {
                        resolve([]);
                    }
                });
            });
            clientReq.on('error', () => resolve([]));
            clientReq.on('timeout', () => { clientReq.destroy(); resolve([]); });
        });

        if (jioResults && jioResults.length > 0) {
            return res.json({ success: true, tracks: jioResults });
        }

        // 2. Try iTunes Search API as fallback
        const itunesResults = await new Promise((resolve) => {
            const clientReq = https.get({
                hostname: 'itunes.apple.com',
                path: `/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=12`,
                agent,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 4000
            }, (apiRes) => {
                let d = '';
                apiRes.on('data', c => d += c);
                apiRes.on('end', () => {
                    try {
                        const json = JSON.parse(d);
                        const tracks = (json.results || []).map(r => ({
                            id: String(r.trackId),
                            title: r.trackName,
                            artist: r.artistName,
                            cover: r.artworkUrl100?.replace('100x100', '300x300') || r.artworkUrl100,
                            audioUrl: r.previewUrl ? `/api/music/stream?url=${encodeURIComponent(r.previewUrl)}` : null,
                            rawAudioUrl: r.previewUrl,
                            duration: r.trackTimeMillis ? `${Math.floor(r.trackTimeMillis / 60000)}:${String(Math.floor((r.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}` : ''
                        }));
                        resolve(tracks.filter(t => t.audioUrl));
                    } catch(e) {
                        resolve([]);
                    }
                });
            });
            clientReq.on('error', () => resolve([]));
            clientReq.on('timeout', () => { clientReq.destroy(); resolve([]); });
        });

        res.json({ success: true, tracks: itunesResults });
    } catch(err) {
        res.status(500).json({ error: err.message, tracks: [] });
    }
});

// 12. Audio Stream Proxy Endpoint (Bypasses CORS & Network Blocks)
app.get('/api/music/stream', (req, res) => {
    const audioUrl = req.query.url;
    if (!audioUrl) return res.status(400).send('URL required');

    try {
        const parsed = new URL(audioUrl);
        const protocol = parsed.protocol === 'http:' ? require('http') : https;
        const agent = new https.Agent({ rejectUnauthorized: false });

        const clientReq = protocol.get(audioUrl, {
            agent,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': parsed.origin,
                'Range': req.headers.range || ''
            }
        }, (streamRes) => {
            const headers = { ...streamRes.headers };
            delete headers['content-security-policy'];
            headers['Access-Control-Allow-Origin'] = '*';
            headers['Accept-Ranges'] = 'bytes';

            res.writeHead(streamRes.statusCode, headers);
            streamRes.pipe(res);
        });

        clientReq.on('error', (err) => {
            if (!res.headersSent) res.status(502).send(err.message);
        });
    } catch(err) {
        if (!res.headersSent) res.status(400).send('Invalid audio URL');
    }
});

// 9b. Shared Classroom CodePad / Plain Text Bin
app.get('/api/codepad', async (req, res) => {
    try {
        const row = await get(`SELECT value FROM system_settings WHERE key = 'shared_codepad'`);
        res.json({ text: row && row.value !== null ? row.value : sharedCodePadText });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/codepad', async (req, res) => {
    try {
        const { text } = req.body;
        sharedCodePadText = text !== undefined ? text : '';
        await run(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('shared_codepad', ?)`, [sharedCodePadText]);
        io.emit('codepad_sync', { text: sharedCodePadText });
        res.json({ success: true });
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
        const { action, payload } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        // Strict Check: Only the hardware admin can perform any admin action!
        if (!isDeviceAdmin) {
            return res.status(403).json({ error: 'ممنوع! العمليات الإدارية محصورة حصرياً بجهاز الأدمن الفيزيائي فقط.' });
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
        // Send current shared codepad
        socket.emit('codepad_sync', { text: sharedCodePadText });
        // Send current focus mode state
        socket.emit('chat_focus_mode_changed', { isLocked: isChatFocusLocked });
        // Send stealth state if already engaged
        if (isStealthEngaged) {
            socket.emit('GLOBAL_STEALTH_ENGAGED', { timestamp: 0 });
        }
        // Send active screen share state if currently broadcasting
        if (activeScreenShare) {
            socket.emit('screen_share_started', activeScreenShare);
        }
        // Send active synchronized radio state
        if (activeRadioTrack) {
            let currentTime = activeRadioTrack.currentTime || 0;
            if (activeRadioTrack.isPlaying && activeRadioTrack.startedAt) {
                currentTime = (Date.now() - activeRadioTrack.startedAt) / 1000;
            }
            socket.emit('radio_sync_state', { ...activeRadioTrack, currentTime });
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

    socket.on('request_whiteboard_history', () => {
        socket.emit('whiteboard_init', whiteboardHistory);
    });

    // 4b. Collaborative Live CodePad / Plain Text Bin
    socket.on('codepad_update', async (data) => {
        sharedCodePadText = (data && data.text !== undefined) ? data.text : '';
        socket.broadcast.emit('codepad_sync', { text: sharedCodePadText, senderName: data.senderName });
        await run(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('shared_codepad', ?)`, [sharedCodePadText]);
    });

    socket.on('codepad_request_sync', () => {
        socket.emit('codepad_sync', { text: sharedCodePadText });
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

    // 6. Stealth Release (Admin / Master Password only)
    socket.on('TRIGGER_STEALTH_RELEASE', async (pass) => {
        if (pass && pass.trim() === MASTER_PASSWORD) {
            isStealthEngaged = false;
            await run(`UPDATE system_settings SET value = '0' WHERE key = 'stealth_active'`);
            console.log(`✅ [STEALTH RELEASE] Broadcasted to all by socket ${socket.id}`);
            io.emit('GLOBAL_STEALTH_RELEASED', { message: 'تم إيقاف وضع التمويه! عدنا للدردشة 🚀' });
        }
    });

    // 7. Delete Message Socket Handler
    socket.on('delete_message', async ({ messageId, userId }) => {
        try {
            const isDeviceAdmin = isHostAdmin(clientIp, clientMac);
            const message = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
            if (message && (isDeviceAdmin || message.sender_id === userId)) {
                await run(`DELETE FROM messages WHERE id = ?`, [messageId]);
                await run(`DELETE FROM message_reactions WHERE message_id = ?`, [messageId]);
                io.emit('message_deleted', { messageId });
            }
        } catch (err) {
            console.error('Error deleting message via socket:', err);
        }
    });

    // 8. Screen Share & WebRTC Signaling Hub 🖥️
    socket.on('get_screen_share_status', () => {
        socket.emit('screen_share_status', activeScreenShare);
    });

    socket.on('screen_share_start', (data) => {
        activeScreenShare = {
            presenterSocketId: socket.id,
            presenterId: data.presenterId,
            presenterName: data.presenterName,
            hasAudio: !!data.hasAudio,
            startedAt: Date.now()
        };
        console.log(`🖥️ [SCREEN SHARE] Started by ${data.presenterName} (${socket.id})`);
        io.emit('screen_share_started', activeScreenShare);
    });

    socket.on('screen_share_stop', () => {
        if (activeScreenShare && activeScreenShare.presenterSocketId === socket.id) {
            console.log(`⏹️ [SCREEN SHARE] Stopped by presenter (${socket.id})`);
            activeScreenShare = null;
            io.emit('screen_share_ended');
        }
    });

    // Signaling: Viewer requests to join presenter's stream
    socket.on('webrtc_viewer_join', (data) => {
        if (activeScreenShare) {
            io.to(activeScreenShare.presenterSocketId).emit('webrtc_viewer_joined', {
                viewerSocketId: socket.id,
                viewerName: data.viewerName || 'طالب'
            });
        }
    });

    // Signaling: Presenter sends offer to specific viewer
    socket.on('webrtc_offer', ({ targetSocketId, offer }) => {
        io.to(targetSocketId).emit('webrtc_offer', {
            presenterSocketId: socket.id,
            offer
        });
    });

    // Signaling: Viewer sends answer to presenter
    socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
        io.to(targetSocketId).emit('webrtc_answer', {
            viewerSocketId: socket.id,
            answer
        });
    });

    // Signaling: ICE Candidate relay
    socket.on('webrtc_ice_candidate', ({ targetSocketId, candidate }) => {
        io.to(targetSocketId).emit('webrtc_ice_candidate', {
            fromSocketId: socket.id,
            candidate
        });
    });

    // 9. Synchronized Classroom Radio / Music Hub 🎵
    socket.on('get_radio_status', () => {
        let currentTime = 0;
        if (activeRadioTrack) {
            if (activeRadioTrack.isPlaying && activeRadioTrack.startedAt) {
                currentTime = (Date.now() - activeRadioTrack.startedAt) / 1000;
            } else {
                currentTime = activeRadioTrack.currentTime || 0;
            }
            socket.emit('radio_sync_state', { ...activeRadioTrack, currentTime });
        } else {
            socket.emit('radio_sync_state', null);
        }
    });

    socket.on('radio_play', (data) => {
        activeRadioTrack = {
            track: data.track,
            currentTime: data.currentTime || 0,
            isPlaying: true,
            startedAt: Date.now() - ((data.currentTime || 0) * 1000),
            djName: data.djName || 'أحد الزملاء',
            djId: data.djId || null
        };
        console.log(`🎵 [RADIO PLAY] ${data.track?.title} by DJ ${data.djName}`);
        io.emit('radio_sync_state', activeRadioTrack);
    });

    socket.on('radio_pause', (data) => {
        if (activeRadioTrack) {
            activeRadioTrack.isPlaying = false;
            activeRadioTrack.currentTime = data.currentTime || 0;
            io.emit('radio_sync_state', activeRadioTrack);
        }
    });

    socket.on('radio_seek', (data) => {
        if (activeRadioTrack) {
            activeRadioTrack.currentTime = data.currentTime || 0;
            activeRadioTrack.startedAt = Date.now() - ((data.currentTime || 0) * 1000);
            io.emit('radio_sync_state', activeRadioTrack);
        }
    });

    socket.on('radio_stop', () => {
        activeRadioTrack = null;
        io.emit('radio_sync_state', null);
    });

    // Disconnect Handling
    socket.on('disconnect', async () => {
        if (activeScreenShare && activeScreenShare.presenterSocketId === socket.id) {
            console.log(`⏹️ [SCREEN SHARE] Presenter disconnected, ending live stream`);
            activeScreenShare = null;
            io.emit('screen_share_ended');
        }
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

// 1. Cleanup expired disappearing messages every 1 second (supports 2s fast burn)
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
}, 1000);

// 2. Cleanup expired stories every 5 minutes
setInterval(async () => {
    try {
        await run(`DELETE FROM stories WHERE expires_at < CURRENT_TIMESTAMP`);
    } catch (e) {}
}, 5 * 60 * 1000);

// ---------------------- SERVER INITIALIZATION ----------------------

async function startServer() {
    await initDB();
    startBeacon(PORT);

    try {
        const codepadRow = await get(`SELECT value FROM system_settings WHERE key = 'shared_codepad'`);
        if (codepadRow && codepadRow.value !== null && codepadRow.value !== undefined) {
            sharedCodePadText = codepadRow.value;
        }
    } catch (e) {}

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
        console.log(`👑 الأدمن الحصري: محدد بالماك الفيزيائي للجهاز المضيف (Host) فقط ⚡`);
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
