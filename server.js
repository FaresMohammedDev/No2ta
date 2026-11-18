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
const sessions = require('./services/sessions');
const { cleanIP, getServerLanIPs, resolveMacAddress } = require('./services/network');
const { recordInteraction, getStreakBetween, getAllUserStreaks, isWeekendFreeze } = require('./services/streaks');
const { QURAN_RECITERS, getReciterById, getSurahAudioUrl, getSurahName } = require('./data/quran-reciters');

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
// Browser requests must originate on this host. Native LAN clients have no Origin.
app.use((req, res, next) => {
    if (req.headers.origin) {
        try { if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: 'Origin not allowed' }); }
        catch { return res.sendStatus(403); }
    }
    next();
});
app.use('/api', async (req, res, next) => {
    // Agent pairing is a separate migration; its legacy frame intake remains isolated here.
    if (['/auth/login', '/network-info', '/alexandria-prayers', '/tasbeeh', '/netsupport/frame', '/music/cover', '/music/stream'].includes(req.path)) return next();
    req.authUser = await sessions.resolve(req.headers);
    if (!req.authUser) return res.status(401).json({ error: 'سجّل الدخول من جديد' });
    if ((req.path.startsWith('/admin/') || req.path.startsWith('/netsupport/')) && req.authUser.role !== 'admin') return res.sendStatus(403);
    const actorKeys = ['userId', 'user_id', 'currentUserId', 'creatorId', 'uploaderId', 'djId'];
    for (const source of [req.query, req.body || {}]) {
        if (actorKeys.some(key => source[key] && source[key] !== req.authUser.id)) return res.status(403).json({ error: 'هوية المستخدم لا تطابق الجلسة' });
    }
    if (req.path === '/messages/mark-read' && req.body.recipientId !== req.authUser.id) return res.sendStatus(403);
    next();
});
app.get('/api/auth/me', (req, res) => {
    const { session_hash, ...user } = req.authUser;
    res.json({ user });
});
app.post('/api/auth/logout', async (req, res) => {
    await run('DELETE FROM auth_sessions WHERE token_hash = ?', [req.authUser.session_hash]);
    for (const socket of io.sockets.sockets.values()) {
        if (socket.data.sessionHash === req.authUser.session_hash) socket.disconnect(true);
    }
    res.clearCookie('no2ta_session', { path: '/' });
    res.json({ success: true });
});
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
const uploadSingle = upload.single.bind(upload);
upload.single = field => (req, res, next) => uploadSingle(field)(req, res, error => {
    if (error) return next(error);
    const actor = req.body.userId || req.body.senderId || req.body.uploaderId;
    if (actor && actor !== req.authUser?.id) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.sendStatus(403);
    }
    next();
});

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
        const clientIp = cleanIP(req.socket.remoteAddress);
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

// 5-Minute Synchronized Salawat API & Background Timer
// The automatic broadcast fires every SALAWAT_INTERVAL_MS. The first one is aligned to the next
// :00/:05/:10... wall-clock mark; any broadcast (automatic or manual "say it now") restarts the
// countdown from that moment, so a manual trigger is never followed seconds later by the old timer.
const SALAWAT_INTERVAL_MS = 5 * 60 * 1000;
const SALAWAT_MANUAL_COOLDOWN_MS = 10 * 1000;
let nextSalawatAt = Math.ceil((Date.now() + 1000) / SALAWAT_INTERVAL_MS) * SALAWAT_INTERVAL_MS;
let lastSalawatBroadcastAt = 0;

function broadcastSalawat(soundType = 'voice1', source = 'timer') {
    const now = Date.now();
    if (source === 'manual' && now - lastSalawatBroadcastAt < SALAWAT_MANUAL_COOLDOWN_MS) return false;
    lastSalawatBroadcastAt = now;
    nextSalawatAt = now + SALAWAT_INTERVAL_MS;
    const playAt = now + 750; // High-precision future timestamp for zero-latency cross-LAN sync
    console.log(`[SALAWAT BROADCAST] (${source}) playAt: ${playAt}, next at ${new Date(nextSalawatAt).toLocaleTimeString()}`);
    io.emit('salawat_broadcast', {
        phrase: 'اللهم صلِّ على محمد',
        fullPhrase: '«اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ»',
        soundType: soundType || 'voice1',
        source,
        timestamp: now,
        playAt,
        nextAt: nextSalawatAt
    });
    return true;
}

setInterval(() => {
    if (Date.now() >= nextSalawatAt) broadcastSalawat('voice1', 'timer');
}, 1000);

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

// ---------------------- 📻 CAIRO QURAN RADIO LIVE RELAY ----------------------
// The school's web filter (FortiGuard) blocks the radio domains directly on every
// student PC, so each browser's <audio> tag can never reach them on its own - even
// from the admin machine, since it sits on the same filtered school network.
// Fix: the Node server itself fetches the live stream once (direct, then falling back
// to the same Vercel CORS proxies already used for the music feature to dodge the
// filter), and re-broadcasts ("relays") those bytes to every classroom device over
// the plain LAN address they already use to load the app - which the filter never
// touches because it is not an external domain.
const QURAN_LIVE_SOURCES = [
    'https://stream.radiojar.com/8s5u5tpdtwzuv',
    'http://n12.radiojar.com/8s5u5tpdtwzuv',
    'http://n0e.radiojar.com/8s5u5tpdtwzuv',
    'https://stream.zeno.fm/8t42gV/qrc',
    'http://66.45.232.131:9994/;stream.mp3'
];

const quranRelay = {
    active: false,          // true while the admin has broadcast turned on
    upstreamReq: null,      // current outgoing http(s) request to the radio source
    subscribers: new Set(), // express `res` objects: one per classroom device listening
    sourceIdx: 0,
    viaProxy: false,
    reconnectTimer: null
};

function quranRelayWriteChunk(chunk) {
    for (const res of quranRelay.subscribers) {
        try { res.write(chunk); } catch (e) { quranRelay.subscribers.delete(res); }
    }
}

function scheduleQuranReconnect() {
    if (!quranRelay.active || quranRelay.reconnectTimer) return;
    quranRelay.sourceIdx++;
    if (quranRelay.sourceIdx % QURAN_LIVE_SOURCES.length === 0) {
        // Cycled through every direct source once - switch to the firewall-bypass proxy
        quranRelay.viaProxy = !quranRelay.viaProxy;
    }
    quranRelay.reconnectTimer = setTimeout(() => {
        quranRelay.reconnectTimer = null;
        connectQuranUpstream();
    }, 800);
}

function connectQuranUpstream() {
    if (!quranRelay.active) return;
    if (quranRelay.upstreamReq) {
        try { quranRelay.upstreamReq.destroy(); } catch (e) {}
        quranRelay.upstreamReq = null;
    }

    const rawUrl = QURAN_LIVE_SOURCES[quranRelay.sourceIdx % QURAN_LIVE_SOURCES.length];
    const targetUrl = quranRelay.viaProxy ? (VERCEL_PROXIES[0] + encodeURIComponent(rawUrl)) : rawUrl;
    const client = targetUrl.startsWith('https') ? https : http;

    console.log(`📻 [QURAN RELAY] Connecting upstream ${quranRelay.viaProxy ? '(via firewall-bypass proxy)' : '(direct)'}: ${rawUrl}`);

    const req = client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 15000 }, (upstreamRes) => {
        if (upstreamRes.statusCode && upstreamRes.statusCode >= 400) {
            upstreamRes.resume();
            return scheduleQuranReconnect();
        }
        upstreamRes.on('data', quranRelayWriteChunk);
        upstreamRes.on('end', scheduleQuranReconnect);
        upstreamRes.on('error', scheduleQuranReconnect);
    });

    req.on('error', scheduleQuranReconnect);
    req.on('timeout', () => { req.destroy(); scheduleQuranReconnect(); });

    quranRelay.upstreamReq = req;
}

function startQuranRelay() {
    if (quranRelay.active) return;
    quranRelay.active = true;
    quranRelay.sourceIdx = 0;
    quranRelay.viaProxy = false;
    if (quranRelay.reconnectTimer) { clearTimeout(quranRelay.reconnectTimer); quranRelay.reconnectTimer = null; }
    connectQuranUpstream();
}

function stopQuranRelay() {
    quranRelay.active = false;
    if (quranRelay.reconnectTimer) { clearTimeout(quranRelay.reconnectTimer); quranRelay.reconnectTimer = null; }
    if (quranRelay.upstreamReq) {
        try { quranRelay.upstreamReq.destroy(); } catch (e) {}
        quranRelay.upstreamReq = null;
    }
    for (const res of quranRelay.subscribers) {
        try { res.end(); } catch (e) {}
    }
    quranRelay.subscribers.clear();
}

// Classroom devices point their <audio> tag at this LAN-local endpoint instead of the
// blocked external radio domains. One shared upstream connection feeds every listener.
app.get('/api/quran/live-relay', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive'
    });
    quranRelay.subscribers.add(res);
    if (!quranRelay.active) startQuranRelay();
    req.on('close', () => quranRelay.subscribers.delete(res));
});

