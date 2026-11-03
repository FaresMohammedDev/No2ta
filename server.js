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
const CryptoJS = require('crypto-js');

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

// Audio static resolver ensuring correct Content-Type (audio/mp4 or audio/mpeg) for browser <audio> tags
app.get('/uploads/music/:filename', (req, res, next) => {
    const filePath = path.join(__dirname, 'uploads', 'music', req.params.filename);
    if (!fs.existsSync(filePath)) return next();
    const ext = path.extname(req.params.filename).toLowerCase();
    if (ext === '.mp4' || ext === '.m4a' || ext === '.aac') {
        res.setHeader('Content-Type', 'audio/mp4');
    } else if (ext === '.mp3') {
        res.setHeader('Content-Type', 'audio/mpeg');
    }
    res.setHeader('Accept-Ranges', 'bytes');
    return res.sendFile(filePath);
});

// Ensure Upload directories exist
const uploadDirs = ['uploads', 'uploads/media', 'uploads/audio', 'uploads/stories', 'uploads/airdrop', 'uploads/avatars', 'uploads/music'];
uploadDirs.forEach(dir => {
    const full = path.join(__dirname, dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// Configure Multer for Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = 'uploads/media';
        if (req.path.includes('music')) dest = 'uploads/music';
        else if (req.path.includes('audio')) dest = 'uploads/audio';
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

// Alexandria, Egypt Prayer Times Engine (Egyptian General Authority of Survey)
// Latitude: 31.2001° N, Longitude: 29.9187° E
function getAlexandriaPrayers(date = new Date()) {
    const lat = 31.2001;
    const lng = 29.9187;

    let tzOffset = 2;
    try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'shortOffset' });
        const parts = formatter.formatToParts(date);
        const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+2';
        const match = tzPart.match(/([+-])(\d+)/);
        if (match) {
            tzOffset = match[1] === '-' ? -parseInt(match[2], 10) : parseInt(match[2], 10);
        }
    } catch (e) {
        tzOffset = 2;
    }

    const d = (date.getTime() / 86400000) - (date.getTimezoneOffset() / 1440) + 2440587.5;
    const D = d - 2451545.0;

    const g = (357.529 + 0.98560028 * D) % 360;
    const q = (280.459 + 0.98564736 * D) % 360;
    const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360;

    const e = 23.439 - 0.00000036 * D;
    const RA = (Math.atan2(Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180), Math.cos(L * Math.PI / 180)) * 180 / Math.PI + 360) % 360;

    let EqT = (q - RA) / 15;
    while (EqT > 12) EqT -= 24;
    while (EqT < -12) EqT += 24;

    const sinDec = Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180);
    const Dec = Math.asin(sinDec);
    const latRad = lat * Math.PI / 180;

    const noonLocal = 12 - (lng / 15) - EqT + tzOffset;

    function getHA(angle) {
        const angleRad = angle * Math.PI / 180;
        const cosHA = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(Dec)) / (Math.cos(latRad) * Math.cos(Dec));
        if (cosHA > 1) return 0;
        if (cosHA < -1) return 180;
        return (Math.acos(cosHA) * 180 / Math.PI) / 15;
    }

    const haFajr = getHA(-19.5);
    const haSunrise = getHA(-0.8333);
    const asrAlt = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - Dec)))) * 180 / Math.PI;
    const haAsr = getHA(asrAlt);
    const haSunset = getHA(-0.8333);
    const haIsha = getHA(-17.5);

    function fmt(hrs) {
        let totalMin = Math.round(hrs * 60);
        let h = Math.floor(totalMin / 60) % 24;
        let m = totalMin % 60;
        let p = h >= 12 ? 'م' : 'ص';
        let h12 = h % 12 === 0 ? 12 : h % 12;
        let padM = m < 10 ? '0' + m : '' + m;
        let padH = h < 10 ? '0' + h : '' + h;
        return {
            time24: `${padH}:${padM}`,
            time12: `${h12}:${padM} ${p}`,
            h,
            m,
            totalSec: h * 3600 + m * 60
        };
    }

    return {
        city: 'الإسكندرية',
        country: 'مصر',
        tzOffset,
        fajr: fmt(noonLocal - haFajr),
        sunrise: fmt(noonLocal - haSunrise),
        dhuhr: fmt(noonLocal + 0.02),
        asr: fmt(noonLocal + haAsr),
        maghrib: fmt(noonLocal + haSunset + 0.03),
        isha: fmt(noonLocal + haIsha)
    };
}