// ---------------------- 📻 CAIRO QURAN RADIO REST API ----------------------
app.get('/api/quran/radio-info', (req, res) => {
    res.json({
        name: 'إذاعة القرآن الكريم من القاهرة',
        frequency: '98.2 FM',
        streamUrl: '/api/quran/live-relay',
        backupUrls: [
            'http://n12.radiojar.com/8s5u5tpdtwzuv',
            'http://n0e.radiojar.com/8s5u5tpdtwzuv',
            'https://stream.zeno.fm/8t42gV/qrc',
            'http://66.45.232.131:9994/;stream.mp3'
        ],
        officialPortal: 'https://www.holyquranradio.com',
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
        stopQuranRelay();
        io.emit('radio_sync_state', null);
        console.log('📻 [QURAN RADIO] Broadcast stopped across all devices via REST API');
        return res.json({ success: true, isBroadcasting: false, message: 'تم إيقاف البث لجميع الأجهزة' });
    }

    startQuranRelay();
    activeRadioTrack = {
        track: {
            id: 'quran_cairo_live',
            title: 'إذاعة القرآن الكريم من القاهرة',
            artist: 'بث حي مباشر 24/7 • مصر 98.2 FM 📻 (holyquranradio.com)',
            cover: '',
            audioUrl: '/api/quran/live-relay',
            file_url: '/api/quran/live-relay',
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

// ---------------------- 📿 QURAN RECITATION LIBRARY (mp3quran.net — reliable, not a live stream) ----------------------
// Full recorded surahs by well-known reciters (Minshawy, Abdul Basit...). Static files behave like
// any other classroom track, so they get the exact same currentTime sync + drift-correction as music
// instead of the live-relay's best-effort buffering — this is what actually keeps devices together.
const QURAN_CACHE_DIR = path.join(__dirname, 'uploads', 'quran');
if (!fs.existsSync(QURAN_CACHE_DIR)) fs.mkdirSync(QURAN_CACHE_DIR, { recursive: true });

let quranAutoAdvance = { reciterId: null, surahNumber: null, lastAdvanceAt: 0 };

app.get('/api/quran/library/reciters', (req, res) => {
    res.json({ success: true, reciters: QURAN_RECITERS.map(r => ({ id: r.id, name: r.name })) });
});

app.get('/api/quran/library/surahs', (req, res) => {
    const { SURAH_NAMES } = require('./data/quran-reciters');
    res.json({ success: true, surahs: SURAH_NAMES.map((name, i) => ({ number: i + 1, name })) });
});

// Streams one surah file: tries the CDN directly first (it's not on any school blocklist we've
// seen), caches it to disk on first play, and falls back to the firewall-bypass proxy if the
// direct connection ever fails. Every later play of the same surah is served instantly from disk.
app.get('/api/quran/library/stream', async (req, res) => {
    try {
        const { reciter, surah } = req.query;
        const audioUrl = getSurahAudioUrl(reciter, surah);
        if (!audioUrl) return res.status(400).send('Invalid reciter/surah');

        const cachePath = path.join(QURAN_CACHE_DIR, `${reciter}_${String(surah).padStart(3, '0')}.mp3`);

        if (fs.existsSync(cachePath)) {
            const stat = fs.statSync(cachePath);
            const fileSize = stat.size;
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': (end - start) + 1,
                    'Content-Type': 'audio/mpeg',
                });
                return fs.createReadStream(cachePath, { start, end }).pipe(res);
            }
            res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes' });
            return fs.createReadStream(cachePath).pipe(res);
        }

        const fetchAndCache = (url, isProxied) => {
            const client = url.startsWith('https') ? https : http;
            const freq = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 15000 }, (upstreamRes) => {
                if (upstreamRes.statusCode !== 200) {
                    upstreamRes.resume();
                    if (!isProxied) return fetchAndCache(VERCEL_PROXIES[0] + encodeURIComponent(audioUrl), true);
                    return res.status(502).send('Quran CDN unreachable');
                }
                res.setHeader('Content-Type', 'audio/mpeg');
                upstreamRes.pipe(res);
                const fileStream = fs.createWriteStream(cachePath);
                upstreamRes.pipe(fileStream);
                fileStream.on('error', () => { try { fs.unlinkSync(cachePath); } catch (e) {} });
            });
            freq.on('error', () => {
                if (!isProxied) return fetchAndCache(VERCEL_PROXIES[0] + encodeURIComponent(audioUrl), true);
                if (!res.headersSent) res.status(502).send('Quran CDN unreachable');
            });
            freq.on('timeout', () => freq.destroy());
        };
        fetchAndCache(audioUrl, false);
    } catch (err) {
        if (!res.headersSent) res.status(500).send(err.message);
    }
});

function buildQuranLibraryTrack(reciterId, surahNumber, djName) {
    const reciter = getReciterById(reciterId);
    if (!reciter) return null;
    const n = parseInt(surahNumber, 10);
    const streamUrl = `/api/quran/library/stream?reciter=${encodeURIComponent(reciterId)}&surah=${n}`;
    return {
        track: {
            id: `quran_surah_${reciterId}_${n}`,
            title: `سورة ${getSurahName(n)}`,
            artist: reciter.name,
            cover: '',
            audioUrl: streamUrl,
            file_url: streamUrl,
            isLive: false,
            reciterId,
            surahNumber: n
        },
        currentTime: 0,
        isPlaying: true,
        startedAt: Date.now() + 600, // 600ms future scheduled start time
        djName: djName || 'المشرف'
    };
}

app.post('/api/quran/library/broadcast', (req, res) => {
    const { reciterId, surahNumber, userName, action } = req.body || {};

    if (action === 'stop') {
        activeRadioTrack = null;
        quranAutoAdvance = { reciterId: null, surahNumber: null, lastAdvanceAt: 0 };
        io.emit('radio_sync_state', null);
        return res.json({ success: true, isBroadcasting: false });
    }

    const state = buildQuranLibraryTrack(reciterId, surahNumber, userName);
    if (!state) return res.status(400).json({ success: false, error: 'قارئ أو سورة غير معروفة' });

    activeRadioTrack = state;
    quranAutoAdvance = { reciterId, surahNumber: parseInt(surahNumber, 10), lastAdvanceAt: Date.now() };
    io.emit('radio_sync_state', activeRadioTrack);
    console.log(`📿 [QURAN LIBRARY] Broadcasting ${state.track.title} (${state.track.artist}) by ${state.djName}`);
    res.json({ success: true, isBroadcasting: true, track: state.track });
});

// Any client's <audio> firing 'ended' tells the server the surah finished, so it can advance
// the whole classroom to the next one automatically (continuous "radio" feel). Debounced so a
// burst of near-simultaneous 'ended' events from every synced device only advances once.
function advanceQuranSurah() {
    if (!quranAutoAdvance.reciterId || !quranAutoAdvance.surahNumber) return;
    if (Date.now() - quranAutoAdvance.lastAdvanceAt < 3000) return; // debounce
    const nextSurah = quranAutoAdvance.surahNumber >= 114 ? 1 : quranAutoAdvance.surahNumber + 1;
    const state = buildQuranLibraryTrack(quranAutoAdvance.reciterId, nextSurah, activeRadioTrack?.djName);
    if (!state) return;
    activeRadioTrack = state;
    quranAutoAdvance = { reciterId: quranAutoAdvance.reciterId, surahNumber: nextSurah, lastAdvanceAt: Date.now() };
    io.emit('radio_sync_state', activeRadioTrack);
    console.log(`📿 [QURAN LIBRARY] Auto-advanced to ${state.track.title}`);
}

// Periodic drift-correction heartbeat: every classroom device's <audio> element drifts a little
// from the others over time (different buffering/decode speed). Re-broadcasting the server's
// authoritative currentTime every 20s lets the existing >2s correction in the client snap
// everyone back together, continuously, without anyone noticing.
setInterval(() => {
    if (!activeRadioTrack || !activeRadioTrack.isPlaying) return;
    if (activeRadioTrack.track?.isLive) return; // live streams have no meaningful currentTime
    const currentTime = (Date.now() - activeRadioTrack.startedAt) / 1000;
    io.emit('radio_sync_state', { ...activeRadioTrack, currentTime });
}, 20000);

app.post('/api/salawat/trigger', (req, res) => {
    const soundType = (req.body && req.body.soundType) ? req.body.soundType : 'voice1';
    broadcastSalawat(soundType, 'manual');
    res.json({ success: true, message: 'تم إرسال تذكير صلِّ على محمد لجميع الأجهزة!' });
});

// ---------------------- 🏆 INTERACTIVE QUIZ SCORES & LEADERBOARD (stealth quiz) ----------------------
app.post('/api/quiz/submit-score', async (req, res) => {
    try {
        const { userId, nickname, score, total, quizId } = req.body || {};
        const totalQuestions = parseInt(total, 10);
        const finalScore = parseInt(score, 10);
        if (!nickname || !Number.isFinite(finalScore) || !Number.isFinite(totalQuestions) || totalQuestions <= 0) {
            return res.status(400).json({ success: false, error: 'بيانات النتيجة غير مكتملة' });
        }
        const percentage = Math.round((finalScore / totalQuestions) * 1000) / 10;

        await run(
            `INSERT INTO quiz_scores (user_id, nickname, quiz_id, score, total_questions, percentage) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId || null, nickname, quizId || 'flutter_competency', finalScore, totalQuestions, percentage]
        );

        io.emit('quiz_score_submitted', { nickname, score: finalScore, total: totalQuestions, percentage });
        res.json({ success: true, percentage });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/quiz/leaderboard', async (req, res) => {
    try {
        const quizId = req.query.quizId || 'flutter_competency';
        // submitted_at is stored in UTC, but "today" must follow the Cairo calendar day (UTC+2/+3);
        // otherwise scores submitted shortly after Cairo midnight are counted on the wrong day.
        const nowUtc = new Date();
        const cairoNow = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
        const utcNow = new Date(nowUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
        const cairoOffsetHours = Math.round((cairoNow - utcNow) / 3600000);
        const cairoOffsetModifier = `${cairoOffsetHours >= 0 ? '+' : ''}${cairoOffsetHours} hours`;

        const topToday = await get(
            `SELECT nickname, score, total_questions, percentage, submitted_at FROM quiz_scores
             WHERE quiz_id = ? AND date(submitted_at, ?) = date('now', ?) ORDER BY percentage DESC, submitted_at ASC LIMIT 1`,
            [quizId, cairoOffsetModifier, cairoOffsetModifier]
        );
        const topAllTime = await get(
            `SELECT nickname, score, total_questions, percentage, submitted_at FROM quiz_scores
             WHERE quiz_id = ? ORDER BY percentage DESC, submitted_at ASC LIMIT 1`,
            [quizId]
        );
        const recent = await all(
            `SELECT nickname, score, total_questions, percentage, submitted_at FROM quiz_scores
             WHERE quiz_id = ? ORDER BY submitted_at DESC LIMIT 10`,
            [quizId]
        );
        const topTen = await all(
            `SELECT nickname, score, total_questions, percentage, submitted_at FROM quiz_scores
             WHERE quiz_id = ? ORDER BY percentage DESC, submitted_at ASC LIMIT 10`,
            [quizId]
        );

        res.json({ success: true, topToday: topToday || null, topAllTime: topAllTime || null, recent, topTen });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Authentication & Auto-Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { password, nickname, avatar, bio, deviceId } = req.body;
        const clientIp = cleanIP(req.socket.remoteAddress);
        const clientMac = await resolveMacAddress(clientIp);

        // Hardware-based Admin detection: ONLY physical MAC D0:8E:79:18:9F:A0 is Admin!
        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);

        if (password !== MASTER_PASSWORD) {
            return res.status(401).json({ error: 'كلمة السر غير صحيحة، حاول تاني 🔒' });
        }

        let deviceToken = sessions.cookie(req.headers, 'no2ta_device');
        if (!/^[a-f0-9]{64}$/.test(deviceToken)) deviceToken = crypto.randomBytes(32).toString('hex');
        const effectiveDeviceId = sessions.hash(deviceToken);

        // Check if user already exists
        let user = await get(`SELECT * FROM users WHERE device_id = ?`, [effectiveDeviceId]);

        const defaultNickname = isDeviceAdmin ? 'كبير الفصل (الأدمن)' : `عبقري_${clientIp.split('.').pop()}`;
        const chosenNickname = nickname ? nickname.trim() : (user ? user.nickname : defaultNickname);
        const chosenAvatar = avatar || (user ? user.avatar : (isDeviceAdmin ? 'crown' : 'rocket'));
        const chosenBio = bio || (user ? user.bio : (isDeviceAdmin ? 'أدمن الفصل والمتحكم في الشبكة' : 'طالب في فصل العباقرة'));
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

        await sessions.issue(res, user, req.secure);
        res.cookie('no2ta_device', deviceToken, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: 365*86400000, path: '/' });
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
        const currentUserId = req.query.currentUserId;
        let users;
        if (currentUserId) {
            users = await all(
                `SELECT u.id, u.nickname, u.avatar, u.bio, u.role, u.is_online, u.last_seen, u.ip_address, u.mac_address,
                    (SELECT MAX(created_at) FROM messages 
                     WHERE chat_type = 'direct' AND 
                           ((sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id))
                    ) as last_message_at,
                    (SELECT content FROM messages 
                     WHERE chat_type = 'direct' AND 
                           ((sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id))
                     ORDER BY created_at DESC LIMIT 1
                    ) as last_message_text,
                    (SELECT COUNT(*) FROM messages 
                     WHERE chat_type = 'direct' AND sender_id = u.id AND recipient_id = ? AND is_read = 0
                    ) as unread_count
                 FROM users u
                 ORDER BY 
                    (CASE WHEN (
                        SELECT MAX(created_at) FROM messages 
                        WHERE chat_type = 'direct' AND 
                              ((sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id))
                    ) IS NOT NULL THEN 0 ELSE 1 END),
                    (SELECT MAX(created_at) FROM messages 
                     WHERE chat_type = 'direct' AND 
                           ((sender_id = u.id AND recipient_id = ?) OR (sender_id = ? AND recipient_id = u.id))
                    ) DESC,
                    u.is_online DESC,
                    u.nickname ASC`,
                [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId]
            );
        } else {
            users = await all(
                `SELECT id, nickname, avatar, bio, role, is_online, last_seen, ip_address, mac_address 
                 FROM users ORDER BY is_online DESC, nickname ASC`
            );
        }
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark direct chat messages as read API
app.post('/api/messages/mark-read', async (req, res) => {
    try {
        const { senderId, recipientId } = req.body;
        if (!senderId || !recipientId) return res.status(400).json({ error: 'senderId and recipientId required' });

        const result = await run(
            `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP 
             WHERE chat_type = 'direct' AND sender_id = ? AND recipient_id = ? AND is_read = 0`,
            [senderId, recipientId]
        );

        const senderSockets = userSockets.get(senderId);
        if (senderSockets && senderSockets.size > 0) {
            senderSockets.forEach(s => io.to(s).emit('messages_marked_read', {
                readerId: recipientId,
                readAt: new Date().toISOString()
            }));
        }

        res.json({ success: true, updated: result.changes });
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
        const before = req.query.before === undefined ? Number.MAX_SAFE_INTEGER : Number(req.query.before);
        if (!Number.isSafeInteger(before) || before < 1) return res.status(400).json({ error: 'Invalid message cursor' });

        // Clean up expired disappearing messages before query
        await run(`DELETE FROM messages WHERE is_disappearing = 1 AND expires_at < CURRENT_TIMESTAMP`);

        let messages = [];
        if (chat_type === 'general') {
            messages = await all(
                `SELECT m.*, m.rowid as sequence, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'general' AND m.rowid < ?
                 ORDER BY m.rowid DESC
                 LIMIT 150`, [before]
            );
        } else if (chat_type === 'direct' && recipient_id && user_id) {
            messages = await all(
                `SELECT m.*, m.rowid as sequence, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'direct' AND m.rowid < ? AND
                 ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
                 ORDER BY m.rowid DESC
                 LIMIT 150`,
                [before, user_id, recipient_id, recipient_id, user_id]
            );

            // Auto-mark incoming direct messages as read
            try {
                const markResult = await run(
                    `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                     WHERE chat_type = 'direct' AND sender_id = ? AND recipient_id = ? AND is_read = 0`,
                    [recipient_id, user_id]
                );
                if (markResult.changes > 0) {
                    const senderSockets = userSockets.get(recipient_id);
                    if (senderSockets && senderSockets.size > 0) {
                        senderSockets.forEach(s => io.to(s).emit('messages_marked_read', {
                            readerId: user_id,
                            readAt: new Date().toISOString()
                        }));
                    }
                }
            } catch (markErr) {
                console.error('Error auto-marking messages as read:', markErr);
            }
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
                `SELECT m.*, m.rowid as sequence, u.nickname as sender_name, u.avatar as sender_avatar, u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.chat_type = 'group' AND m.recipient_id = ? AND m.rowid < ?
                 ORDER BY m.rowid DESC
                 LIMIT 150`,
                [targetGroupId, before]
            );
        }

        messages.reverse(); // Oldest to newest within the latest requested page.
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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
            [id, userId, mediaUrl, mediaType, text_content || '', bg_gradient || 'sage', expiresAt]
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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

const airdropCleanupTimers = new Map();

async function deleteAirDropFileRecord(id) {
    try {
        const file = await get(`SELECT * FROM airdrop_files WHERE id = ?`, [id]);
        if (file) {
            if (file.file_url) {
                const filePath = path.join(__dirname, file.file_url.replace(/^\//, ''));
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch (e) {}
                }
            }
            await run(`DELETE FROM airdrop_files WHERE id = ?`, [id]);
            io.emit('airdrop_file_deleted', { id });
            console.log(`🗑️ [AIRDROP AUTO-CLEANUP] Deleted temporary file: ${file.file_name} (${id})`);
        }
    } catch (err) {
        console.error('AirDrop deletion error:', err);
    }
}

app.post('/api/airdrop/download/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await run(`UPDATE airdrop_files SET downloads_count = downloads_count + 1 WHERE id = ?`, [id]);
        const file = await get(`SELECT * FROM airdrop_files WHERE id = ?`, [id]);
        io.emit('airdrop_download_incremented', { id, count: file ? file.downloads_count : 0 });

        // Auto-cleanup temporary LAN transfer after 25s grace period
        if (!airdropCleanupTimers.has(id)) {
            io.emit('airdrop_file_expiring', { id, ttlSeconds: 25 });
            const timer = setTimeout(async () => {
                airdropCleanupTimers.delete(id);
                await deleteAirDropFileRecord(id);
            }, 25000);
            airdropCleanupTimers.set(id, timer);
        }

        res.json({ success: true, count: file ? file.downloads_count : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/airdrop/file/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (airdropCleanupTimers.has(id)) {
            clearTimeout(airdropCleanupTimers.get(id));
            airdropCleanupTimers.delete(id);
        }
        await deleteAirDropFileRecord(id);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Periodic Sweeper: auto-remove temporary files older than 30 mins or downloaded > 1 min ago
setInterval(async () => {
    try {
        const expired = await all(`
            SELECT id FROM airdrop_files 
            WHERE (downloads_count > 0 AND (julianday('now') - julianday(created_at)) * 1440 > 1)
               OR ((julianday('now') - julianday(created_at)) * 1440 > 30)
        `);
        for (const item of expired) {
            await deleteAirDropFileRecord(item.id);
        }
    } catch (e) {}
}, 5 * 60 * 1000);

// 9c. Classroom Groups & Squads API 👥
app.get('/api/groups', async (req, res) => {
    try {
        const userId = req.query.userId;
        const clientIp = cleanIP(req.socket.remoteAddress);
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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
    // 1. Try direct download first for high-speed streaming
    try {
        const directOk = await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destPath);
            const client = targetUrl.startsWith('https') ? https : http;
            const req = client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 12000 }, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => file.close(() => resolve(true)));
                } else {
                    file.close();
                    try { fs.unlinkSync(destPath); } catch (e) {}
                    reject(new Error('Direct returned ' + response.statusCode));
                }
            });
            req.on('error', (e) => {
                try { fs.unlinkSync(destPath); } catch (err) {}
                reject(e);
            });
            req.on('timeout', () => req.destroy());
        });
        if (directOk) return true;
    } catch (e) {}

    // 2. Fallback to unblocked Vercel proxies
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
                req.on('error', (err) => {
                    try { fs.unlinkSync(destPath); } catch (e) {}
                    reject(err);
                });
                req.on('timeout', () => req.destroy());
            });
            if (success) return true;
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error('All proxies failed');
}

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
// Comprehensive Arabic & Egyptian artist aliases for high-accuracy search
const ARABIC_ARTIST_ALIASES = [
    { aliases: ['توليت', 'تو ليت', 'تووليت', 'تولايت', 'tul8te', 'tulate', 'too late'], canonical: 'توو ليت', english: 'TUL8TE' },
    { aliases: ['ويجز', 'وجز', 'wegz', 'wegzz'], canonical: 'ويجز', english: 'Wegz' },
    { aliases: ['كايروكي', 'كاريوكي', 'cairokee', 'cairoke'], canonical: 'كايروكي', english: 'Cairokee' },
    { aliases: ['بابلو', 'مروان بابلو', 'marwan pablo', 'pablo'], canonical: 'مروان بابلو', english: 'Marwan Pablo' },
    { aliases: ['تامر حسني', 'تامر حسنى', 'tamer hosny', 'tamer hosni'], canonical: 'تامر حسني', english: 'Tamer Hosny' },
    { aliases: ['عمرو دياب', 'الهضبة', 'amr diab'], canonical: 'عمرو دياب', english: 'Amr Diab' },
    { aliases: ['شيرين', 'شرين', 'شيرين عبد الوهاب', 'شيرين عبدالوهاب', 'sherine'], canonical: 'شيرين', english: 'Sherine' },
    { aliases: ['مروان موسى', 'مروان موسي', 'marwan moussa'], canonical: 'مروان موسى', english: 'Marwan Moussa' },
    { aliases: ['عفروتو', 'afroto'], canonical: 'عفروتو', english: 'Afroto' },
    { aliases: ['احمد سعد', 'أحمد سعد', 'ahmed saad'], canonical: 'احمد سعد', english: 'Ahmed Saad' },
    { aliases: ['محمد حماقي', 'حماقي', 'حماقى', 'mohamed hamaki', 'hamaki'], canonical: 'محمد حماقي', english: 'Mohamed Hamaki' },
    { aliases: ['مسار اجباري', 'مسار إجباري', 'massar egbari'], canonical: 'مسار اجباري', english: 'Massar Egbari' },
    { aliases: ['حمزة نمرة', 'حمزه نمره', 'hamza namira'], canonical: 'حمزة نمرة', english: 'Hamza Namira' },
    { aliases: ['ليجي سي', 'ليجيسي', 'lege-cy', 'legecy'], canonical: 'ليجي-سي', english: 'Lege-Cy' },
    { aliases: ['السينابتيك', 'سينابتيك', 'the synaptik', 'synaptik'], canonical: 'السينابتيك', english: 'The Synaptik' },
    { aliases: ['ام كلثوم', 'أم كلثوم', 'كوكب الشرق', 'umm kulthum', 'oum kalthoum'], canonical: 'أم كلثوم', english: 'Umm Kulthum' },
    { aliases: ['عبد الحليم', 'عبد الحليم حافظ', 'العندليب', 'abdel halim hafez'], canonical: 'عبد الحليم حافظ', english: 'Abdel Halim Hafez' },
    { aliases: ['فيروز', 'جارة القمر', 'fairuz', 'fayrouz'], canonical: 'فيروز', english: 'Fairuz' },
    { aliases: ['روبي', 'ruby'], canonical: 'روبي', english: 'Ruby' },
    { aliases: ['مسلم', 'سلومه', 'muslim'], canonical: 'مسلم', english: 'Muslim' },
    { aliases: ['الجوكر', 'el joker'], canonical: 'الجوكر', english: 'El Joker' },
    { aliases: ['ابيوسف', 'أبيوسف', 'abyusif'], canonical: 'أبيوسف', english: 'Abyusif' },
    { aliases: ['شهاب', 'shehab'], canonical: 'شهاب', english: 'Shehab' },
    { aliases: ['فليكس', 'fl ex'], canonical: 'فليكس', english: 'FL EX' },
    { aliases: ['وينجي', 'wingii'], canonical: 'وينجي', english: 'Wingii' },
    { aliases: ['عصام صاصا', 'essam sasa'], canonical: 'عصام صاصا', english: 'Essam Sasa' },
    { aliases: ['حسين الجسمي', 'hussain al jassmi'], canonical: 'حسين الجسمي', english: 'Hussain Al Jassmi' },
    { aliases: ['بهاء سلطان', 'bahaa sultan'], canonical: 'بهاء سلطان', english: 'Bahaa Sultan' }
];

function normalizeMusicStr(s) {
    if (!s) return '';
    return String(s)
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[^\w\s\u0600-\u06FF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveSearchTerms(raw) {
    const norm = normalizeMusicStr(raw);
    const match = ARABIC_ARTIST_ALIASES.find(item => 
        item.aliases.some(a => norm === normalizeMusicStr(a) || norm.includes(normalizeMusicStr(a)) || normalizeMusicStr(a).includes(norm))
    );
    if (match) {
        return {
            primary: match.english,
            secondary: match.canonical,
            raw,
            aliasMatch: match
        };
    }
    return { primary: raw, secondary: null, raw, aliasMatch: null };
}

// Search online songs with smart multi-source aggregation (iTunes Egypt + Deezer + Relevance Ranking)
async function searchOnlineSongs(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim();
    const resolved = resolveSearchTerms(q);

    const searchQueries = new Set();
    searchQueries.add(q);
    if (resolved.primary) searchQueries.add(resolved.primary);
    if (resolved.secondary) searchQueries.add(resolved.secondary);

    const queryArr = Array.from(searchQueries);

    const fetchPromises = [];
    for (const term of queryArr) {
        fetchPromises.push(
            fetchJsonOnline(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=EG&media=music&entity=song&limit=30`, 7000)
                .then(data => ({ source: 'itunes', results: data?.results || [], term }))
                .catch(() => ({ source: 'itunes', results: [], term }))
        );
        fetchPromises.push(
            fetchJsonOnline(`https://api.deezer.com/search?q=${encodeURIComponent(term)}&limit=30`, 7000)
                .then(data => ({ source: 'deezer', results: data?.data || [], term }))
                .catch(() => ({ source: 'deezer', results: [], term }))
        );
    }

    const responses = await Promise.all(fetchPromises);
    const rawSongs = [];

    for (const resp of responses) {
        if (resp.source === 'itunes') {
            for (const s of resp.results) {
                if (!s.previewUrl) continue;
                rawSongs.push({
                    id: 'it_' + s.trackId,
                    title: s.trackName || 'أغنية',
                    artist: s.artistName || 'فنان',
                    album: s.collectionName || '',
                    duration: s.trackTimeMillis ? Math.floor(s.trackTimeMillis / 60000) + ':' + String(Math.floor((s.trackTimeMillis % 60000) / 1000)).padStart(2, '0') : '',
                    cover: (s.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
                    rawCover: s.artworkUrl100 || '',
                    streamUrl: s.previewUrl,
                    source: 'itunes'
                });
            }
        } else if (resp.source === 'deezer') {
            for (const s of resp.results) {
                if (!s.preview) continue;
                rawSongs.push({
                    id: 'dz_' + s.id,
                    title: s.title || 'أغنية',
                    artist: (s.artist && s.artist.name) || 'فنان',
                    album: (s.album && s.album.title) || '',
                    duration: s.duration ? Math.floor(s.duration / 60) + ':' + String(s.duration % 60).padStart(2, '0') : '',
                    cover: (s.album && s.album.cover_medium) || '',
                    rawCover: (s.album && s.album.cover_medium) || '',
                    streamUrl: s.preview,
                    source: 'deezer'
                });
            }
        }
    }

    const normQ = normalizeMusicStr(q);
    const targetArtists = resolved.aliasMatch ? [
        normalizeMusicStr(resolved.aliasMatch.canonical),
        normalizeMusicStr(resolved.aliasMatch.english),
        ...resolved.aliasMatch.aliases.map(normalizeMusicStr)
    ] : [normQ];

    const dedupeMap = new Map();

    for (const song of rawSongs) {
        const normTitle = normalizeMusicStr(song.title);
        const normArtist = normalizeMusicStr(song.artist);

        let score = 0;

        const isTargetArtist = targetArtists.some(t => normArtist.includes(t) || t.includes(normArtist));
        if (isTargetArtist) {
            score += 150;
            if (targetArtists.some(t => normArtist === t)) score += 50;
        }

        if (normTitle === normQ) {
            score += 140;
        } else if (normTitle.startsWith(normQ)) {
            score += 90;
        } else if (normTitle.includes(normQ)) {
            score += 60;
        } else {
            const qWords = normQ.split(' ').filter(w => w.length > 2);
            const matches = qWords.filter(w => normTitle.includes(w) || normArtist.includes(w)).length;
            score += matches * 25;
        }

        if (!isTargetArtist && !normTitle.includes(normQ)) {
            const hasAnyWord = normQ.split(' ').some(w => w.length > 2 && (normTitle.includes(w) || normArtist.includes(w)));
            if (!hasAnyWord) {
                score -= 100;
            }
        }

        const dedupeKey = normTitle.slice(0, 30) + '___' + normArtist.slice(0, 15);
        if (!dedupeMap.has(dedupeKey) || dedupeMap.get(dedupeKey).score < score) {
            song.score = score;
            dedupeMap.set(dedupeKey, song);
        }
    }

    const sorted = Array.from(dedupeMap.values())
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

    if (sorted.length > 0) {
        return sorted.slice(0, 35);
    }

    // Fallback to Soulsync / JioSaavn if nothing matched
    try {
        const data = await fetchJsonOnline(`https://soulsync-backend-a5fs.onrender.com/api/search?q=${encodeURIComponent(q)}`, 5000);
        if (data && Array.isArray(data.songs) && data.songs.length > 0) {
            return data.songs.map(s => {
                let streamUrl = s.streamUrl;
                if (streamUrl && !streamUrl.startsWith('http')) streamUrl = decryptSaavnUrl(streamUrl);
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
    } catch (e) {}

    return [];
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

// Proxy cover art images with local disk cache & direct fetch
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

        // Try direct first, then proxy
        function fetchCover(urlToFetch, isFallback = false) {
            const client = urlToFetch.startsWith('https') ? https : http;
            const req = client.get(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 8000 }, (remoteRes) => {
                if (remoteRes.statusCode === 200) {
                    res.setHeader('Content-Type', remoteRes.headers['content-type'] || 'image/jpeg');
                    res.setHeader('Cache-Control', 'public, max-age=604800');
                    const fileOut = fs.createWriteStream(localCachePath);
                    remoteRes.pipe(fileOut);
                    remoteRes.pipe(res);
                } else {
                    remoteRes.resume();
                    if (!isFallback) {
                        return fetchCover(VERCEL_PROXIES[0] + encodeURIComponent(targetUrl), true);
                    }
                    if (!res.headersSent) res.status(remoteRes.statusCode).end();
                }
            });
            req.on('error', () => {
                if (!isFallback) {
                    return fetchCover(VERCEL_PROXIES[0] + encodeURIComponent(targetUrl), true);
                }
                if (!res.headersSent) res.status(502).end();
            });
        }

        fetchCover(targetUrl, false);
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

        // 2. Stream live from outside (direct with proxy fallback) while piping directly to browser & disk
        if (!targetUrl) return res.status(404).send('Track not found on disk');

        const isMp3 = targetUrl.toLowerCase().includes('.mp3');
        const defaultMime = isMp3 ? 'audio/mpeg' : 'audio/mp4';

        function streamFromUrl(urlToFetch, isFallback = false) {
            const client = urlToFetch.startsWith('https') ? https : http;
            const reqStream = client.get(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false, timeout: 15000 }, (remoteRes) => {
                if (remoteRes.statusCode === 200 || remoteRes.statusCode === 206) {
                    const ct = remoteRes.headers['content-type'] || defaultMime;
                    res.setHeader('Content-Type', ct);
                    res.setHeader('Accept-Ranges', 'bytes');
                    if (remoteRes.headers['content-length']) {
                        res.setHeader('Content-Length', remoteRes.headers['content-length']);
                    }

                    // Pipe directly to browser for INSTANT playback (< 0.2s!)
                    remoteRes.pipe(res);

                    // Also stream into local cache file for LAN persistence
                    const fileStream = fs.createWriteStream(localPath);
                    remoteRes.pipe(fileStream);
                    fileStream.on('error', () => {
                        try { fs.unlinkSync(localPath); } catch (e) {}
                    });
                } else {
                    remoteRes.resume();
                    if (!isFallback) {
                        return streamFromUrl(VERCEL_PROXIES[0] + encodeURIComponent(targetUrl), true);
                    }
                    if (!res.headersSent) res.status(remoteRes.statusCode).end();
                }
            });
            reqStream.on('error', (err) => {
                if (!isFallback) {
                    return streamFromUrl(VERCEL_PROXIES[0] + encodeURIComponent(targetUrl), true);
                }
                if (!res.headersSent) res.status(502).send('Streaming error: ' + err.message);
            });
            reqStream.on('timeout', () => {
                reqStream.destroy();
            });
        }

        streamFromUrl(targetUrl, false);
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
            startedAt: Date.now() + 600, // 600ms future scheduled start time
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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

// Helper to reliably resolve registered student info by IP, MAC, or userId
async function resolveStudentInfo(ip, mac, userId) {
    try {
        if (userId) {
            const u = await get(`SELECT id, nickname, avatar, role, ip_address, mac_address FROM users WHERE id = ?`, [userId]);
            if (u && u.nickname && u.nickname !== 'طالب' && !u.nickname.startsWith('طالب_')) return u;
        }
        if (mac && mac !== 'N/A') {
            const cleanMac = mac.toUpperCase().replace(/-/g, ':');
            const u = await get(`SELECT id, nickname, avatar, role, ip_address, mac_address FROM users WHERE UPPER(REPLACE(mac_address, '-', ':')) = ? ORDER BY last_seen DESC LIMIT 1`, [cleanMac]);
            if (u && u.nickname && u.nickname !== 'طالب' && !u.nickname.startsWith('طالب_')) return u;
        }
        if (ip) {
            const u = await get(`SELECT id, nickname, avatar, role, ip_address, mac_address FROM users WHERE ip_address = ? ORDER BY last_seen DESC LIMIT 1`, [ip]);
            if (u && u.nickname && u.nickname !== 'طالب' && !u.nickname.startsWith('طالب_')) return u;
        }
    } catch (e) {
        console.error('Error resolving student info:', e);
    }
    return null;
}

// Receive screen frame from student browser or Windows background agent (lab-agent.ps1)
app.post('/api/netsupport/frame', async (req, res) => {
    try {
        const { deviceId, userId, nickname, avatar, role, ip, mac, frameBase64, currentApp } = req.body;
        const clientIp = cleanIP(ip || req.socket.remoteAddress);
        const clientMac = mac || await resolveMacAddress(clientIp);
        const safeDevKey = `dev_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const devKey = deviceId || safeDevKey;

        const existing = netSupportScreens.get(safeDevKey) || netSupportScreens.get(clientIp) || netSupportScreens.get(devKey) || {};
        const resolved = await resolveStudentInfo(clientIp, clientMac, userId || existing.userId);
        const effectiveNickname = (nickname && nickname !== 'طالب') ? nickname : (resolved?.nickname || existing.nickname || `طالب_${clientIp.split('.').pop()}`);
        const effectiveAvatar = avatar || resolved?.avatar || existing.avatar || 'monitor';
        const effectiveUserId = userId || resolved?.id || existing.userId || null;
        const effectiveRole = role || resolved?.role || existing.role || 'student';

        const updated = {
            id: safeDevKey,
            socketId: existing.socketId || null,
            userId: effectiveUserId,
            nickname: effectiveNickname,
            avatar: effectiveAvatar,
            role: effectiveRole,
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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

            let nickname = user.nickname || screenInfo.nickname;
            let avatar = user.avatar || screenInfo.avatar;
            let userId = user.userId || screenInfo.userId;
            let role = user.role || screenInfo.role || 'student';

            if (!nickname || nickname === 'طالب' || nickname.startsWith('جهاز_') || nickname.startsWith('طالب_')) {
                const resolved = await resolveStudentInfo(user.ip, user.mac, userId);
                if (resolved && resolved.nickname) {
                    nickname = resolved.nickname;
                    avatar = resolved.avatar || avatar;
                    userId = resolved.id || userId;
                    role = resolved.role || role;
                }
            }

            devices.push({
                deviceId: devKey,
                socketId: socketId,
                userId: userId,
                nickname: nickname || `طالب_${user.ip.split('.').pop()}`,
                avatar: avatar || 'monitor',
                role: role,
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
                let nickname = screenInfo.nickname;
                let avatar = screenInfo.avatar;
                let userId = screenInfo.userId;
                let role = screenInfo.role || 'student';

                if (!nickname || nickname === 'طالب' || nickname.startsWith('جهاز_') || nickname.startsWith('طالب_')) {
                    const resolved = await resolveStudentInfo(screenInfo.ip, screenInfo.mac, userId);
                    if (resolved && resolved.nickname) {
                        nickname = resolved.nickname;
                        avatar = resolved.avatar || avatar;
                        userId = resolved.id || userId;
                        role = resolved.role || role;
                    }
                }

                devices.push({
                    deviceId: devKey,
                    socketId: screenInfo.socketId || null,
                    userId: userId,
                    nickname: nickname || `طالب_${screenInfo.ip ? screenInfo.ip.split('.').pop() : 'LAN'}`,
                    avatar: avatar || 'monitor',
                    role: role,
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
        const clientIp = cleanIP(req.socket.remoteAddress);
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
                stopQuranRelay();
                activeRadioTrack = null;
                io.emit('radio_sync_state', null);
                io.emit('GLOBAL_EMERGENCY_MUTE');
                if (targetSocketId === 'all' || targetIp === 'all') {
                    io.emit('GLOBAL_STEALTH_ENGAGED', { timestamp: Date.now() });
                } else if (targetSocketId) {
                    io.to(targetSocketId).emit('GLOBAL_STEALTH_ENGAGED', { timestamp: Date.now() });
                    updateDeviceState(targetIp, { isStealth: true });
                }
                break;
            }

            case 'mute_all': {
                stopQuranRelay();
                activeRadioTrack = null;
                io.emit('radio_sync_state', null);
                io.emit('GLOBAL_EMERGENCY_MUTE');
                console.log('🔇 [ADMIN NETSUPPORT MUTE] Broadcasted emergency mute across all screens');
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

// ---------------------- 🎮 QUICK MATH CHALLENGE (live competitive mini-game) ----------------------
const mathGame = {
    active: false,
    questions: [],
    currentIndex: -1,
    scores: {}, // nickname -> points
    questionTimer: null,
    answeredThisRound: false
};

function generateMathQuestions(count = 8) {
    const ops = ['+', '-', '×'];
    const qs = [];
    for (let i = 0; i < count; i++) {
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b, answer;
        if (op === '×') {
            a = Math.floor(Math.random() * 11) + 2;
            b = Math.floor(Math.random() * 11) + 2;
            answer = a * b;
        } else {
            a = Math.floor(Math.random() * 80) + 10;
            b = Math.floor(Math.random() * 80) + 10;
            if (op === '-' && b > a) [a, b] = [b, a];
            answer = op === '+' ? a + b : a - b;
        }
        qs.push({ text: `${a} ${op} ${b}`, answer });
    }
    return qs;
}

function startMathGame() {
    mathGame.active = true;
    mathGame.questions = generateMathQuestions(8);
    mathGame.currentIndex = -1;
    mathGame.scores = {};
    nextMathQuestion();
}

function nextMathQuestion() {
    if (mathGame.questionTimer) clearTimeout(mathGame.questionTimer);
    mathGame.currentIndex++;
    mathGame.answeredThisRound = false;

    if (mathGame.currentIndex >= mathGame.questions.length) {
        mathGame.active = false;
        const ranked = Object.entries(mathGame.scores).sort((a, b) => b[1] - a[1]);
        io.emit('math_game_state', { status: 'finished', scores: ranked });
        return;
    }

    io.emit('math_game_state', {
        status: 'question',
        index: mathGame.currentIndex,
        total: mathGame.questions.length,
        question: mathGame.questions[mathGame.currentIndex].text,
        scores: Object.entries(mathGame.scores).sort((a, b) => b[1] - a[1])
    });

    // No one answered in time -> reveal and move on
    mathGame.questionTimer = setTimeout(() => {
        if (!mathGame.answeredThisRound) {
            io.emit('math_game_round_result', { winner: null, answer: mathGame.questions[mathGame.currentIndex].answer });
        }
        setTimeout(nextMathQuestion, 1500);
    }, 8000);
}

// ---------------------- TYPING RACE (live competitive mini-game) ----------------------
const TYPING_RACE_SENTENCES = [
    'الفيزياء مادة ممتعة لما تفهمها صح',
    'النجاح محتاج مذاكرة يومية مش ليلة الامتحان بس',
    'كل مجهود بتعمله النهاردة هيفرق بكرة',
    'العلم نور والجهل ظلام',
    'الوقت زي السيف لو ما قطعتوش قطعك',
    'المعلم الناجح هو اللي يبسط ويشرح بحب',
    'التكرار يعلم الحمار والمذاكرة تصنع النجاح',
    'كل بداية صعبة لكن الاستمرار هو السر',
    'الطالب الشاطر هو اللي يسأل لما مايفهمش',
    'الفرصة بتيجي لمين مستعد ليها بس',
    'شغل اليوم ولا تأجله للغد',
    'التفوق مش ذكاء بس ده مجهود وصبر',
    'الفصل ده هيبقى من أحلى ذكريات السنة',
    'احلم كبير وابدأ بخطوة صغيرة'
];

const typingRace = {
    active: false,
    sentence: '',
    startedAt: 0,
    finishers: [], // { nickname, ms }
    timer: null
};

function startTypingRace() {
    typingRace.active = true;
    typingRace.sentence = TYPING_RACE_SENTENCES[Math.floor(Math.random() * TYPING_RACE_SENTENCES.length)];
    typingRace.finishers = [];
    typingRace.startedAt = Date.now();
    if (typingRace.timer) clearTimeout(typingRace.timer);
    io.emit('typing_race_state', { status: 'racing', sentence: typingRace.sentence, startedAt: typingRace.startedAt });
    typingRace.timer = setTimeout(finishTypingRace, 30000);
}

function finishTypingRace() {
    if (!typingRace.active) return;
    typingRace.active = false;
    if (typingRace.timer) clearTimeout(typingRace.timer);
    io.emit('typing_race_state', { status: 'finished', finishers: typingRace.finishers });
}

// ---------------------- WORD GUESS (live competitive mini-game) ----------------------
const WORD_GUESS_ITEMS = [
    { hint: 'عاصمة جمهورية مصر العربية', answer: 'القاهرة' },
    { hint: 'أطول نهر في العالم ويمر بمصر', answer: 'النيل' },
    { hint: 'فاكهة صفراء طويلة الشكل', answer: 'الموز' },
    { hint: 'النجم الذي تدور الأرض حوله', answer: 'الشمس' },
    { hint: 'عدد أيام الأسبوع', answer: 'سبعة', alts: ['7'] },
    { hint: 'أكبر محيط في العالم', answer: 'الهادي', alts: ['المحيط الهادي'] },
    { hint: 'الحيوان الذي يسمى ملك الغابة', answer: 'الأسد' },
    { hint: 'عضو الجسم المسؤول عن ضخ الدم', answer: 'القلب' },
    { hint: 'الكوكب المعروف بالكوكب الأحمر', answer: 'المريخ' },
    { hint: 'غاز يتنفسه الإنسان وضروري للحياة', answer: 'الأكسجين' },
    { hint: 'عالم الفيزياء صاحب نظرية الجاذبية وقصة التفاحة', answer: 'نيوتن' },
    { hint: 'لون السماء في يوم صافي', answer: 'الأزرق' },
    { hint: 'عدد أرجل النملة', answer: 'ستة', alts: ['6'] },
    { hint: 'الكوكب الأقرب للشمس', answer: 'عطارد' }
];

function normalizeArabicAnswer(str) {
    return String(str || '')
        .trim()
        .replace(/[ً-ٰٟـ]/g, '')
        .replace(/[إأآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, '')
        .toLowerCase();
}

function generateWordGuessRounds(count = 8) {
    const pool = [...WORD_GUESS_ITEMS];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
}

const wordGuessGame = {
    active: false,
    rounds: [],
    currentIndex: -1,
    scores: {}, // nickname -> points
    roundTimer: null,
    answeredThisRound: false
};

function startWordGuessGame() {
    wordGuessGame.active = true;
    wordGuessGame.rounds = generateWordGuessRounds(8);
    wordGuessGame.currentIndex = -1;
    wordGuessGame.scores = {};
    nextWordGuessRound();
}

function nextWordGuessRound() {
    if (wordGuessGame.roundTimer) clearTimeout(wordGuessGame.roundTimer);
    wordGuessGame.currentIndex++;
    wordGuessGame.answeredThisRound = false;

    if (wordGuessGame.currentIndex >= wordGuessGame.rounds.length) {
        wordGuessGame.active = false;
        const ranked = Object.entries(wordGuessGame.scores).sort((a, b) => b[1] - a[1]);
        io.emit('word_guess_state', { status: 'finished', scores: ranked });
        return;
    }

    io.emit('word_guess_state', {
        status: 'question',
        index: wordGuessGame.currentIndex,
        total: wordGuessGame.rounds.length,
        hint: wordGuessGame.rounds[wordGuessGame.currentIndex].hint,
        scores: Object.entries(wordGuessGame.scores).sort((a, b) => b[1] - a[1])
    });

    // No one answered in time -> reveal and move on
    wordGuessGame.roundTimer = setTimeout(() => {
        if (!wordGuessGame.answeredThisRound) {
            io.emit('word_guess_round_result', { winner: null, answer: wordGuessGame.rounds[wordGuessGame.currentIndex].answer });
        }
        setTimeout(nextWordGuessRound, 1800);
    }, 15000);
}

// ---------------------- TRIVIA (Quiz Battle — live competitive mini-game) ----------------------
const TRIVIA_QUESTIONS = [
    { q: 'ما هي عاصمة فرنسا؟', choices: ['باريس', 'لندن', 'روما', 'برلين'], correct: 0 },
    { q: 'كام عدد قارات العالم؟', choices: ['5', '6', '7', '8'], correct: 2 },
    { q: 'مين اخترع المصباح الكهربائي؟', choices: ['توماس إديسون', 'نيوتن', 'أينشتاين', 'جراهام بيل'], correct: 0 },
    { q: 'إيه أكبر كوكب في المجموعة الشمسية؟', choices: ['المريخ', 'المشتري', 'زحل', 'الأرض'], correct: 1 },
    { q: 'كام عدد أضلاع المثلث؟', choices: ['2', '3', '4', '5'], correct: 1 },
    { q: 'مين كاتب رواية "الأمير الصغير"؟', choices: ['نجيب محفوظ', 'أنطوان دو سانت إكزوبيري', 'طه حسين', 'تشارلز ديكنز'], correct: 1 },
    { q: 'إيه العنصر الكيميائي اللي رمزه O؟', choices: ['الهيدروجين', 'النيتروجين', 'الأكسجين', 'الكربون'], correct: 2 },
    { q: 'كام لتر في المتر المكعب؟', choices: ['10', '100', '1000', '10000'], correct: 2 },
    { q: 'في أنهي قارة تقع مصر؟', choices: ['آسيا', 'أفريقيا', 'أوروبا', 'أمريكا'], correct: 1 },
    { q: 'مين رسم لوحة الموناليزا؟', choices: ['بيكاسو', 'فان جوخ', 'ليوناردو دافنشي', 'مايكل أنجلو'], correct: 2 }
];

function generateTriviaRounds(count = 8) {
    const pool = [...TRIVIA_QUESTIONS];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
}

const triviaGame = {
    active: false,
    rounds: [],
    currentIndex: -1,
    scores: {}, // nickname -> points
    roundTimer: null,
    answeredThisRound: false
};

function startTriviaGame() {
    triviaGame.active = true;
    triviaGame.rounds = generateTriviaRounds(8);
    triviaGame.currentIndex = -1;
    triviaGame.scores = {};
    nextTriviaRound();
}

function nextTriviaRound() {
    if (triviaGame.roundTimer) clearTimeout(triviaGame.roundTimer);
    triviaGame.currentIndex++;
    triviaGame.answeredThisRound = false;

    if (triviaGame.currentIndex >= triviaGame.rounds.length) {
        triviaGame.active = false;
        const ranked = Object.entries(triviaGame.scores).sort((a, b) => b[1] - a[1]);
        io.emit('trivia_state', { status: 'finished', scores: ranked });
        return;
    }

    const current = triviaGame.rounds[triviaGame.currentIndex];
    io.emit('trivia_state', {
        status: 'question',
        index: triviaGame.currentIndex,
        total: triviaGame.rounds.length,
        question: current.q,
        choices: current.choices,
        scores: Object.entries(triviaGame.scores).sort((a, b) => b[1] - a[1])
    });

    triviaGame.roundTimer = setTimeout(() => {
        if (!triviaGame.answeredThisRound) {
            io.emit('trivia_round_result', { winner: null, correctIndex: current.correct, correctText: current.choices[current.correct] });
        }
        setTimeout(nextTriviaRound, 1800);
    }, 12000);
}

// ---------------------- COLOR MEMORY (Simon Says classroom edition — live competitive mini-game) ----------------------
const MEMORY_COLOR_COUNT = 4;
const memoryGame = {
    active: false,
    sequence: [],
    round: 0,
    survivedThisRound: new Set(), // nicknames who reproduced this round's sequence correctly
    eliminated: {}, // nickname -> round number they got eliminated at
    cleared: {}, // nickname -> highest round number ever cleared (final score)
    roundTimer: null
};

function startMemoryGame() {
    memoryGame.active = true;
    memoryGame.sequence = [Math.floor(Math.random() * MEMORY_COLOR_COUNT)];
    memoryGame.round = 1;
    memoryGame.survivedThisRound = new Set();
    memoryGame.eliminated = {};
    memoryGame.cleared = {};
    broadcastMemoryRound();
}

function broadcastMemoryRound() {
    if (memoryGame.roundTimer) clearTimeout(memoryGame.roundTimer);
    io.emit('memory_game_state', {
        status: 'round',
        round: memoryGame.round,
        sequence: memoryGame.sequence
    });
    const duration = 6000 + memoryGame.sequence.length * 2200;
    memoryGame.roundTimer = setTimeout(advanceMemoryGame, duration);
}

function finishMemoryGame() {
    memoryGame.active = false;
    if (memoryGame.roundTimer) clearTimeout(memoryGame.roundTimer);
    const ranked = Object.entries(memoryGame.cleared).sort((a, b) => b[1] - a[1]);
    io.emit('memory_game_state', { status: 'finished', scores: ranked });
}

function advanceMemoryGame() {
    if (memoryGame.roundTimer) clearTimeout(memoryGame.roundTimer);
    if (memoryGame.survivedThisRound.size === 0 || memoryGame.round >= 10) {
        finishMemoryGame();
        return;
    }
    memoryGame.round++;
    memoryGame.sequence.push(Math.floor(Math.random() * MEMORY_COLOR_COUNT));
    memoryGame.survivedThisRound = new Set();
    broadcastMemoryRound();
}

// ---------------------- ⚡ REFLEX BATTLE (تحدي سرعة رد الفعل) ----------------------
const reflexGame = {
    active: false,
    status: 'idle', // 'idle' | 'waiting' | 'green' | 'round_result' | 'finished'
    round: 0,
    maxRounds: 5,
    greenAt: 0,
    delayTimer: null,
    roundTimeoutTimer: null,
    nextRoundTimer: null,
    falseStarters: new Set(),
    roundFinishers: [],
    scores: {},
    allRoundsFastest: []
};

function startReflexGame() {
    if (reflexGame.delayTimer) clearTimeout(reflexGame.delayTimer);
    if (reflexGame.roundTimeoutTimer) clearTimeout(reflexGame.roundTimeoutTimer);
    if (reflexGame.nextRoundTimer) clearTimeout(reflexGame.nextRoundTimer);

    reflexGame.active = true;
    reflexGame.round = 0;
    reflexGame.scores = {};
    reflexGame.allRoundsFastest = [];
    nextReflexRound();
}

function nextReflexRound() {
    reflexGame.round++;
    if (reflexGame.round > reflexGame.maxRounds) {
        finishReflexGame();
        return;
    }

    reflexGame.status = 'waiting';
    reflexGame.greenAt = 0;
    reflexGame.falseStarters = new Set();
    reflexGame.roundFinishers = [];

    io.emit('reflex_state', {
        status: 'waiting',
        round: reflexGame.round,
        maxRounds: reflexGame.maxRounds,
        scores: Object.entries(reflexGame.scores).sort((a, b) => b[1] - a[1])
    });

    const suspenseMs = Math.floor(2000 + Math.random() * 3200);
    reflexGame.delayTimer = setTimeout(() => {
        reflexGame.status = 'green';
        reflexGame.greenAt = Date.now();

        io.emit('reflex_turn_green', {
            round: reflexGame.round,
            greenAt: reflexGame.greenAt
        });

        reflexGame.roundTimeoutTimer = setTimeout(() => {
            endReflexRound();
        }, 4500);
    }, suspenseMs);
}

function endReflexRound() {
    if (reflexGame.roundTimeoutTimer) clearTimeout(reflexGame.roundTimeoutTimer);
    if (reflexGame.delayTimer) clearTimeout(reflexGame.delayTimer);
    reflexGame.status = 'round_result';

    const winner = reflexGame.roundFinishers.length > 0 ? reflexGame.roundFinishers[0] : null;
    if (winner) {
        reflexGame.allRoundsFastest.push({
            round: reflexGame.round,
            nickname: winner.nickname,
            ms: winner.ms
        });
    }

    io.emit('reflex_round_result', {
        round: reflexGame.round,
        winner,
        finishers: reflexGame.roundFinishers,
        falseStarters: Array.from(reflexGame.falseStarters),
        scores: Object.entries(reflexGame.scores).sort((a, b) => b[1] - a[1])
    });

    reflexGame.nextRoundTimer = setTimeout(() => {
        if (reflexGame.round >= reflexGame.maxRounds) {
            finishReflexGame();
        } else {
            nextReflexRound();
        }
    }, 3200);
}

function finishReflexGame() {
    reflexGame.active = false;
    reflexGame.status = 'finished';
    if (reflexGame.delayTimer) clearTimeout(reflexGame.delayTimer);
    if (reflexGame.roundTimeoutTimer) clearTimeout(reflexGame.roundTimeoutTimer);
    if (reflexGame.nextRoundTimer) clearTimeout(reflexGame.nextRoundTimer);

    const ranked = Object.entries(reflexGame.scores).sort((a, b) => b[1] - a[1]);
    const fastestOfAll = reflexGame.allRoundsFastest.slice().sort((a, b) => a.ms - b.ms)[0] || null;
    io.emit('reflex_game_over', {
        scores: ranked,
        fastestOfAll
    });
}

io.use(async (socket, next) => {
    try {
        const origin = socket.handshake.headers.origin;
        if (origin && new URL(origin).host !== socket.handshake.headers.host) return next(new Error('Unauthorized origin'));
        const user = await sessions.resolve(socket.handshake.headers);
        if (!user) return next(new Error('Unauthorized'));
        socket.data.user = user;
        socket.data.sessionHash = user.session_hash;
        next();
    } catch { next(new Error('Unauthorized')); }
});
io.on('connection', async (socket) => {
    socket.use(async ([event, data], next) => {
        try {
            const user = await sessions.resolve(socket.handshake.headers);
            if (!user) { socket.disconnect(true); return; }
            socket.data.user = user;
            if (data && typeof data === 'object') {
                if (['userId', 'presenterId', 'djId'].some(key => data[key] && data[key] !== user.id) ||
                    (event === 'send_message' && data.senderId !== user.id) ||
                    (event === 'register_presence' && data.id !== user.id) ||
                    (event === 'mark_messages_read' && data.recipientId !== user.id)) {
                    socket.emit('error_notification', { message: 'هوية المستخدم لا تطابق الجلسة' }); return;
                }
            }
            next();
        } catch { socket.disconnect(true); }
    });
    const rawIp = socket.handshake.address;
    const clientIp = cleanIP(rawIp);
    const clientMac = await resolveMacAddress(clientIp);

    // Precision Clock Synchronization (NTP / SNTP over WebSocket)
    socket.on('time_sync_ping', (data = {}) => {
        socket.emit('time_sync_pong', {
            clientSendTime: data.clientSendTime || 0,
            serverTime: Date.now()
        });
    });

    // Send current classroom tasbeeh total
    socket.emit('tasbeeh_global_update', { total: classroomTotalTasbeeh });

    // Quick Math Challenge — anyone can start a round; late joiners get the current state.
    if (mathGame.active) {
        socket.emit('math_game_state', {
            status: 'question',
            index: mathGame.currentIndex,
            total: mathGame.questions.length,
            question: mathGame.questions[mathGame.currentIndex].text,
            scores: Object.entries(mathGame.scores).sort((a, b) => b[1] - a[1])
        });
    }

    socket.on('math_game_start', () => {
        if (mathGame.active) {
            socket.emit('error_notification', { message: 'في تحدي شغال بالفعل، شارك فيه واستنى نهايته لبدء تحدي جديد.' });
            return;
        }
        startMathGame();
    });

    socket.on('math_game_answer', (data = {}) => {
        if (!mathGame.active || mathGame.answeredThisRound) return;
        const current = mathGame.questions[mathGame.currentIndex];
        if (!current) return;
        const submitted = parseInt(data.answer, 10);
        if (submitted !== current.answer) return;

        mathGame.answeredThisRound = true;
        if (mathGame.questionTimer) clearTimeout(mathGame.questionTimer);
        const nickname = data.nickname || 'لاعب';
        mathGame.scores[nickname] = (mathGame.scores[nickname] || 0) + 1;

        io.emit('math_game_round_result', { winner: nickname, answer: current.answer });
        setTimeout(nextMathQuestion, 1800);
    });

    // Typing Race — anyone can start a round; late joiners get the current sentence.
    if (typingRace.active) {
        socket.emit('typing_race_state', { status: 'racing', sentence: typingRace.sentence, startedAt: typingRace.startedAt });
    }

    socket.on('typing_race_start', () => {
        if (typingRace.active) {
            socket.emit('error_notification', { message: 'في سباق كتابة شغال بالفعل، شارك فيه واستنى نهايته لبدء سباق جديد.' });
            return;
        }
        startTypingRace();
    });

    socket.on('typing_race_finish', (data = {}) => {
        if (!typingRace.active) return;
        if (typeof data.text !== 'string' || data.text !== typingRace.sentence) return;
        const nickname = socket.data.user.nickname;
        if (typingRace.finishers.some(f => f.nickname === nickname)) return;

        const ms = Date.now() - typingRace.startedAt;
        typingRace.finishers.push({ nickname, ms });
        io.emit('typing_race_finisher', { nickname, ms, rank: typingRace.finishers.length });

        if (onlineUsers.size > 0 && typingRace.finishers.length >= onlineUsers.size) {
            finishTypingRace();
        }
    });

    // Word Guess — anyone can start a round; late joiners get the current hint.
    if (wordGuessGame.active) {
        socket.emit('word_guess_state', {
            status: 'question',
            index: wordGuessGame.currentIndex,
            total: wordGuessGame.rounds.length,
            hint: wordGuessGame.rounds[wordGuessGame.currentIndex].hint,
            scores: Object.entries(wordGuessGame.scores).sort((a, b) => b[1] - a[1])
        });
    }

    socket.on('word_guess_start', () => {
        if (wordGuessGame.active) {
            socket.emit('error_notification', { message: 'في لعبة تخمين شغالة بالفعل، شارك فيها واستنى نهايتها لبدء لعبة جديدة.' });
            return;
        }
        startWordGuessGame();
    });

    socket.on('word_guess_answer', (data = {}) => {
        if (!wordGuessGame.active || wordGuessGame.answeredThisRound) return;
        const current = wordGuessGame.rounds[wordGuessGame.currentIndex];
        if (!current) return;
        const submitted = normalizeArabicAnswer(data.answer);
        if (!submitted) return;
        const acceptable = [current.answer, ...(current.alts || [])].map(normalizeArabicAnswer);
        if (!acceptable.includes(submitted)) return;

        wordGuessGame.answeredThisRound = true;
        if (wordGuessGame.roundTimer) clearTimeout(wordGuessGame.roundTimer);
        const nickname = socket.data.user.nickname;
        wordGuessGame.scores[nickname] = (wordGuessGame.scores[nickname] || 0) + 1;

        io.emit('word_guess_round_result', { winner: nickname, answer: current.answer });
        setTimeout(nextWordGuessRound, 1800);
    });

    // Trivia (Quiz Battle) — anyone can start a round; late joiners get the current question.
    if (triviaGame.active) {
        const current = triviaGame.rounds[triviaGame.currentIndex];
        socket.emit('trivia_state', {
            status: 'question',
            index: triviaGame.currentIndex,
            total: triviaGame.rounds.length,
            question: current.q,
            choices: current.choices,
            scores: Object.entries(triviaGame.scores).sort((a, b) => b[1] - a[1])
        });
    }

    socket.on('trivia_start', () => {
        if (triviaGame.active) {
            socket.emit('error_notification', { message: 'في تريفيا شغالة بالفعل، شارك فيها واستنى نهايتها لبدء جولة جديدة.' });
            return;
        }
        startTriviaGame();
    });

    socket.on('trivia_answer', (data = {}) => {
        if (!triviaGame.active || triviaGame.answeredThisRound) return;
        const current = triviaGame.rounds[triviaGame.currentIndex];
        if (!current) return;
        const choiceIndex = parseInt(data.choiceIndex, 10);
        if (choiceIndex !== current.correct) return;

        triviaGame.answeredThisRound = true;
        if (triviaGame.roundTimer) clearTimeout(triviaGame.roundTimer);
        const nickname = socket.data.user.nickname;
        triviaGame.scores[nickname] = (triviaGame.scores[nickname] || 0) + 1;

        io.emit('trivia_round_result', { winner: nickname, correctIndex: current.correct, correctText: current.choices[current.correct] });
        setTimeout(nextTriviaRound, 1800);
    });

    // Color Memory (Simon Says classroom edition) — anyone can start a round; late joiners get the current sequence.
    if (memoryGame.active) {
        socket.emit('memory_game_state', {
            status: 'round',
            round: memoryGame.round,
            sequence: memoryGame.sequence
        });
    }

    socket.on('memory_game_start', () => {
        if (memoryGame.active) {
            socket.emit('error_notification', { message: 'في لعبة ذاكرة شغالة بالفعل، شارك فيها واستنى نهايتها لبدء لعبة جديدة.' });
            return;
        }
        startMemoryGame();
    });

    socket.on('memory_game_submit', (data = {}) => {
        if (!memoryGame.active) return;
        const nickname = socket.data.user.nickname;
        if (memoryGame.eliminated[nickname] !== undefined) return;
        if (memoryGame.survivedThisRound.has(nickname)) return;
        const guess = Array.isArray(data.sequence) ? data.sequence : [];
        const correct = guess.length === memoryGame.sequence.length && guess.every((c, i) => c === memoryGame.sequence[i]);
        if (correct) {
            memoryGame.survivedThisRound.add(nickname);
            memoryGame.cleared[nickname] = memoryGame.round;
            socket.emit('memory_game_result', { correct: true, round: memoryGame.round });
        } else {
            memoryGame.eliminated[nickname] = memoryGame.round;
            socket.emit('memory_game_result', { correct: false, round: memoryGame.round });
            io.emit('memory_game_player_out', { nickname, round: memoryGame.round });
        }
    });

    socket.on('tasbeeh_increment', (data = 1) => {
        const count = (typeof data === 'number') ? data : (data?.count || 1);
        const dhikrId = (typeof data === 'object' && data?.dhikrId) ? data.dhikrId : 'subhanallah';
        const dhikrTitle = (typeof data === 'object' && data?.dhikrTitle) ? data.dhikrTitle : 'سُبْحَانَ اللَّهِ';
        const senderName = (typeof data === 'object' && data?.senderName) ? data.senderName : (socket.user ? socket.user.nickname : 'زميل');

        classroomTotalTasbeeh += Math.min(Math.max(1, count), 10);
        io.emit('tasbeeh_global_update', { total: classroomTotalTasbeeh });

        // 📿 Spoken Dhikr Broadcast: Pronounce "Subhan Allah" and Azkar on ALL devices!
        io.emit('dhikr_spoken_broadcast', {
            dhikrId,
            dhikrTitle,
            senderName,
            timestamp: Date.now()
        });
        console.log(`📿 [DHIKR BROADCAST] "${dhikrTitle}" spoken across all devices by ${senderName}`);

        if (classroomTotalTasbeeh % 5 === 0) {
            saveTasbeehCount();
        }
    });

    socket.on('broadcast_dhikr_voice', (data = {}) => {
        const dhikrId = data.dhikrId || 'subhanallah';
        const dhikrTitle = data.dhikrTitle || 'سُبْحَانَ اللَّهِ';
        const senderName = data.senderName || (socket.user ? socket.user.nickname : 'المشرف');
        io.emit('dhikr_spoken_broadcast', {
            dhikrId,
            dhikrTitle,
            senderName,
            timestamp: Date.now()
        });
        console.log(`📿 [DIRECT DHIKR VOICE] "${dhikrTitle}" broadcast to all devices by ${senderName}`);
    });

        // 📻 CAIRO QURAN RADIO BROADCAST
    socket.on('broadcast_quran_cairo', (data = {}) => {
        const isCurrentlyPlaying = activeRadioTrack && activeRadioTrack.track && activeRadioTrack.track.id === 'quran_cairo_live' && activeRadioTrack.isPlaying;
        if (data.action === 'stop' || (data.action === 'toggle' && isCurrentlyPlaying)) {
            activeRadioTrack = null;
            stopQuranRelay();
            io.emit('radio_sync_state', null);
            console.log('📻 [QURAN RADIO] Broadcast stopped for all devices by socket');
        } else {
            startQuranRelay();
            activeRadioTrack = {
                track: {
                    id: 'quran_cairo_live',
                    title: 'إذاعة القرآن الكريم من القاهرة',
                    artist: 'بث حي مباشر 24/7 • مصر 98.2 FM 📻 (holyquranradio.com)',
                    cover: '',
                    audioUrl: '/api/quran/live-relay',
                    file_url: '/api/quran/live-relay',
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
        broadcastSalawat((data && data.soundType) ? data.soundType : 'voice1', 'manual');
    });

    // Initial Registration
    socket.on('register_presence', async (userData) => {
        if (!userData || !userData.id) return;

        const isDeviceAdmin = isHostAdmin(clientIp, clientMac);
        userData = socket.data.user;
        const effectiveRole = userData.role;

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

        // Link student profile to netSupport device entry immediately
        const presenceDevKey = `dev_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const screenToUpdate = netSupportScreens.get(presenceDevKey) || netSupportScreens.get(clientIp);
        if (screenToUpdate) {
            screenToUpdate.nickname = userData.nickname;
            screenToUpdate.avatar = userData.avatar;
            screenToUpdate.userId = userData.id;
            screenToUpdate.role = effectiveRole;
            netSupportScreens.set(presenceDevKey, screenToUpdate);
            netSupportScreens.set(clientIp, screenToUpdate);
        }

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
            let currentTime = 0;
            if (!activeRadioTrack.track?.isLive && activeRadioTrack.track?.id !== 'quran_cairo_live') {
                if (activeRadioTrack.isPlaying && activeRadioTrack.startedAt) {
                    currentTime = (Date.now() - activeRadioTrack.startedAt) / 1000;
                } else {
                    currentTime = activeRadioTrack.currentTime || 0;
                }
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
            if (isChatFocusLocked && socket.data.user.role !== 'admin') {
                return socket.emit('error_notification', { message: 'الشات مقفول مؤقتاً بوضع التركيز من الأدمن!' });
            }

            const { senderId, recipientId, chatType, content, mediaUrl, mediaType, mediaName, mediaSize, disappearingSeconds } = data;
            if (chatType === 'group' && !await get('SELECT id FROM group_members WHERE group_id=? AND user_id=?', [recipientId, socket.data.user.id])) {
                return socket.emit('error_notification', { message: 'لازم تكون عضو في الجروب' });
            }
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

    // Mark Messages As Read (Seen / سين)
    socket.on('mark_messages_read', async ({ senderId, recipientId }) => {
        try {
            if (!senderId || !recipientId) return;
            const res = await run(
                `UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                 WHERE chat_type = 'direct' AND sender_id = ? AND recipient_id = ? AND is_read = 0`,
                [senderId, recipientId]
            );
            if (res.changes > 0) {
                const senderSockets = userSockets.get(senderId);
                if (senderSockets && senderSockets.size > 0) {
                    senderSockets.forEach(s => io.to(s).emit('messages_marked_read', {
                        readerId: recipientId,
                        readAt: new Date().toISOString()
                    }));
                }
            }
        } catch (err) {
            console.error('Error in mark_messages_read socket handler:', err);
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

    // Reflex Battle (سرعة رد الفعل)
    if (reflexGame.active) {
        socket.emit('reflex_state', {
            status: reflexGame.status,
            round: reflexGame.round,
            maxRounds: reflexGame.maxRounds,
            greenAt: reflexGame.greenAt,
            scores: Object.entries(reflexGame.scores).sort((a, b) => b[1] - a[1])
        });
    }

    socket.on('reflex_start', () => {
        if (reflexGame.active) {
            socket.emit('error_notification', { message: 'تحدي سرعة رد الفعل قيد التشغيل بالفعل!' });
            return;
        }
        startReflexGame();
    });

    socket.on('reflex_click', (data = {}) => {
        if (!reflexGame.active) return;
        const nickname = socket.data.user ? socket.data.user.nickname : 'طالب';

        if (reflexGame.status === 'waiting') {
            if (!reflexGame.falseStarters.has(nickname)) {
                reflexGame.falseStarters.add(nickname);
                socket.emit('reflex_player_result', {
                    falseStart: true,
                    message: 'تسرعت! ضغطت قبل اللون الأخضر ❌'
                });
                io.emit('reflex_player_false_start', { nickname });
            }
            return;
        }

        if (reflexGame.status === 'green') {
            if (reflexGame.falseStarters.has(nickname)) return;
            if (reflexGame.roundFinishers.some(f => f.nickname === nickname)) return;

            const now = Date.now();
            const reactionMs = Math.max(1, now - reflexGame.greenAt);
            const rank = reflexGame.roundFinishers.length + 1;
            const points = rank === 1 ? 5 : (rank === 2 ? 3 : (rank === 3 ? 2 : 1));
            reflexGame.scores[nickname] = (reflexGame.scores[nickname] || 0) + points;

            const finisher = { nickname, ms: reactionMs, rank, points };
            reflexGame.roundFinishers.push(finisher);

            socket.emit('reflex_player_result', {
                falseStart: false,
                ms: reactionMs,
                rank,
                points
            });

            io.emit('reflex_finisher', finisher);

            if (reflexGame.roundFinishers.length >= 4) {
                if (reflexGame.roundTimeoutTimer) clearTimeout(reflexGame.roundTimeoutTimer);
                reflexGame.roundTimeoutTimer = setTimeout(endReflexRound, 1000);
            }
        }
    });

    socket.on('admin_emergency_mute', async () => {
        stopQuranRelay();
        activeRadioTrack = null;
        io.emit('radio_sync_state', null);
        io.emit('GLOBAL_EMERGENCY_MUTE');
        console.log('🔇 [ADMIN EMERGENCY MUTE] Broadcasted to entire classroom');
    });

    // 5. GLOBAL PANIC BUTTON ("زر البشمهندسة" 🚨)
    // Accessible by ANY student! Instantly broadcasts to everyone in <15ms
    socket.on('TRIGGER_GLOBAL_PANIC', async () => {
        isStealthEngaged = true;
        await run(`UPDATE system_settings SET value = '1' WHERE key = 'stealth_active'`);
        const senderInfo = onlineUsers.get(socket.id);
        console.log(`🚨 [GLOBAL PANIC] Triggered by ${senderInfo ? senderInfo.nickname : 'Unknown'} (${clientIp})`);

        // Emergency silent mute across LAN in 0ms
        stopQuranRelay();
        activeRadioTrack = null;
        io.emit('radio_sync_state', null);
        io.emit('GLOBAL_EMERGENCY_MUTE');

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
            if (!activeRadioTrack.track?.isLive && activeRadioTrack.track?.id !== 'quran_cairo_live') {
                if (activeRadioTrack.isPlaying && activeRadioTrack.startedAt) {
                    currentTime = (Date.now() - activeRadioTrack.startedAt) / 1000;
                } else {
                    currentTime = activeRadioTrack.currentTime || 0;
                }
            }
            socket.emit('radio_sync_state', { ...activeRadioTrack, currentTime });
        } else {
            socket.emit('radio_sync_state', null);
        }
    });

    socket.on('radio_play', (data) => {
        const hasTime = !!(data && data.currentTime && data.currentTime > 0);
        activeRadioTrack = {
            track: data.track,
            currentTime: data.currentTime || 0,
            isPlaying: true,
            startedAt: hasTime ? (Date.now() - (data.currentTime * 1000)) : (Date.now() + 600),
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

    // A classroom device's <audio> reached the end of the current Quran surah —
    // advance everyone to the next one (debounced server-side against duplicate events).
    socket.on('quran_track_ended', () => {
        advanceQuranSurah();
    });

    // NetSupport client screen frame stream
    socket.on('netsupport_client_frame', async (data) => {
        if (data && data.frame) {
            const userInfo = onlineUsers.get(socket.id);
            const clientIp = userInfo?.ip || cleanIP(socket.handshake.address);
            const clientMac = userInfo?.mac || await resolveMacAddress(clientIp);
            const devKey = `dev_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;

            const existing = netSupportScreens.get(devKey) || netSupportScreens.get(clientIp) || {};
            const resolved = await resolveStudentInfo(clientIp, clientMac, data.userId || userInfo?.userId || existing.userId);
            const effectiveNickname = (data.nickname && data.nickname !== 'طالب') ? data.nickname : (resolved?.nickname || userInfo?.nickname || existing.nickname || `طالب_${clientIp.split('.').pop()}`);
            const effectiveAvatar = data.avatar || resolved?.avatar || userInfo?.avatar || existing.avatar || 'monitor';
            const effectiveUserId = data.userId || resolved?.id || userInfo?.userId || existing.userId || null;
            const effectiveRole = resolved?.role || userInfo?.role || existing.role || 'student';

            const screenData = {
                id: devKey,
                socketId: socket.id,
                userId: effectiveUserId,
                nickname: effectiveNickname,
                avatar: effectiveAvatar,
                role: effectiveRole,
                ip: clientIp,
                mac: clientMac || existing.mac || '',
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
                        nickname: effectiveNickname,
                        avatar: effectiveAvatar,
                        ip: clientIp,
                        mac: clientMac || '',
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
    await sessions.initialize();
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