// Alexandria Live Time & Prayer Times API
app.get('/api/alexandria-prayers', (req, res) => {
    try {
        const now = new Date();
        const prayers = getAlexandriaPrayers(now);
        const alexTimeStr = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            timeZone: 'Africa/Cairo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(now);
        const alexDateStr = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            timeZone: 'Africa/Cairo',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(now);

        res.json({
            success: true,
            city: 'الإسكندرية',
            alexandriaTime: alexTimeStr,
            alexandriaDate: alexDateStr,
            prayers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Classroom Collective Tasbeeh Engine 📿
const tasbeehFilePath = path.join(__dirname, 'data', 'tasbeeh.json');
let classroomTotalTasbeeh = 0;
try {
    if (fs.existsSync(tasbeehFilePath)) {
        const tData = JSON.parse(fs.readFileSync(tasbeehFilePath, 'utf8'));
        classroomTotalTasbeeh = tData.total || 0;
    }
} catch (e) {
    classroomTotalTasbeeh = 0;
}

function saveTasbeehCount() {
    try {
        fs.writeFileSync(tasbeehFilePath, JSON.stringify({ total: classroomTotalTasbeeh }), 'utf8');
    } catch (e) {}
}

app.get('/api/tasbeeh', (req, res) => {
    res.json({ success: true, total: classroomTotalTasbeeh });
});

// 5-Minute Synchronized Salawat API & Background Timer 🕋
let lastSalawatTriggerMinute = -1;

function checkAndTriggerSalawatBroadcast() {
    const now = new Date();
    let minutes = now.getMinutes();
    if (minutes % 5 === 0 && minutes !== lastSalawatTriggerMinute) {
        lastSalawatTriggerMinute = minutes;
        console.log(`🕋 [SALAWAT BROADCAST] Synchronized Salawat across all devices at :${minutes < 10 ? '0' + minutes : minutes}`);
        io.emit('salawat_broadcast', {
            phrase: 'اللهم صلِّ على محمد',
            fullPhrase: '«اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
            soundType: 'voice1',
            timestamp: Date.now()
        });
    }
}
setInterval(checkAndTriggerSalawatBroadcast, 3000);

// Dynamic Arabic TTS Proxy / Audio Generator 🗣️
app.get('/api/tts', (req, res) => {
    try {
        const text = req.query.text || 'سُبْحَانَ اللَّه';
        const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=ar&client=tw-ob';
        const https = require('https');
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (ttsRes) => {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            ttsRes.pipe(res);
        }).on('error', (err) => {
            console.error('TTS proxy error:', err);
            res.status(500).json({ error: 'TTS streaming error' });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ---------------------- 📻 CAIRO QURAN RADIO REST API ----------------------
app.get('/api/quran/radio-info', (req, res) => {
    res.json({
        name: 'إذاعة القرآن الكريم من القاهرة',
        frequency: '98.2 FM',
        streamUrl: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
        backupUrls: [
            'http://n12.radiojar.com/8s5u5tpdtwzuv',
            'https://stream.zeno.fm/8t42gV/qrc',
            'http://66.45.232.131:9994/;stream.mp3'
        ],
        fallbackAudio: '/audio/quran_cairo_fallback.mp3',
        officialPortal: 'https://misrquran.gov.eg',
        officialApi: 'https://api.misrquran.gov.eg',
        mp3QuranApi: 'https://mp3quran.net/api/v3/radios?language=ar',
        radioBrowserApi: 'https://de1.api.radio-browser.info/json/stations/byname/Quran%20Cairo',
        isBroadcasting: !!(activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === 'quran_cairo_live' && activeRadioTrack.isPlaying)
    });
});

app.post('/api/quran/broadcast', (req, res) => {
    const action = (req.body && req.body.action) ? req.body.action : 'play';
    const isCurrentlyPlaying = activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === 'quran_cairo_live' && activeRadioTrack.isPlaying;
    
    if (action === 'stop' || (action === 'toggle' && isCurrentlyPlaying)) {
        activeRadioTrack = null;
        io.emit('radio_sync_state', null);
        console.log('📻 [QURAN RADIO] Broadcast stopped across all devices via REST API');
        return res.json({ success: true, isBroadcasting: false, message: 'تم إيقاف البث لجميع الأجهزة' });
    }
    
    activeRadioTrack = {
        track: {
            id: 'quran_cairo_live',
            title: 'إذاعة القرآن الكريم من القاهرة',
            artist: 'بث مباشر 24/7 • مصر 98.2 FM 🕌',
            cover: '',
            audioUrl: '/audio/quran_cairo_live.mp3',
            file_url: '/audio/quran_cairo_live.mp3',
            isLive: true,
            duration: 'مباشر'
        },
        currentTime: 0,
        isPlaying: true,
        startedAt: Date.now(),
        djName: (req.body && req.body.userName) ? req.body.userName : 'المشرف 🕌'
    };
    io.emit('radio_sync_state', activeRadioTrack);
    console.log('📻 [QURAN RADIO] Broadcast started across all devices via REST API by ' + activeRadioTrack.djName);
    res.json({ success: true, isBroadcasting: true, track: activeRadioTrack.track });
});

app.post('/api/salawat/trigger', (req, res) => {
    const soundType = (req.body && req.body.soundType) ? req.body.soundType : 'salawat';
    io.emit('salawat_broadcast', {
        phrase: 'اللهم صلِّ على محمد',
        fullPhrase: '«اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
        soundType: soundType,
        timestamp: Date.now()
    });
    res.json({ success: true, message: 'تم إرسال تذكير صلِّ على محمد لجميع الأجهزة!' });
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
        const { chat_type = 'general', recipient_id, group_id, user_id } = req.query;

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
        } else if (chat_type === 'group' && (group_id || recipient_id)) {
            const targetGroupId = group_id || recipient_id;
            
            // SECURITY: Strict check - only members can view group messages!
            if (!user_id) {
                return res.status(403).json({ error: 'يجب تسجيل الدخول كعضو بالجروب لرؤية الرسائل!', is_member: false });
            }
            const membership = await get(
                `SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`,
                [targetGroupId, user_id]
            );
            if (!membership) {
                return res.status(403).json({ error: 'هذا الجروب خاص! لا يمكنك رؤية الرسائل إلا بعد قبول انضمامك من مؤسس الجروب.', is_member: false });
            }

            messages = await all(
                `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'group' AND m.recipient_id = ?
                 ORDER BY m.created_at ASC
                 LIMIT 150`,
                [targetGroupId]
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

// 9c. Classroom Groups & Squads API 👥
app.get('/api/groups', async (req, res) => {
    try {
        const userId = req.query.userId;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        // Fetch ALL groups in the classroom so all students can discover them
        const groups = await all(
            `SELECT g.*, u.nickname as creator_name, u.avatar as creator_avatar,
                    (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as members_count
             FROM groups g
             JOIN users u ON g.creator_id = u.id
             ORDER BY g.created_at DESC`
        );

        for (let g of groups) {
            let isMember = false;
            let myRole = null;
            let requestStatus = 'none';

            if (userId) {
                const memberRow = await get(
                    `SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`,
                    [g.id, userId]
                );
                if (memberRow) {
                    isMember = true;
                    myRole = memberRow.role;
                } else {
                    const reqRow = await get(
                        `SELECT status FROM group_join_requests WHERE group_id = ? AND user_id = ?`,
                        [g.id, userId]
                    );
                    if (reqRow) {
                        requestStatus = reqRow.status;
                    }
                }
            }

            g.is_member = isMember;
            g.my_role = myRole;
            g.request_status = requestStatus;

            // Only members or admin get the full members list
            if (isMember || isDeviceAdmin) {
                const members = await all(
                    `SELECT u.id, u.nickname, u.avatar, gm.role as group_role
                     FROM group_members gm
                     JOIN users u ON gm.user_id = u.id
                     WHERE gm.group_id = ?`,
                    [g.id]
                );
                g.members = members;

                // Pending requests count for creator or admin
                if (g.creator_id === userId || isDeviceAdmin) {
                    const pendingRow = await get(
                        `SELECT COUNT(*) as count FROM group_join_requests WHERE group_id = ? AND status = 'pending'`,
                        [g.id]
                    );
                    g.pending_requests_count = pendingRow ? pendingRow.count : 0;
                } else {
                    g.pending_requests_count = 0;
                }
            } else {
                g.members = [];
                g.pending_requests_count = 0;
            }
        }

        res.json({ success: true, groups });
    } catch (err) {
        console.error('Error fetching groups:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/groups/:id/members', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        // Security check: non-members cannot inspect group members
        if (!isDeviceAdmin) {
            if (!userId) {
                return res.status(403).json({ error: 'هذا الجروب خاص! لا يمكنك رؤية الأعضاء إلا بعد الانضمام.', members: [] });
            }
            const isMember = await get(`SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`, [id, userId]);
            if (!isMember) {
                return res.status(403).json({ error: 'هذا الجروب خاص! لا يمكنك رؤية الأعضاء إلا بعد الانضمام.', members: [] });
            }
        }

        const members = await all(
            `SELECT u.id, u.nickname, u.avatar, u.role as user_role, gm.role as group_role, gm.joined_at
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = ?
             ORDER BY (CASE WHEN gm.role = 'creator' THEN 0 ELSE 1 END), gm.joined_at ASC`,
            [id]
        );
        res.json({ success: true, members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Join Request: Send request to join private group
app.post('/api/groups/:id/join-request', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'معرّف المستخدم مطلوب!' });

        const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
        if (!group) return res.status(404).json({ error: 'الجروب غير موجود!' });

        // Check if already a member
        const existingMember = await get(`SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`, [id, userId]);
        if (existingMember) {
            return res.json({ success: true, is_member: true, message: 'أنت عضو بالفعل في هذا الجروب!' });
        }

        const reqId = 'req_' + crypto.randomUUID();
        await run(
            `INSERT INTO group_join_requests (id, group_id, user_id, status)
             VALUES (?, ?, ?, 'pending')
             ON CONFLICT(group_id, user_id) DO UPDATE SET status = 'pending', created_at = CURRENT_TIMESTAMP`,
            [reqId, id, userId]
        );

        const requestingUser = await get(`SELECT id, nickname, avatar FROM users WHERE id = ?`, [userId]);

        // Notify group creator live via socket
        const creatorSockets = userSockets.get(group.creator_id);
        if (creatorSockets) {
            creatorSockets.forEach(s => {
                io.to(s).emit('new_group_join_request', {
                    groupId: group.id,
                    groupName: group.name,
                    user: requestingUser
                });
            });
        }

        res.json({ success: true, request_status: 'pending' });
    } catch (err) {
        console.error('Join request error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get pending join requests for group creator
app.get('/api/groups/:id/join-requests', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
        if (!group) return res.status(404).json({ error: 'الجروب غير موجود!' });

        if (!isDeviceAdmin && group.creator_id !== userId) {
            return res.status(403).json({ error: 'فقط مؤسس الجروب أو الأدمن يمكنه رؤية طلبات الانضمام!' });
        }

        const requests = await all(
            `SELECT r.*, u.nickname, u.avatar, u.nickname as user_name, u.avatar as user_avatar
             FROM group_join_requests r
             JOIN users u ON r.user_id = u.id
             WHERE r.group_id = ? AND r.status = 'pending'
             ORDER BY r.created_at DESC`,
            [id]
        );

        res.json({ success: true, requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Respond to join request: Accept or Reject
app.post('/api/groups/:id/join-requests/:requestId/respond', async (req, res) => {
    try {
        const { id, requestId } = req.params;
        const { action, userId } = req.body; // action: 'accept' | 'reject'
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
        if (!group) return res.status(404).json({ error: 'الجروب غير موجود!' });

        if (!isDeviceAdmin && group.creator_id !== userId) {
            return res.status(403).json({ error: 'فقط مؤسس الجروب يمكنه قبول أو رفض الطلبات!' });
        }

        const requestRow = await get(`SELECT * FROM group_join_requests WHERE id = ? AND group_id = ?`, [requestId, id]);
        if (!requestRow) return res.status(404).json({ error: 'الطلب غير موجود!' });

        const targetUserId = requestRow.user_id;

        if (action === 'accept') {
            await run(`UPDATE group_join_requests SET status = 'accepted' WHERE id = ?`, [requestId]);
            await run(
                `INSERT OR IGNORE INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'member')`,
                [crypto.randomUUID(), id, targetUserId]
            );

            // Notify target user via socket
            const targetSockets = userSockets.get(targetUserId);
            if (targetSockets) {
                targetSockets.forEach(s => {
                    io.to(s).emit('group_join_request_accepted', {
                        groupId: group.id,
                        groupName: group.name
                    });
                });
            }

            // Broadcast refresh to all sockets
            io.emit('groups_updated');

            res.json({ success: true, action: 'accept', targetUserId });
        } else {
            await run(`UPDATE group_join_requests SET status = 'rejected' WHERE id = ?`, [requestId]);

            // Notify rejected user
            const targetSockets = userSockets.get(targetUserId);
            if (targetSockets) {
                targetSockets.forEach(s => {
                    io.to(s).emit('group_join_request_rejected', {
                        groupId: group.id,
                        groupName: group.name
                    });
                });
            }

            // Broadcast refresh
            io.emit('groups_updated');

            res.json({ success: true, action: 'reject', targetUserId });
        }
    } catch (err) {
        console.error('Respond join request error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/groups', async (req, res) => {
    try {
        const { name, icon = '👥', description = '', creatorId, memberIds = [] } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'اسم الجروب مطلوب!' });
        }
        if (!creatorId) {
            return res.status(400).json({ error: 'معرّف منشئ الجروب مطلوب!' });
        }

        const groupId = 'group_' + crypto.randomUUID();
        const trimmedName = name.trim();
        const groupIcon = (icon && icon.trim()) ? icon.trim() : '👥';
        const groupDesc = (description && description.trim()) ? description.trim() : '';

        // 1. Insert Group
        await run(
            `INSERT INTO groups (id, name, icon, description, creator_id) VALUES (?, ?, ?, ?, ?)`,
            [groupId, trimmedName, groupIcon, groupDesc, creatorId]
        );

        // 2. Insert Creator
        await run(
            `INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'creator')`,
            [crypto.randomUUID(), groupId, creatorId]
        );

        // 3. Insert other initial members if chosen by creator
        const uniqueMemberIds = Array.from(new Set(memberIds)).filter(uid => uid && uid !== creatorId);
        for (const uid of uniqueMemberIds) {
            await run(
                `INSERT OR IGNORE INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, 'member')`,
                [crypto.randomUUID(), groupId, uid]
            );
        }

        // 4. Retrieve complete group
        const createdGroup = await get(
            `SELECT g.*, u.nickname as creator_name,
                    (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as members_count
             FROM groups g
             JOIN users u ON g.creator_id = u.id
             WHERE g.id = ?`,
            [groupId]
        );

        const allGroupMembers = await all(
            `SELECT u.id, u.nickname, u.avatar, gm.role as group_role
             FROM group_members gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = ?`,
            [groupId]
        );
        createdGroup.members = allGroupMembers;

        // Broadcast to all clients to refresh groups list
        io.emit('group_created', { group: createdGroup });
        io.emit('groups_updated');

        res.json({ success: true, group: createdGroup });
    } catch (err) {
        console.error('Create group error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/groups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const group = await get(`SELECT * FROM groups WHERE id = ?`, [id]);
        if (!group) return res.status(404).json({ error: 'الجروب غير موجود أو تم حذفه مسبقاً!' });

        if (!isDeviceAdmin && group.creator_id !== userId) {
            return res.status(403).json({ error: 'غير مسموح لك بحذف هذا الجروب! فقط منشئ الجروب أو الأدمن يمكنه حذفه.' });
        }

        await run(`DELETE FROM groups WHERE id = ?`, [id]);
        await run(`DELETE FROM group_members WHERE group_id = ?`, [id]);
        await run(`DELETE FROM group_join_requests WHERE group_id = ?`, [id]);
        await run(`DELETE FROM messages WHERE chat_type = 'group' AND recipient_id = ?`, [id]);

        io.emit('group_deleted', { groupId: id, groupName: group.name });
        io.emit('groups_updated');
        res.json({ success: true, groupId: id });
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

// 11. Classroom Local Music Library & Jukebox API 🎵 (100% Offline / Local LAN & Online Stream)

// Unblocked Proxy endpoints on Vercel to bypass school firewall (FortiGuard)
const VERCEL_PROXIES = [
    'https://vercel-proxycors.vercel.app/?url=',
    'https://corsproxy-gateway.vercel.app/?url='
];

// Helper to make HTTPS requests with rejectUnauthorized: false and timeout
function fetchJsonOnline(url, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: timeoutMs }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    });
}

// Download media stream through unblocked Vercel proxies
async function downloadMediaViaProxy(targetUrl, destPath) {
    let lastErr = null;
    for (const proxyBase of VERCEL_PROXIES) {
        const fullUrl = proxyBase + encodeURIComponent(targetUrl);
        try {
            const success = await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(destPath);
                const req = https.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 25000 }, (response) => {
                    if (response.statusCode !== 200) {
                        file.close();
                        try { fs.unlinkSync(destPath); } catch (e) {}
                        return reject(new Error('Proxy returned HTTP ' + response.statusCode));
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close(() => resolve(true));
                    });
                });
                req.on('error', err => {
                    file.close();
                    try { fs.unlinkSync(destPath); } catch (e) {}
                    reject(err);
                });
                req.on('timeout', () => {
                    req.destroy();
                    file.close();
                    try { fs.unlinkSync(destPath); } catch (e) {}
                    reject(new Error('Download timeout'));
                });
            });
            if (success) return true;
        } catch (err) {
            lastErr = err;
            console.warn(`⚠️ [MUSIC PROXY] ${proxyBase} failed: ${err.message}, trying next...`);
        }
    }
    throw (lastErr || new Error('All music proxies failed'));
}

// Helper to decrypt Saavn encrypted media URLs via DES-ECB
function decryptSaavnUrl(enc) {
    if (!enc || typeof enc !== 'string') return null;
    const trimmed = enc.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    try {
        const key = CryptoJS.enc.Utf8.parse('38346591');
        const decrypted = CryptoJS.DES.decrypt(
            { ciphertext: CryptoJS.enc.Base64.parse(trimmed) },
            key,
            { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
        );
        const url = decrypted.toString(CryptoJS.enc.Utf8);
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            // Upgrade quality to 160kbps for crystal-clear sound
            return url.replace(/_(96|48|12)\.mp4$/i, '_160.mp4');
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Search online songs from unblocked endpoints
async function searchOnlineSongs(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim();

    // 1. Primary: soulsync-backend on Render (100% unblocked, comprehensive Arabic & English catalog)
    try {
        const data = await fetchJsonOnline(`https://soulsync-backend-a5fs.onrender.com/api/search?q=${encodeURIComponent(q)}`, 7000);
        if (data && Array.isArray(data.songs) && data.songs.length > 0) {
            return data.songs.map(s => {
                let streamUrl = s.streamUrl;
                if (streamUrl && !streamUrl.startsWith('http')) {
                    streamUrl = decryptSaavnUrl(streamUrl);
                }
                if (!streamUrl && Array.isArray(s.downloadUrl)) {
                    const high = s.downloadUrl.find(u => u.quality === '320kbps' || u.quality === '160kbps') || s.downloadUrl[s.downloadUrl.length - 1];
                    streamUrl = high ? (high.url || high.link) : null;
                }
                const rawImg = s.image || (Array.isArray(s.images) ? s.images[0] : null);
                return {
                    id: String(s.id || crypto.randomUUID().slice(0, 8)),
                    title: s.name || s.title || 'أغنية أونلاين',
                    artist: s.primaryArtists || s.artist || 'فنان',
                    album: s.album || (s.album?.name || ''),
                    duration: s.duration ? (typeof s.duration === 'number' ? Math.floor(s.duration / 60) + ':' + String(s.duration % 60).padStart(2, '0') : s.duration) : '',
                    cover: rawImg ? `/api/music/cover?url=${encodeURIComponent(rawImg)}` : '',
                    rawCover: rawImg || '',
                    streamUrl
                };
            }).filter(s => s.streamUrl);
        }
    } catch (err) {
        console.warn('⚠️ [ONLINE MUSIC] SoulSync search failed:', err.message);
    }

    // 2. Secondary Fallback: jiosaavn-api-2 on Vercel
    try {
        const data = await fetchJsonOnline(`https://jiosaavn-api-2.vercel.app/search/songs?query=${encodeURIComponent(q)}`, 7000);
        const results = data.results || [];
        return results.map(s => {
            let streamUrl = null;
            if (Array.isArray(s.downloadUrl)) {
                const high = s.downloadUrl.find(u => u.quality === '320kbps' || u.quality === '160kbps') || s.downloadUrl[s.downloadUrl.length - 1];
                streamUrl = high ? (high.url || high.link) : null;
            }
            if (!streamUrl && s.encrypted_media_url) {
                streamUrl = decryptSaavnUrl(s.encrypted_media_url);
            }
            const rawImg = Array.isArray(s.image) ? (s.image.find(i => i.quality === '150x150') || s.image[0])?.link : s.image;
            return {
                id: String(s.id || crypto.randomUUID().slice(0, 8)),
                title: s.name || s.title || 'أغنية أونلاين',
                artist: s.primaryArtists || s.artist || 'فنان',
                album: s.album?.name || s.album || '',
                duration: s.duration ? (typeof s.duration === 'number' ? Math.floor(s.duration / 60) + ':' + String(s.duration % 60).padStart(2, '0') : s.duration) : '',
                cover: rawImg ? `/api/music/cover?url=${encodeURIComponent(rawImg)}` : '',
                rawCover: rawImg || '',
                streamUrl
            };
        }).filter(s => s.streamUrl);
    } catch (err) {
        console.warn('⚠️ [ONLINE MUSIC] JioSaavn-2 search fallback failed:', err.message);
        return [];
    }
}

// Online Music Search API
app.get('/api/music/online/search', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ success: true, songs: [] });
        const songs = await searchOnlineSongs(q);
        res.json({ success: true, songs });
    } catch (err) {
        console.error('Online music search error:', err);
        res.status(500).json({ success: false, error: err.message, songs: [] });
    }
});

// Proxy cover art images through unblocked Vercel proxy with local disk cache
app.get('/api/music/cover', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl) return res.status(400).send('Missing url parameter');

        // Check local disk cache
        const cacheHash = crypto.createHash('md5').update(targetUrl).digest('hex');
        const localCachePath = path.join(__dirname, 'uploads', 'music', `cover_cache_${cacheHash}.jpg`);
        if (fs.existsSync(localCachePath)) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=604800');
            return fs.createReadStream(localCachePath).pipe(res);
        }

        // Fetch via unblocked proxy
        const proxyUrl = VERCEL_PROXIES[0] + encodeURIComponent(targetUrl);
        const proxyReq = https.get(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 8000 }, (proxyRes) => {
            if (proxyRes.statusCode === 200) {
                res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=604800');
                const fileOut = fs.createWriteStream(localCachePath);
                proxyRes.pipe(fileOut);
                proxyRes.pipe(res);
            } else {
                res.status(proxyRes.statusCode).end();
            }
        });
        proxyReq.on('error', () => {
            res.status(502).end();
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Instant Audio Streaming Endpoint with Range Requests & Background Cache
app.get('/api/music/stream', async (req, res) => {
    try {
        let { songId, url: targetUrl } = req.query;
        if (!songId && !targetUrl) return res.status(400).send('Missing audio source');

        if (targetUrl && !targetUrl.startsWith('http')) {
            targetUrl = decryptSaavnUrl(targetUrl);
        }

        const safeId = String(songId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `online_${safeId}.m4a`;
        const localPath = path.join(__dirname, 'uploads', 'music', filename);
        const legacyMp4Path = path.join(__dirname, 'uploads', 'music', `online_${safeId}.mp4`);

        // 1. If local cached file already exists, serve it with byte-ranges & audio/mp4
        const existingPath = fs.existsSync(localPath) ? localPath : (fs.existsSync(legacyMp4Path) ? legacyMp4Path : null);
        if (existingPath) {
            const stat = fs.statSync(existingPath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(existingPath, { start, end });
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'audio/mp4',
                });
                return file.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'audio/mp4',
                    'Accept-Ranges': 'bytes'
                });
                return fs.createReadStream(existingPath).pipe(res);
            }
        }

        // 2. Stream live from outside via unblocked proxy while piping directly to browser & disk
        if (!targetUrl) return res.status(404).send('Track not found on disk');

        const proxyUrl = VERCEL_PROXIES[0] + encodeURIComponent(targetUrl);
        const proxyReq = https.get(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 20000 }, (remoteRes) => {
            if (remoteRes.statusCode === 200 || remoteRes.statusCode === 206) {
                res.setHeader('Content-Type', 'audio/mp4');
                res.setHeader('Accept-Ranges', 'bytes');
                if (remoteRes.headers['content-length']) {
                    res.setHeader('Content-Length', remoteRes.headers['content-length']);
                }

                // Pipe directly to browser for INSTANT playback (< 0.5s!)
                remoteRes.pipe(res);

                // Also stream into local cache file for LAN persistence
                const fileStream = fs.createWriteStream(localPath);
                remoteRes.pipe(fileStream);
                fileStream.on('error', () => {
                    try { fs.unlinkSync(localPath); } catch (e) {}
                });
            } else {
                res.status(remoteRes.statusCode).end();
            }
        });
        proxyReq.on('error', (err) => {
            if (!res.headersSent) res.status(502).send('Streaming error: ' + err.message);
        });
    } catch (err) {
        if (!res.headersSent) res.status(500).send(err.message);
    }
});

// Online Song Play & Auto-Cache for the Classroom LAN
app.post('/api/music/online/play', async (req, res) => {
    try {
        let { songId, title, artist, rawCover, streamUrl, duration, djName, djId } = req.body;
        if (!songId || !streamUrl) {
            return res.status(400).json({ success: false, error: 'بيانات الأغنية غير مكتملة!' });
        }

        if (streamUrl && !streamUrl.startsWith('http')) {
            streamUrl = decryptSaavnUrl(streamUrl);
        }

        const safeId = String(songId).replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `online_${safeId}.m4a`;
        const destPath = path.join(__dirname, 'uploads', 'music', filename);
        const legacyMp4 = path.join(__dirname, 'uploads', 'music', `online_${safeId}.mp4`);

        // Check if file already exists on local disk
        const hasLocal = fs.existsSync(destPath) || fs.existsSync(legacyMp4);
        const localAudioUrl = hasLocal 
            ? (fs.existsSync(destPath) ? `/uploads/music/${filename}` : `/uploads/music/online_${safeId}.mp4`)
            : `/api/music/stream?songId=${safeId}&url=${encodeURIComponent(streamUrl)}`;

        let localCoverUrl = '';
        if (rawCover) {
            const coverFilename = `cover_${safeId}.jpg`;
            const coverDest = path.join(__dirname, 'uploads', 'music', coverFilename);
            if (fs.existsSync(coverDest)) {
                localCoverUrl = `/uploads/music/${coverFilename}`;
            } else {
                downloadMediaViaProxy(rawCover, coverDest).catch(e => console.warn('Cover download skipped:', e.message));
                localCoverUrl = `/api/music/cover?url=${encodeURIComponent(rawCover)}`;
            }
        }

        // Background caching to local disk (NON-BLOCKING - does NOT hold up playback!)
        if (!hasLocal) {
            downloadMediaViaProxy(streamUrl, destPath)
                .then(() => console.log(`✅ [ONLINE MUSIC] Cached "${title}" to disk in background`))
                .catch(e => console.warn('Background caching note:', e.message));
        }

        // Insert into music_library if not already exists
        const trackDbId = 'track_online_' + safeId;
        const existingTrack = await get(`SELECT id FROM music_library WHERE id = ?`, [trackDbId]);
        if (!existingTrack) {
            await run(
                `INSERT INTO music_library (id, title, artist, file_url, file_name, duration, cover, uploader_id, uploader_name)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [trackDbId, title || 'أغنية أونلاين', artist || 'فنان', localAudioUrl, filename, duration || '', localCoverUrl, djId || null, djName || 'دي جي الفصل']
            );
            const savedTrack = await get(`SELECT * FROM music_library WHERE id = ?`, [trackDbId]);
            io.emit('music_library_updated', { track: savedTrack, action: 'add' });
        }

        // Broadcast to all sockets to play synchronously INSTANTLY
        activeRadioTrack = {
            track: {
                id: trackDbId,
                title: title || 'أغنية أونلاين',
                artist: artist || 'فنان',
                cover: localCoverUrl,
                audioUrl: localAudioUrl,
                file_url: localAudioUrl,
                duration: duration || ''
            },
            currentTime: 0,
            isPlaying: true,
            startedAt: Date.now(),
            djName: djName || 'دي جي الفصل',
            djId: djId || null
        };

        console.log(`🎵 [RADIO SYNC PLAY] Broadcasting "${title}" across LAN to all devices`);
        io.emit('radio_sync_state', activeRadioTrack);

        // Instant return (< 50ms) so browser client plays immediately!
        res.json({ success: true, track: activeRadioTrack.track });
    } catch (err) {
        console.error('Online play error:', err);
        res.status(500).json({ success: false, error: 'تعذر تشغيل الأغنية: ' + err.message });
    }
});

// Get or Search tracks in Classroom Local Library
app.get('/api/music/library', async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        let tracks = [];
        if (query) {
            tracks = await all(
                `SELECT * FROM music_library
                 WHERE title LIKE ? OR artist LIKE ? OR file_name LIKE ?
                 ORDER BY created_at DESC`,
                [`%${query}%`, `%${query}%`, `%${query}%`]
            );
        } else {
            tracks = await all(`SELECT * FROM music_library ORDER BY created_at DESC`);
        }
        res.json({ success: true, tracks });
    } catch (err) {
        res.status(500).json({ error: err.message, tracks: [] });
    }
});

// Search route for local library (zero external requests, 0ms latency)
app.get('/api/music/search', async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        let tracks = [];
        if (query) {
            tracks = await all(
                `SELECT * FROM music_library
                 WHERE title LIKE ? OR artist LIKE ? OR file_name LIKE ?
                 ORDER BY created_at DESC`,
                [`%${query}%`, `%${query}%`, `%${query}%`]
            );
        } else {
            tracks = await all(`SELECT * FROM music_library ORDER BY created_at DESC`);
        }
        res.json({ success: true, tracks });
    } catch (err) {
        res.status(500).json({ error: err.message, tracks: [] });
    }
});

// Upload song to Classroom Music Library (stored locally on host LAN)
app.post('/api/music/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم اختيار ملف صوتي!' });
        }

        const { title, artist, uploaderId, uploaderName, duration = '' } = req.body;
        const trackId = 'track_' + crypto.randomUUID();
        const originalName = req.file.originalname;
        const songTitle = (title && title.trim()) ? title.trim() : originalName.replace(/\.[^/.]+$/, '');
        const songArtist = (artist && artist.trim()) ? artist.trim() : (uploaderName || 'دي جي الفصل 🎧');
        const fileUrl = `/uploads/music/${req.file.filename}`;

        await run(
            `INSERT INTO music_library (id, title, artist, file_url, file_name, duration, uploader_id, uploader_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [trackId, songTitle, songArtist, fileUrl, originalName, duration, uploaderId || null, uploaderName || null]
        );

        const newTrack = await get(`SELECT * FROM music_library WHERE id = ?`, [trackId]);
        io.emit('music_library_updated', { track: newTrack, action: 'add' });

        res.json({ success: true, track: newTrack });
    } catch (err) {
        console.error('Music upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete song from Classroom Music Library
app.delete('/api/music/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        const track = await get(`SELECT * FROM music_library WHERE id = ?`, [id]);
        if (!track) return res.status(404).json({ error: 'الأغنية غير موجودة أو تم حذفها مسبقاً!' });

        if (!isDeviceAdmin && track.uploader_id && track.uploader_id !== userId) {
            return res.status(403).json({ error: 'غير مسموح لك بحذف هذه الأغنية!' });
        }

        await run(`DELETE FROM music_library WHERE id = ?`, [id]);

        if (track.file_url && track.file_url.startsWith('/uploads/music/')) {
            const diskPath = path.join(__dirname, track.file_url);
            if (fs.existsSync(diskPath)) {
                try { fs.unlinkSync(diskPath); } catch (e) {}
            }
        }

        if (activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === id) {
            activeRadioTrack = null;
            io.emit('radio_sync_state', null);
        }

        io.emit('music_library_updated', { trackId: id, action: 'delete' });
        res.json({ success: true, trackId: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// ---------------------- 13. NETSUPPORT CLASSROOM MONITOR & REMOTE CONTROL ----------------------
const netSupportScreens = new Map(); // key: deviceId/ip -> { id, socketId, userId, nickname, avatar, role, ip, mac, lastFrame, lastFrameAt, isLocked, isStealth, currentApp }

// Receive screen frame from student browser or Windows background agent (lab-agent.ps1)
app.post('/api/netsupport/frame', async (req, res) => {
    try {
        const { deviceId, userId, nickname, avatar, role, ip, mac, frameBase64, currentApp } = req.body;
        const clientIp = cleanIP(ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = mac || await resolveMacAddress(clientIp);
        const safeDevKey = `dev_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const devKey = deviceId || safeDevKey;

        const existing = netSupportScreens.get(safeDevKey) || netSupportScreens.get(clientIp) || netSupportScreens.get(devKey) || {};
        const updated = {
            id: safeDevKey,
            socketId: existing.socketId || null,
            userId: userId || existing.userId || null,
            nickname: nickname || existing.nickname || `جهاز_${clientIp.split('.').pop()}`,
            avatar: avatar || existing.avatar || '🖥️',
            role: role || existing.role || 'student',
            ip: clientIp,
            mac: clientMac || existing.mac || '',
            lastFrame: frameBase64 || existing.lastFrame || null,
            lastFrameAt: Date.now(),
            isLocked: existing.isLocked || false,
            isStealth: existing.isStealth || false,
            currentApp: currentApp || existing.currentApp || 'Windows Desktop (Agent)'
        };

        netSupportScreens.set(safeDevKey, updated);
        netSupportScreens.set(clientIp, updated);
        if (devKey !== safeDevKey) {
            netSupportScreens.set(devKey, updated);
        }

        // Broadcast frame update to hardware admin sockets only
        for (const [sId, u] of onlineUsers.entries()) {
            if (u.role === 'admin') {
                io.to(sId).emit('netsupport_device_frame_update', {
                    deviceId: safeDevKey,
                    nickname: updated.nickname,
                    ip: updated.ip,
                    mac: updated.mac,
                    lastFrame: updated.lastFrame,
                    lastFrameAt: updated.lastFrameAt,
                    currentApp: updated.currentApp,
                    isLocked: updated.isLocked,
                    isStealth: updated.isStealth
                });
            }
        }

        res.json({ success: true, isLocked: updated.isLocked, isStealth: updated.isStealth });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin fetches all devices and their screen frames for the NetSupport Live Grid
app.get('/api/netsupport/devices', async (req, res) => {
    try {
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        if (!isDeviceAdmin) {
            return res.status(403).json({ error: 'ممنوع! شاشة مراقبة المعمل محصورة حصرياً بجهاز الأدمن الفيزيائي.' });
        }

        const devices = [];
        // Combine onlineUsers with netSupportScreens
        for (const [socketId, user] of onlineUsers.entries()) {
            const devKey = `dev_${user.ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const screenInfo = netSupportScreens.get(devKey) || netSupportScreens.get(user.ip) || netSupportScreens.get(socketId) || {};

            devices.push({
                deviceId: devKey,
                socketId: socketId,
                userId: user.userId,
                nickname: user.nickname,
                avatar: user.avatar,
                role: user.role,
                ip: user.ip,
                mac: user.mac || screenInfo.mac || '',
                connectedAt: user.connectedAt,
                lastFrame: screenInfo.lastFrame || null,
                lastFrameAt: screenInfo.lastFrameAt || null,
                isLocked: !!screenInfo.isLocked,
                isStealth: !!screenInfo.isStealth,
                currentApp: screenInfo.currentApp || (screenInfo.lastFrame ? 'Windows Desktop' : 'متصفح نؤطة')
            });
        }

        // Also add any agent devices reporting via background script that might not be on socket.io
        for (const [devKey, screenInfo] of netSupportScreens.entries()) {
            if (devKey.startsWith('dev_') && !devices.some(d => d.deviceId === devKey || d.ip === screenInfo.ip)) {
                devices.push({
                    deviceId: devKey,
                    socketId: null,
                    userId: screenInfo.userId,
                    nickname: screenInfo.nickname,
                    avatar: screenInfo.avatar,
                    role: screenInfo.role,
                    ip: screenInfo.ip,
                    mac: screenInfo.mac,
                    connectedAt: screenInfo.lastFrameAt,
                    lastFrame: screenInfo.lastFrame,
                    lastFrameAt: screenInfo.lastFrameAt,
                    isLocked: !!screenInfo.isLocked,
                    isStealth: !!screenInfo.isStealth,
                    currentApp: screenInfo.currentApp || 'Windows Desktop (Agent)'
                });
            }
        }

        res.json({
            success: true,
            totalDevices: devices.length,
            devices
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin executes remote control on student device (Lock screen, Stealth, Warning popup, Alarm, URL Navigate, Kick)
app.post('/api/netsupport/control', async (req, res) => {
    try {
        const { action, targetSocketId, targetIp, payload = {} } = req.body;
        const clientIp = cleanIP(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        if (!isDeviceAdmin) {
            return res.status(403).json({ error: 'ممنوع! التحكم محصور حصرياً بجهاز الأدمن الفيزيائي.' });
        }

        const updateDeviceState = (ip, updates) => {
            if (!ip) return;
            const devKey = `dev_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const dev = netSupportScreens.get(devKey) || { ip, id: devKey };
            Object.assign(dev, updates);
            netSupportScreens.set(devKey, dev);
        };

        switch (action) {
            case 'lock_screen': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_lock_screen', {
                        reason: payload.reason || 'تم قفل شاشات المعمل بواسطة الأستاذ / الأدمن. انتبه للشرح على السبورة!',
                        lockedBy: 'مشرف المعمل'
                    });
                    for (const [k, v] of netSupportScreens.entries()) {
                        v.isLocked = true;
                    }
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_lock_screen', {
                        reason: payload.reason || 'تم قفل شاشتك بواسطة الأستاذ. انتبه للشرح على السبورة!',
                        lockedBy: 'مشرف المعمل'
                    });
                    updateDeviceState(targetIp, { isLocked: true });
                }
                break;
            }

            case 'unlock_screen': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_unlock_screen');
                    for (const [k, v] of netSupportScreens.entries()) {
                        v.isLocked = false;
                    }
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_unlock_screen');
                    updateDeviceState(targetIp, { isLocked: false });
                }
                break;
            }

            case 'force_stealth': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('GLOBAL_STEALTH_ENGAGED', { timestamp: Date.now() });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('GLOBAL_STEALTH_ENGAGED', { timestamp: Date.now() });
                    updateDeviceState(targetIp, { isStealth: true });
                }
                break;
            }

            case 'release_stealth': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('GLOBAL_STEALTH_RELEASED', { message: 'تم إلغاء التمويه بواسطة الأستاذ' });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('GLOBAL_STEALTH_RELEASED', { message: 'تم إلغاء التمويه بواسطة الأستاذ' });
                    updateDeviceState(targetIp, { isStealth: false });
                }
                break;
            }

            case 'popup_message': {
                const msg = payload.message || 'انتبه للشرح يا بطل وبلاش لعب!';
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_popup_message', {
                        title: '⚠️ تنبيه مباشر من مشرف المعمل',
                        message: msg,
                        time: new Date().toLocaleTimeString('ar-EG')
                    });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_popup_message', {
                        title: '⚠️ تنبيه مباشر من مشرف المعمل',
                        message: msg,
                        time: new Date().toLocaleTimeString('ar-EG')
                    });
                }
                break;
            }

            case 'play_alarm': {
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_play_alarm');
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_play_alarm');
                }
                break;
            }

            case 'navigate_url': {
                const targetUrl = payload.url || 'https://google.com';
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('netsupport_navigate_url', { url: targetUrl });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_navigate_url', { url: targetUrl });
                }
                break;
            }

            case 'request_screen': {
                if (targetSocketId) {
                    io.to(targetSocketId).emit('netsupport_request_screen_share');
                }
                break;
            }

            case 'kick': {
                if (targetSocketId) {
                    io.to(targetSocketId).emit('user_kicked', { reason: payload.reason || 'تم قطع اتصالك بواسطة مشرف المعمل!' });
                }
                break;
            }
        }

        res.json({ success: true, action, targetSocketId, targetIp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------- SOCKET.IO REALTIME ENGINE ----------------------

io.on('connection', async (socket) => {
    const rawIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const clientIp = cleanIP(rawIp);
    const clientMac = await resolveMacAddress(clientIp);

    // Send current classroom tasbeeh total
    socket.emit('tasbeeh_global_update', { total: classroomTotalTasbeeh });

    socket.on('tasbeeh_increment', (count = 1) => {
        classroomTotalTasbeeh += Math.min(Math.max(1, count), 10);
        io.emit('tasbeeh_global_update', { total: classroomTotalTasbeeh });
        if (classroomTotalTasbeeh % 5 === 0) {
            saveTasbeehCount();
        }
    });

        // 📻 CAIRO QURAN RADIO BROADCAST
    socket.on('broadcast_quran_cairo', (data = {}) => {
        const isCurrentlyPlaying = activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === 'quran_cairo_live' && activeRadioTrack.isPlaying;
        if (data.action === 'stop' || (data.action === 'toggle' && isCurrentlyPlaying)) {
            activeRadioTrack = null;
            io.emit('radio_sync_state', null);
            console.log('📻 [QURAN RADIO] Broadcast stopped for all devices by socket');
        } else {
            activeRadioTrack = {
                track: {
                    id: 'quran_cairo_live',
                    title: 'إذاعة القرآن الكريم من القاهرة',
                    artist: 'بث مباشر 24/7 • مصر 98.2 FM 🕌',
                    cover: '',
                    audioUrl: '/audio/quran_cairo_live.mp3',
                    file_url: '/audio/quran_cairo_live.mp3',
                    isLive: true,
                    duration: 'مباشر'
                },
                currentTime: 0,
                isPlaying: true,
                startedAt: Date.now(),
                djName: data.djName || (socket.user ? socket.user.nickname : 'المشرف 🕌')
            };
            io.emit('radio_sync_state', activeRadioTrack);
            console.log(`📻 [QURAN RADIO] Broadcasting to all devices by ${activeRadioTrack.djName}`);
        }
    });

socket.on('admin_trigger_salawat', (data = {}) => {
        io.emit('salawat_broadcast', {
            phrase: 'اللهم صلِّ على محمد',
            fullPhrase: '«اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
            soundType: (data && data.soundType) ? data.soundType : 'salawat',
            timestamp: Date.now()
        });
    });

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

                if (streakInfo) {
                    const streakPayload = {
                        userA: senderId,
                        userB: recipientId,
                        streak_count: streakInfo.streak_count,
                        is_frozen: streakInfo.is_frozen,
                        status: streakInfo.status,
                        interaction_count: streakInfo.interaction_count
                    };
                    if (senderSockets) senderSockets.forEach(sock => io.to(sock).emit('streak_updated', streakPayload));
                    if (recipientSockets) recipientSockets.forEach(sock => io.to(sock).emit('streak_updated', streakPayload));
                }
            } else if (chatType === 'group' && recipientId) {
                // Send to all members of this group
                const members = await all(`SELECT user_id FROM group_members WHERE group_id = ?`, [recipientId]);
                const memberSet = new Set(members.map(m => m.user_id));
                memberSet.add(senderId);
                memberSet.forEach(uid => {
                    const sockList = userSockets.get(uid);
                    if (sockList) sockList.forEach(s => io.to(s).emit('new_message', { message: newMsg, streakInfo: null }));
                });
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

    // NetSupport client screen frame stream
    socket.on('netsupport_client_frame', (data) => {
        if (data && data.frame) {
            const userInfo = onlineUsers.get(socket.id);
            const clientIp = userInfo?.ip || cleanIP(socket.handshake.address);
            const devKey = `dev_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;

            const existing = netSupportScreens.get(devKey) || netSupportScreens.get(clientIp) || {};
            const screenData = {
                id: devKey,
                socketId: socket.id,
                userId: userInfo?.userId || existing.userId || null,
                nickname: userInfo?.nickname || existing.nickname || 'طالب',
                avatar: userInfo?.avatar || existing.avatar || '🖥️',
                ip: clientIp,
                mac: userInfo?.mac || existing.mac || '',
                lastFrame: data.frame,
                lastFrameAt: Date.now(),
                isLocked: existing.isLocked || false,
                isStealth: existing.isStealth || false,
                currentApp: data.currentApp || 'متصفح نؤطة'
            };
            netSupportScreens.set(devKey, screenData);
            netSupportScreens.set(clientIp, screenData);

            for (const [sId, u] of onlineUsers.entries()) {
                if (u.role === 'admin') {
                    io.to(sId).emit('netsupport_device_frame_update', {
                        deviceId: devKey,
                        nickname: userInfo?.nickname || 'طالب',
                        ip: clientIp,
                        mac: userInfo?.mac || '',
                        lastFrame: data.frame,
                        lastFrameAt: Date.now(),
                        currentApp: data.currentApp || 'متصفح نؤطة',
                        isLocked: screenData.isLocked,
                        isStealth: screenData.isStealth
                    });
                }
            }
        }
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
