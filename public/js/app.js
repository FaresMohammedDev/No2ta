// ==========================================
// 🚀 No2ta ("نؤطة") - Core Application Controller
// ==========================================

const STATE = {
    user: null,
    socket: null,
    users: [],
    onlineUserIds: new Set(),
    activeChat: { type: 'general', recipient: null },
    messages: [],
    stories: [],
    streaks: [],
    airdropFiles: [],
    networkInfo: {},
    disappearingSeconds: 0,
    isChatLocked: false,
    isStealthActive: false,
    localStealthSuppressed: false,
    voiceRecorder: {
        mediaRecorder: null,
        audioChunks: [],
        interval: null,
        seconds: 0
    },
    whiteboard: {
        canvas: null,
        ctx: null,
        drawing: false,
        lastX: 0,
        lastY: 0,
        color: '#06b6d4',
        brushSize: 3,
        mode: 'brush' // 'brush' | 'eraser'
    },
    codepad: {
        text: '',
        debounceTimer: null
    },
    screenShare: {
        isSharing: false,
        isViewing: false,
        localStream: null,
        peerConnections: new Map(), // viewerSocketId -> RTCPeerConnection
        viewerPeerConnection: null,
        activeShareInfo: null,
        rtcConfig: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        }
    },
    pendingEditAvatarUrl: null,
    pendingAuthAvatarUrl: null
};

const MASTER_PASSWORD = 'SdSdSdSd';

function renderAvatarHTML(avatar, extraClasses = 'w-full h-full') {
    if (!avatar) return '<span>👤</span>';
    if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/') || avatar.startsWith('data:image')) {
        return `<img src="${avatar}" class="${extraClasses} object-cover rounded-full" alt="Avatar" />`;
    }
    return `<span>${avatar}</span>`;
}

// DOM Ready Init
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch Network Info & Check Login
    await fetchNetworkInfo();
    checkExistingAuth();

    // 2. Setup Global Hotkeys for Panic Button
    setupStealthHotkeys();

    // 3. Setup UI Listeners
    setupEventListeners();
});

// ----------------------------------------------------
// 1. Network & Auth
// ----------------------------------------------------
async function fetchNetworkInfo() {
    try {
        const res = await fetch('/api/network-info');
        const data = await res.json();
        STATE.networkInfo = data;

        // Render IP & QR in joining modal
        const hostUrlEl = document.getElementById('networkHostUrl');
        const clientIpEl = document.getElementById('clientDetectedIp');
        const clientMacEl = document.getElementById('clientDetectedMac');
        const qrImg = document.getElementById('networkQrImg');
        const weekendBadge = document.getElementById('weekendFreezeBadge');

        if (hostUrlEl) hostUrlEl.textContent = data.joinUrl || `http://${data.primaryLanIp}:${data.port}`;
        if (clientIpEl) clientIpEl.textContent = data.clientIp;
        if (clientMacEl) clientMacEl.textContent = data.clientMac || 'جاري الفحص...';
        if (qrImg) qrImg.src = data.qrCodeDataUrl;

        if (weekendBadge) {
            if (data.isWeekend) {
                weekendBadge.classList.remove('hidden');
            } else {
                weekendBadge.classList.add('hidden');
            }
        }

        // Auto-promote ONLY this machine to Admin
        if (data.isHostAdmin || data.isAdmin) {
            if (STATE.user) {
                STATE.user.role = 'admin';
                localStorage.setItem('no2ta_user', JSON.stringify(STATE.user));
                updateProfileUI();
            }
            // Pre-fill login modal if open
            const nickInput = document.getElementById('authNickname');
            if (nickInput && !nickInput.value) nickInput.value = 'كبير الفصل (الأدمن) 👑';
            const adminRadio = document.querySelector('input[name="authAvatar"][value="👑"]');
            if (adminRadio) adminRadio.checked = true;
        } else {
            // Demote any non-admin device to student
            if (STATE.user && STATE.user.role === 'admin') {
                STATE.user.role = 'student';
                localStorage.setItem('no2ta_user', JSON.stringify(STATE.user));
                updateProfileUI();
            }
        }

        // Check if user is on standalone localhost on a secondary machine
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const warnBanner = document.getElementById('standaloneLocalhostBanner');
        if (warnBanner) {
            if (isLocalhost && !data.isHostAdmin) {
                warnBanner.classList.remove('hidden');
            } else {
                warnBanner.classList.add('hidden');
            }
        }

        const hostInput = document.getElementById('targetHostIpInput');
        if (hostInput) {
            hostInput.value = localStorage.getItem('no2ta_custom_host_ip') || (data.primaryLanIp !== '127.0.0.1' ? data.primaryLanIp : '');
        }
    } catch (e) {
        console.error('Failed to fetch network info:', e);
    }
}

function checkExistingAuth() {
    const saved = localStorage.getItem('no2ta_user');
    if (saved) {
        try {
            STATE.user = JSON.parse(saved);
            finishLoginSuccess();
            return;
        } catch (e) {
            localStorage.removeItem('no2ta_user');
        }
    }
    // Show Login Modal
    showModal('authModal');
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const passInput = document.getElementById('authPassword');
    const nickInput = document.getElementById('authNickname');
    const avatarInput = document.querySelector('input[name="authAvatar"]:checked');
    const errorEl = document.getElementById('authError');

    errorEl.classList.add('hidden');
    const password = passInput.value.trim();
    const nickname = nickInput.value.trim();
    const avatar = STATE.pendingAuthAvatarUrl || (avatarInput ? avatarInput.value : '🚀');

    if (password !== MASTER_PASSWORD) {
        errorEl.textContent = 'كلمة السر غير صحيحة! الباسوورد هو SdSdSdSd';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password,
                nickname: nickname || undefined,
                avatar,
                deviceId: localStorage.getItem('no2ta_device_id') || undefined
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            errorEl.textContent = data.error || 'فشل تسجيل الدخول!';
            errorEl.classList.remove('hidden');
            return;
        }

        STATE.user = data.user;
        localStorage.setItem('no2ta_user', JSON.stringify(data.user));
        localStorage.setItem('no2ta_device_id', data.user.device_id || `dev_${Date.now()}`);

        hideModal('authModal');
        finishLoginSuccess();
    } catch (err) {
        errorEl.textContent = 'تعذر الاتصال بالسيرفر المركزي!';
        errorEl.classList.remove('hidden');
    }
}

function finishLoginSuccess() {
    updateProfileUI();
    initSocket();
    loadUsers();
    loadStories();
    loadMessages();
    loadAirDropFiles();
    initWhiteboard();
}

function updateProfileUI() {
    if (!STATE.user) return;
    const nameEl = document.getElementById('myNickname');
    const avatarEl = document.getElementById('myAvatar');
    const roleEl = document.getElementById('myRoleBadge');
    const adminBtn = document.getElementById('adminDashboardBtn');

    if (nameEl) nameEl.textContent = STATE.user.nickname;
    if (avatarEl) avatarEl.innerHTML = renderAvatarHTML(STATE.user.avatar);
    if (roleEl) {
        roleEl.textContent = STATE.user.role === 'admin' ? '👑 أدمن الفصل' : 'طالب عبقري ⚡';
        roleEl.className = STATE.user.role === 'admin' 
            ? 'px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    }

    if (adminBtn) {
        if (STATE.user.role === 'admin') {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }
    }

    const globalUnlockBtn = document.getElementById('stealthGlobalUnlockBtn');
    if (globalUnlockBtn) {
        if (STATE.networkInfo && STATE.networkInfo.isHostAdmin) {
            globalUnlockBtn.classList.remove('hidden');
        } else {
            globalUnlockBtn.classList.add('hidden');
        }
    }
}

// ----------------------------------------------------
// 2. Socket.IO Real-time Hub
// ----------------------------------------------------
function initSocket() {
    if (STATE.socket) return;
    STATE.socket = io({ reconnection: true });

    STATE.socket.on('connect', () => {
        console.log('⚡ Connected to No2ta Socket Engine');
        STATE.socket.emit('register_presence', STATE.user);
    });

    STATE.socket.on('presence_update', (data) => {
        STATE.onlineUserIds = new Set(data.onlineUserIds);
        renderUsersList();
        updateOnlineCount();
    });

    STATE.socket.on('codepad_sync', (data) => {
        if (!data) return;
        STATE.codepad.text = data.text !== undefined ? data.text : '';
        const textarea = document.getElementById('sharedCodePadTextarea');
        if (textarea && document.activeElement !== textarea) {
            textarea.value = STATE.codepad.text;
            updateCodePadStats();
        }
    });

    STATE.socket.on('new_message', (data) => {
        const { message, streakInfo } = data;
        const isCurrentChat = (message.chat_type === 'general' && STATE.activeChat.type === 'general') ||
            (message.chat_type === 'direct' && STATE.activeChat.type === 'direct' &&
             (message.sender_id === STATE.activeChat.recipient?.id || message.recipient_id === STATE.activeChat.recipient?.id));

        if (isCurrentChat) {
            STATE.messages.push(message);
            appendMessageBubble(message);
            scrollToBottom();
        }

        if (message.sender_id === STATE.user.id) {
            window.soundEngine.playSend();
        } else {
            window.soundEngine.playReceive();
        }

        if (streakInfo && (message.sender_id === STATE.user.id || message.recipient_id === STATE.user.id)) {
            loadUsers(); // Refresh streak badges
        }
    });

    STATE.socket.on('user_typing_start', (data) => {
        if (data.userId !== STATE.user.id) {
            showTypingIndicator(data.nickname);
        }
    });

    STATE.socket.on('user_typing_stop', (data) => {
        if (data.userId !== STATE.user.id) {
            hideTypingIndicator();
        }
    });

    STATE.socket.on('message_reactions_updated', ({ messageId, reactions }) => {
        const msg = STATE.messages.find(m => m.id === messageId);
        if (msg) msg.reactions = reactions;
        renderMessageReactions(messageId, reactions);
        window.soundEngine.playReaction();
    });

    STATE.socket.on('disappearing_messages_expired', ({ messageIds }) => {
        messageIds.forEach(id => {
            const el = document.getElementById(`msg-${id}`);
            if (el) {
                el.classList.add('transition-all', 'duration-700', 'opacity-0', 'scale-90', 'blur-sm');
                setTimeout(() => el.remove(), 700);
            }
            STATE.messages = STATE.messages.filter(m => m.id !== id);
        });
    });

    STATE.socket.on('message_deleted', ({ messageId }) => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.classList.add('transition-all', 'duration-500', 'opacity-0', 'scale-90', 'blur-sm');
            setTimeout(() => el.remove(), 500);
        }
        STATE.messages = STATE.messages.filter(m => m.id !== messageId);
    });

    STATE.socket.on('new_story_published', () => {
        loadStories();
    });

    STATE.socket.on('story_deleted', () => {
        loadStories();
    });

    STATE.socket.on('airdrop_new_file', (file) => {
        STATE.airdropFiles.unshift(file);
        renderAirDropList();
        showNotification(`⚡ ملف جديد على AirDrop: ${file.file_name}`);
    });

    STATE.socket.on('airdrop_download_incremented', ({ id, count }) => {
        const badge = document.getElementById(`airdrop-dl-${id}`);
        if (badge) badge.textContent = `📥 ${count}`;
    });

    STATE.socket.on('chat_focus_mode_changed', ({ isLocked }) => {
        STATE.isChatLocked = isLocked;
        const banner = document.getElementById('chatFocusBanner');
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMsgBtn');

        if (banner) banner.classList.toggle('hidden', !isLocked);
        if (input && STATE.user.role !== 'admin') input.disabled = isLocked;
        if (sendBtn && STATE.user.role !== 'admin') sendBtn.disabled = isLocked;
    });

    STATE.socket.on('admin_global_announcement', (data) => {
        window.soundEngine.playAnnouncement();
        showAnnouncementModal(data);
    });

    // 🖥️ SCREEN SHARE & WEBRTC SOCKET EVENTS 🖥️
    STATE.socket.on('screen_share_started', (shareInfo) => {
        handleScreenShareStarted(shareInfo);
    });

    STATE.socket.on('screen_share_ended', () => {
        handleScreenShareEnded();
    });

    STATE.socket.on('webrtc_viewer_joined', (data) => {
        handleViewerJoined(data);
    });

    STATE.socket.on('webrtc_offer', (data) => {
        handleIncomingOffer(data);
    });

    STATE.socket.on('webrtc_answer', (data) => {
        handleIncomingAnswer(data);
    });

    STATE.socket.on('webrtc_ice_candidate', (data) => {
        handleIncomingIceCandidate(data);
    });

    // 🚨 GLOBAL PANIC & STEALTH BROADCAST 🚨
    STATE.socket.on('GLOBAL_STEALTH_ENGAGED', (data) => {
        // If data.timestamp > 0 and fresh (within 15 seconds), this is a fresh global panic!
        if (data && data.timestamp && (Date.now() - data.timestamp < 15000)) {
            STATE.localStealthSuppressed = false; // Fresh panic overrides local suppression!
        }
        if (!STATE.localStealthSuppressed) {
            console.warn('🚨 GLOBAL PANIC ACTIVATED! Engaging Stealth Mode instantly...');
            engageStealthMode(data);
        }
    });

    STATE.socket.on('GLOBAL_STEALTH_RELEASED', (data) => {
        console.log('✅ Stealth mode released by teacher/admin');
        STATE.localStealthSuppressed = false;
        releaseStealthMode(data);
    });

    STATE.socket.on('user_kicked', (data) => {
        alert(data.reason || 'تم طردك بواسطة أدمن الفصل!');
        localStorage.removeItem('no2ta_user');
        window.location.reload();
    });
}

// ----------------------------------------------------
// 3. Stealth Mode ("زر البشمهندسة" 🚨)
// ----------------------------------------------------
let lastEscPress = 0;

function setupStealthHotkeys() {
    window.addEventListener('keydown', (e) => {
        // Hotkey: F2 triggers instant stealth on EVERYONE!
        if (e.key === 'F2') {
            e.preventDefault();
            triggerPanicButton();
            return;
        }

        // Hotkey: F3 closes stealth on THIS device only (Requires Password)
        if (e.key === 'F3') {
            e.preventDefault();
            promptLocalStealthUnlock();
            return;
        }

        // Hotkey: Double tap Escape within 400ms triggers instant stealth
        if (e.key === 'Escape') {
            const now = Date.now();
            if (now - lastEscPress < 400) {
                e.preventDefault();
                triggerPanicButton();
                lastEscPress = 0;
                return;
            }
            lastEscPress = now;
        }

        // Secret Exit Hotkey: Ctrl + Shift + S prompts to unlock on this device
        if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault();
            promptLocalStealthUnlock();
        }
    });

    const panicBtn = document.getElementById('panicTriggerBtn');
    if (panicBtn) {
        panicBtn.addEventListener('click', triggerPanicButton);
    }
}

function triggerPanicButton() {
    STATE.localStealthSuppressed = false;
    if (STATE.socket) {
        STATE.socket.emit('TRIGGER_GLOBAL_PANIC');
    }
    // Also trigger immediately locally with 0ms delay!
    engageStealthMode({ triggeredBy: STATE.user ? STATE.user.nickname : 'أنت' });
}

function engageStealthMode(info) {
    STATE.isStealthActive = true;
    window.soundEngine.killAllAudio();

    // Mute and pause any active screen share immediately!
    const screenVideo = document.getElementById('screenShareVideo');
    if (screenVideo) {
        screenVideo.pause();
        screenVideo.muted = true;
    }

    // 1. Change Document Title & Favicon to Physics Exam
    document.title = 'نموذج إجابة ومراجعة الفيزياء - الوحدة الأولى (التأثير المغناطيسي)';
    const favicon = document.getElementById('appFavicon');
    if (favicon) {
        favicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📚</text></svg>';
    }

    // 2. Show Fullscreen Physics Revision Overlay
    const overlay = document.getElementById('stealthPhysicsOverlay');
    const iframe = document.getElementById('stealthIframe');
    if (overlay && iframe) {
        if (!iframe.src || iframe.src === 'about:blank' || !iframe.src.includes('physics.html')) {
            iframe.src = '/stealth/physics.html';
        }
        overlay.classList.remove('hidden');
    }
}

function releaseStealthMode(info) {
    STATE.isStealthActive = false;
    window.soundEngine.resumeAudio();

    // Resume screen share video if active
    const screenVideo = document.getElementById('screenShareVideo');
    if (screenVideo && screenVideo.srcObject) {
        screenVideo.play().catch(() => {});
        if (!STATE.screenShare.isSharing) {
            screenVideo.muted = false;
        }
    }

    // Restore Title & Favicon
    document.title = 'نؤطة (No2ta) 💬⚡ - شبكة الفصل الاجتماعية';
    const favicon = document.getElementById('appFavicon');
    if (favicon) {
        favicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>';
    }

    // Hide Physics Overlay
    const overlay = document.getElementById('stealthPhysicsOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }

    if (info && info.message) {
        showNotification(info.message);
    }
}

// Local unlock for THIS device only (Never affects other classmates)
function promptLocalStealthUnlock() {
    const pass = prompt('🔐 أدخل كلمة السر لإغلاق شاشة التمويه على جهازك فقط والعودة للشات:');
    if (pass === null) return; // User cancelled
    if (pass && pass.trim() === MASTER_PASSWORD) {
        STATE.localStealthSuppressed = true;
        releaseStealthMode({ message: 'تم إغلاق شاشة التمويه على جهازك فقط 🤫' });
    } else {
        alert('❌ كلمة المرور غير صحيحة! لن يتم إغلاق شاشة التمويه.');
    }
}

// Global unlock for EVERYONE in the classroom (Strictly Hardware Admin / Master Password)
function promptGlobalStealthUnlock() {
    if (!STATE.networkInfo || !STATE.networkInfo.isHostAdmin) {
        alert('⚠️ فك التمويه لجميع أجهزة الفصل متاح فقط من جهاز الأدمن/المضيف الرئيسي!');
        return;
    }
    const pass = prompt('👑 أدخل كلمة السر لفك وضع التمويه عن جميع طلاب الفصل:');
    if (pass === null) return;
    if (pass && pass.trim() === MASTER_PASSWORD) {
        if (STATE.socket) {
            STATE.socket.emit('TRIGGER_STEALTH_RELEASE', pass.trim());
        }
        releaseStealthMode({ message: 'تم فك وضع التمويه لجميع أجهزة الفصل! 🚀' });
    } else {
        alert('❌ كلمة المرور غير صحيحة!');
    }
}

function promptStealthUnlock() {
    promptLocalStealthUnlock();
}

// ----------------------------------------------------
// 4. Users, Chats & Streaks
// ----------------------------------------------------
async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        STATE.users = users.filter(u => u.id !== STATE.user?.id);

        if (STATE.user) {
            const streakRes = await fetch(`/api/streaks/${STATE.user.id}`);
            const streakData = await streakRes.json();
            STATE.streaks = streakData.streaks || [];
        }

        renderUsersList();
    } catch (e) {
        console.error('Failed to load users:', e);
    }
}

function renderUsersList() {
    const container = document.getElementById('usersListContainer');
    if (!container) return;

    if (STATE.users.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">لا يوجد زملاء متصلين حالياً. شارك الـ QR Code ليدخلوا! 🚀</div>`;
        return;
    }

    container.innerHTML = STATE.users.map(u => {
        const isOnline = STATE.onlineUserIds.has(u.id);
        const streak = STATE.streaks.find(s => s.other_user_id === u.id);
        const streakCount = streak ? streak.streak_count : 0;
        const isFrozen = streak ? streak.is_frozen : STATE.networkInfo.isWeekend;
        const streakBadge = streakCount > 0 
            ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${isFrozen ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'}" title="${isFrozen ? 'الاستريك مجمد لعطلة نهاية الأسبوع ❄️' : 'استريك نشط اليوم 🔥'}">
                ${isFrozen ? '❄️🔥' : '🔥'} ${streakCount}
               </span>`
            : '';

        const isSelected = STATE.activeChat.type === 'direct' && STATE.activeChat.recipient?.id === u.id;

        return `
            <div onclick="selectDirectChat('${u.id}')" class="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-cyan-500/15 border border-cyan-500/30' : 'hover:bg-slate-800/60 border border-transparent'}">
                <div class="flex items-center gap-3">
                    <div class="relative shrink-0">
                        <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl overflow-hidden">
                            ${renderAvatarHTML(u.avatar)}
                        </div>
                        <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-500 live-glow' : 'bg-slate-600'}"></span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-white">${escapeHtml(u.nickname)}</span>
                            ${u.role === 'admin' ? '<span class="text-[10px] text-amber-400 font-black">👑</span>' : ''}
                        </div>
                        <p class="text-[11px] text-slate-400 truncate max-w-[140px]">${escapeHtml(u.bio || 'طالب عبقري')}</p>
                    </div>
                </div>
                <div>${streakBadge}</div>
            </div>
        `;
    }).join('');
}

function updateOnlineCount() {
    const el = document.getElementById('onlineCountBadge');
    if (el) {
        el.textContent = `${STATE.onlineUserIds.size} متصل الآن`;
    }
}

function selectGeneralChat() {
    STATE.activeChat = { type: 'general', recipient: null };
    document.getElementById('currentChatTitle').textContent = '💬 شات الفصل العام (General)';
    document.getElementById('currentChatSubtitle').textContent = 'متاح لجميع الزملاء في الفصل';
    document.getElementById('currentChatAvatar').innerHTML = '🌐';
    document.getElementById('directStreakBadge').classList.add('hidden');

    document.getElementById('tabGeneralBtn').className = 'flex-1 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 text-slate-950 transition-all';
    document.getElementById('tabDirectBtn').className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition-all';

    renderUsersList();
    loadMessages();
}

function selectDirectChat(userId) {
    const target = STATE.users.find(u => u.id === userId);
    if (!target) return;

    STATE.activeChat = { type: 'direct', recipient: target };
    document.getElementById('currentChatTitle').textContent = target.nickname;
    document.getElementById('currentChatSubtitle').textContent = STATE.onlineUserIds.has(target.id) ? 'متصل الآن 🟢' : 'غير متصل حالياً';
    document.getElementById('currentChatAvatar').innerHTML = renderAvatarHTML(target.avatar);

    const streak = STATE.streaks.find(s => s.other_user_id === target.id);
    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) {
        if (streak && streak.streak_count > 0) {
            directBadge.innerHTML = `${streak.is_frozen ? '❄️🔥' : '🔥'} استريك ${streak.streak_count} يوم`;
            directBadge.classList.remove('hidden');
        } else {
            directBadge.classList.add('hidden');
        }
    }

    document.getElementById('tabGeneralBtn').className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition-all';
    document.getElementById('tabDirectBtn').className = 'flex-1 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 text-slate-950 transition-all';

    renderUsersList();
    loadMessages();
}

// ----------------------------------------------------
// 5. Messages Feed & Actions
// ----------------------------------------------------
async function loadMessages() {
    try {
        const params = new URLSearchParams({
            chat_type: STATE.activeChat.type,
            user_id: STATE.user ? STATE.user.id : ''
        });
        if (STATE.activeChat.type === 'direct' && STATE.activeChat.recipient) {
            params.append('recipient_id', STATE.activeChat.recipient.id);
        }

        const res = await fetch(`/api/messages?${params.toString()}`);
        const data = await res.json();
        STATE.messages = data;
        renderMessagesFeed();
        scrollToBottom();
    } catch (e) {
        console.error('Failed to load messages:', e);
    }
}

function renderMessagesFeed() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    if (STATE.messages.length === 0) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-12">
                <span class="text-4xl mb-2">💬</span>
                <span>لا توجد رسائل سابقة هنا. ابدأ الشات أو ارمي ميم جامد!</span>
            </div>
        `;
        return;
    }

    container.innerHTML = STATE.messages.map(m => formatMessageHTML(m)).join('');

    // Schedule client-side disappearing timers for 2s / fast burn messages
    STATE.messages.forEach(m => {
        if (m.is_disappearing && m.expires_at) {
            const ms = new Date(m.expires_at).getTime() - Date.now();
            if (ms > 0) {
                setTimeout(() => {
                    const el = document.getElementById(`msg-${m.id}`);
                    if (el) {
                        el.classList.add('transition-all', 'duration-500', 'opacity-0', 'scale-90', 'blur-sm');
                        setTimeout(() => el.remove(), 500);
                    }
                }, ms);
            }
        }
    });
}

function formatMessageHTML(m) {
    const isMe = STATE.user && m.sender_id === STATE.user.id;
    const canDelete = isMe || (STATE.user && STATE.user.role === 'admin') || (STATE.networkInfo && STATE.networkInfo.isHostAdmin);
    const time = new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    let mediaHTML = '';
    if (m.media_url) {
        if (m.media_type === 'image') {
            mediaHTML = `<div class="mt-2 rounded-xl overflow-hidden max-w-xs cursor-pointer border border-white/10" onclick="window.open('${m.media_url}', '_blank')"><img src="${m.media_url}" class="w-full object-cover max-h-60" /></div>`;
        } else if (m.media_type === 'video') {
            mediaHTML = `<div class="mt-2 rounded-xl overflow-hidden max-w-xs border border-white/10"><video src="${m.media_url}" controls class="w-full max-h-60 rounded-xl"></video></div>`;
        } else if (m.media_type === 'audio') {
            mediaHTML = `
                <div class="mt-2 flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-white/10 min-w-[200px]">
                    <button onclick="toggleAudioPlay('${m.id}', '${m.media_url}')" id="audio-btn-${m.id}" class="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs">▶</button>
                    <div class="flex-1">
                        <div class="flex items-center gap-1 h-4">
                            <span class="voice-bar h-2"></span>
                            <span class="voice-bar h-4"></span>
                            <span class="voice-bar h-3"></span>
                            <span class="voice-bar h-5"></span>
                            <span class="voice-bar h-2"></span>
                            <span class="voice-bar h-4"></span>
                        </div>
                        <span class="text-[10px] text-slate-400">ملاحظة صوتية 🎙️</span>
                    </div>
                </div>
            `;
        } else {
            mediaHTML = `
                <a href="${m.media_url}" download="${m.media_name || 'file'}" class="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-white/10 hover:border-cyan-500/40 transition-all text-xs">
                    <span class="text-xl">📁</span>
                    <div class="flex-1 truncate">
                        <p class="font-bold text-white truncate">${escapeHtml(m.media_name || 'ملف مرفق')}</p>
                        <p class="text-[10px] text-slate-400">${(m.media_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <span class="text-cyan-400 font-bold">📥</span>
                </a>
            `;
        }
    }

    const disappearingBadge = m.is_disappearing ? `
        <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 burn-pulse">
            🔥 تدمير ذاتي
        </span>
    ` : '';

    const reactionsHTML = renderReactionsPills(m.id, m.reactions || []);

    let codeSnippetHTML = '';
    if (m.media_type === 'code') {
        const langOrTitle = escapeHtml(m.media_name || 'Code Snippet');
        codeSnippetHTML = `
            <div class="mt-1.5 rounded-xl overflow-hidden border border-cyan-500/30 bg-[#070b16] max-w-full shadow-lg">
                <div class="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-white/10 text-xs gap-3">
                    <div class="flex items-center gap-1.5 font-mono text-cyan-400 font-bold truncate">
                        <span>&lt;/&gt;</span>
                        <span class="truncate">${langOrTitle}</span>
                    </div>
                    <button onclick="copySnippetCode('${m.id}', this)" class="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-[11px] transition-all" title="نسخ الكود للحافظة">
                        <span>📋</span>
                        <span>نسخ الكود</span>
                    </button>
                </div>
                <pre id="code-content-${m.id}" class="p-3 text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre leading-relaxed select-all text-left" dir="ltr"><code>${escapeHtml(m.content || '')}</code></pre>
            </div>
        `;
    }

    return `
        <div id="msg-${m.id}" class="flex gap-2.5 my-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} group">
            <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                ${renderAvatarHTML(m.sender_avatar)}
            </div>
            <div class="max-w-[78%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                <div class="flex items-center gap-2 mb-1 px-1">
                    <span class="text-[11px] font-bold text-slate-300">${isMe ? 'أنت' : escapeHtml(m.sender_name)}</span>
                    ${m.sender_role === 'admin' ? '<span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-black">👑 الأدمن</span>' : ''}
                    ${disappearingBadge}
                    <span class="text-[10px] text-slate-500 en-text">${time}</span>
                </div>
                
                <div class="relative px-3.5 py-2.5 text-sm ${isMe ? 'chat-bubble-outgoing' : 'chat-bubble-incoming'}">
                    ${m.media_type === 'code' ? codeSnippetHTML : (m.content ? `<p class="whitespace-pre-wrap leading-relaxed">${escapeHtml(m.content)}</p>` : '')}
                    ${mediaHTML}
                </div>

                <!-- Reactions List -->
                <div id="reactions-${m.id}" class="flex flex-wrap gap-1 mt-1 px-1">
                    ${reactionsHTML}
                </div>

                <!-- Quick Reaction Trigger Buttons (on hover) -->
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-full px-2 py-0.5 mt-1 shadow-lg text-xs">
                    <button onclick="toggleReaction('${m.id}', '❤️')" class="hover:scale-125 transition-transform">❤️</button>
                    <button onclick="toggleReaction('${m.id}', '😂')" class="hover:scale-125 transition-transform">😂</button>
                    <button onclick="toggleReaction('${m.id}', '🔥')" class="hover:scale-125 transition-transform">🔥</button>
                    <button onclick="toggleReaction('${m.id}', '😮')" class="hover:scale-125 transition-transform">😮</button>
                    <button onclick="toggleReaction('${m.id}', '👏')" class="hover:scale-125 transition-transform">👏</button>
                    ${canDelete ? `<button onclick="deleteChatMessage('${m.id}')" class="text-red-400 font-bold ml-1 hover:text-red-300 hover:scale-125 transition-all" title="${isMe ? 'حذف رسالتي للجميع' : 'حذف الرسالة (صلاحية أدمن)'}">🗑️</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderReactionsPills(messageId, reactions) {
    if (!reactions || reactions.length === 0) return '';
    const counts = {};
    reactions.forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });

    return Object.entries(counts).map(([emoji, count]) => `
        <button onclick="toggleReaction('${messageId}', '${emoji}')" class="inline-flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-full px-2 py-0.5 text-[11px] text-slate-200 transition-all">
            <span>${emoji}</span>
            <span class="text-[10px] font-bold text-slate-400">${count}</span>
        </button>
    `).join('');
}

function appendMessageBubble(message) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = formatMessageHTML(message);
    container.appendChild(div.firstElementChild);

    // Auto-schedule self-destruction for fast burn disappearing messages (e.g. 2s)
    if (message.is_disappearing && message.expires_at) {
        const ms = new Date(message.expires_at).getTime() - Date.now();
        if (ms > 0) {
            setTimeout(() => {
                const el = document.getElementById(`msg-${message.id}`);
                if (el) {
                    el.classList.add('transition-all', 'duration-500', 'opacity-0', 'scale-90', 'blur-sm');
                    setTimeout(() => el.remove(), 500);
                }
            }, ms);
        }
    }
}

async function deleteChatMessage(messageId) {
    if (!confirm('هل تريد حذف هذه الرسالة نهائياً للجميع؟')) return;
    if (STATE.socket) {
        STATE.socket.emit('delete_message', {
            messageId,
            userId: STATE.user ? STATE.user.id : null
        });
    }
    try {
        await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user ? STATE.user.id : null })
        });
    } catch (e) {}
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

async function handleSendMessage(e) {
    if (e) e.preventDefault();
    if (STATE.isChatLocked && STATE.user.role !== 'admin') {
        alert('الشات مقفول مؤقتاً بوضع التركيز!');
        return;
    }

    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';
    sendChatMessagePayload({ content });
}

function sendChatMessagePayload({ content = '', mediaUrl = null, mediaType = 'text', mediaName = null, mediaSize = 0 }) {
    if (!STATE.socket || !STATE.user) return;

    STATE.socket.emit('send_message', {
        senderId: STATE.user.id,
        recipientId: STATE.activeChat.type === 'direct' ? STATE.activeChat.recipient?.id : null,
        chatType: STATE.activeChat.type,
        role: STATE.user.role,
        content,
        mediaUrl,
        mediaType,
        mediaName,
        mediaSize,
        disappearingSeconds: STATE.disappearingSeconds
    });

    STATE.socket.emit('typing_stop', { userId: STATE.user.id });
}

function toggleReaction(messageId, emoji) {
    if (!STATE.socket || !STATE.user) return;
    STATE.socket.emit('toggle_reaction', {
        messageId,
        userId: STATE.user.id,
        emoji
    });
}

function renderMessageReactions(messageId, reactions) {
    const target = document.getElementById(`reactions-${messageId}`);
    if (target) {
        target.innerHTML = renderReactionsPills(messageId, reactions);
    }
}

// ----------------------------------------------------
// 6. Voice Notes Recorder (WhatsApp Style 🎙️)
// ----------------------------------------------------
async function toggleVoiceRecording() {
    const btn = document.getElementById('voiceRecordBtn');
    const banner = document.getElementById('voiceRecordBanner');
    const timerEl = document.getElementById('voiceTimerText');

    if (STATE.voiceRecorder.mediaRecorder && STATE.voiceRecorder.mediaRecorder.state === 'recording') {
        // Stop & Send
        STATE.voiceRecorder.mediaRecorder.stop();
        clearInterval(STATE.voiceRecorder.interval);
        banner.classList.add('hidden');
        btn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
        return;
    }

    // Start Recording
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        STATE.voiceRecorder.mediaRecorder = mediaRecorder;
        STATE.voiceRecorder.audioChunks = [];
        STATE.voiceRecorder.seconds = 0;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) STATE.voiceRecorder.audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(STATE.voiceRecorder.audioChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(t => t.stop());

            const formData = new FormData();
            formData.append('audio', audioBlob, `voice_${Date.now()}.webm`);

            try {
                const res = await fetch('/api/upload/audio', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    sendChatMessagePayload({
                        mediaUrl: data.url,
                        mediaType: 'audio',
                        mediaName: data.name,
                        mediaSize: data.size
                    });
                }
            } catch (err) {
                alert('فشل رفع التسجيل الصوتي!');
            }
        };

        mediaRecorder.start();
        banner.classList.remove('hidden');
        btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');

        STATE.voiceRecorder.interval = setInterval(() => {
            STATE.voiceRecorder.seconds++;
            const mins = String(Math.floor(STATE.voiceRecorder.seconds / 60)).padStart(2, '0');
            const secs = String(STATE.voiceRecorder.seconds % 60).padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
        }, 1000);

    } catch (e) {
        alert('يرجى السماح بالوصول للمايكروفون لتسجيل الصوت!');
    }
}

function cancelVoiceRecording() {
    if (STATE.voiceRecorder.mediaRecorder) {
        STATE.voiceRecorder.mediaRecorder.onstop = null;
        STATE.voiceRecorder.mediaRecorder.stop();
        clearInterval(STATE.voiceRecorder.interval);
        document.getElementById('voiceRecordBanner').classList.add('hidden');
        document.getElementById('voiceRecordBtn').classList.remove('bg-red-500', 'text-white', 'animate-pulse');
    }
}

let activeAudio = null;
function toggleAudioPlay(id, url) {
    const btn = document.getElementById(`audio-btn-${id}`);
    if (activeAudio && activeAudio.id === id) {
        if (activeAudio.audio.paused) {
            activeAudio.audio.play();
            btn.textContent = '⏸';
        } else {
            activeAudio.audio.pause();
            btn.textContent = '▶';
        }
        return;
    }

    if (activeAudio) {
        activeAudio.audio.pause();
        const prevBtn = document.getElementById(`audio-btn-${activeAudio.id}`);
        if (prevBtn) prevBtn.textContent = '▶';
    }

    const audio = new Audio(url);
    activeAudio = { id, audio };
    audio.play();
    btn.textContent = '⏸';

    audio.onended = () => {
        btn.textContent = '▶';
        activeAudio = null;
    };
}

// ----------------------------------------------------
// 7. Instagram Stories Carousel & Viewer
// ----------------------------------------------------
async function loadStories() {
    try {
        const res = await fetch(`/api/stories?userId=${STATE.user ? STATE.user.id : ''}`);
        const data = await res.json();
        STATE.stories = data;
        renderStoriesBar();
    } catch (e) {
        console.error('Failed to load stories:', e);
    }
}

function renderStoriesBar() {
    const container = document.getElementById('storiesList');
    if (!container) return;

    let html = `
        <!-- Add Story Button -->
        <div onclick="openStoryCreator()" class="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0">
            <div class="relative w-14 h-14 rounded-full bg-slate-800 border-2 border-dashed border-cyan-500 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                <span>➕</span>
            </div>
            <span class="text-[11px] font-semibold text-slate-300">استوري جديد</span>
        </div>
    `;

    STATE.stories.forEach(authorGroup => {
        const ringClass = authorGroup.hasUnseen ? 'story-ring-unseen' : 'story-ring-seen';
        html += `
            <div onclick="viewUserStories('${authorGroup.userId}')" class="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0">
                <div class="${ringClass} w-14 h-14 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <div class="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-2xl border-2 border-slate-950 overflow-hidden">
                        ${renderAvatarHTML(authorGroup.authorAvatar)}
                    </div>
                </div>
                <span class="text-[11px] font-semibold text-slate-300 truncate max-w-[65px]">${escapeHtml(authorGroup.authorName)}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

let activeStoryIndex = 0;
let currentViewingGroup = null;

function viewUserStories(userId) {
    const group = STATE.stories.find(g => g.userId === userId);
    if (!group || group.stories.length === 0) return;

    currentViewingGroup = group;
    activeStoryIndex = 0;
    renderCurrentStory();
    showModal('storyViewerModal');
}

function renderCurrentStory() {
    if (!currentViewingGroup) return;
    const story = currentViewingGroup.stories[activeStoryIndex];
    if (!story) return;

    // Mark viewed
    if (STATE.user) {
        fetch(`/api/stories/${story.id}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user.id })
        });
    }

    const avatarEl = document.getElementById('storyViewerAvatar');
    const nameEl = document.getElementById('storyViewerName');
    const contentEl = document.getElementById('storyViewerBody');
    const viewsCountEl = document.getElementById('storyViewersBadge');

    if (avatarEl) avatarEl.innerHTML = renderAvatarHTML(currentViewingGroup.authorAvatar);
    if (nameEl) nameEl.textContent = currentViewingGroup.authorName;
    if (viewsCountEl) viewsCountEl.textContent = `👀 ${story.views_count || 1} مشاهدة`;

    if (story.media_type === 'image') {
        contentEl.innerHTML = `
            <div class="relative w-full h-[70vh] sm:h-[75vh] max-h-[680px] rounded-3xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shadow-2xl">
                <img src="${story.media_url}" class="w-full h-full object-contain" />
                ${story.text_content ? `
                    <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-5 text-center text-white font-bold text-sm sm:text-base leading-snug drop-shadow-md">
                        ${escapeHtml(story.text_content)}
                    </div>
                ` : ''}
            </div>
        `;
    } else if (story.media_type === 'video') {
        contentEl.innerHTML = `
            <div class="relative w-full h-[70vh] sm:h-[75vh] max-h-[680px] rounded-3xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shadow-2xl">
                <video src="${story.media_url}" autoplay playsinline controls class="w-full h-full object-contain rounded-3xl"></video>
            </div>
        `;
    } else {
        contentEl.innerHTML = `
            <div class="w-full h-[70vh] sm:h-[75vh] max-h-[680px] rounded-3xl bg-gradient-to-tr ${story.bg_gradient || 'from-indigo-600 to-pink-500'} flex items-center justify-center p-8 text-center text-white text-2xl font-black shadow-2xl leading-relaxed">
                ${escapeHtml(story.text_content)}
            </div>
        `;
    }

    // Story Delete Button Permission Check (Owner or Admin/Host)
    const deleteBtn = document.getElementById('deleteStoryBtn');
    if (deleteBtn) {
        const isOwner = STATE.user && story.user_id === STATE.user.id;
        const isAdmin = (STATE.user && STATE.user.role === 'admin') || (STATE.networkInfo && STATE.networkInfo.isHostAdmin);
        if (isOwner || isAdmin) {
            deleteBtn.classList.remove('hidden');
            deleteBtn.title = isOwner ? 'حذف الاستوري الخاص بي 🗑️' : 'حذف الاستوري (صلاحية الأدمن / المضيف) 👑';
        } else {
            deleteBtn.classList.add('hidden');
        }
    }
}

async function deleteCurrentActiveStory() {
    if (!currentViewingGroup) return;
    const story = currentViewingGroup.stories[activeStoryIndex];
    if (!story) return;

    if (!confirm('هل أنت متأكد من حذف هذا الاستوري نهائياً؟')) return;

    try {
        const res = await fetch(`/api/stories/${story.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user ? STATE.user.id : null })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم حذف الاستوري بنجاح! 🗑️');
            currentViewingGroup.stories.splice(activeStoryIndex, 1);
            if (currentViewingGroup.stories.length === 0) {
                hideModal('storyViewerModal');
            } else {
                if (activeStoryIndex >= currentViewingGroup.stories.length) {
                    activeStoryIndex = currentViewingGroup.stories.length - 1;
                }
                renderCurrentStory();
            }
            loadStories();
        } else {
            alert(data.error || 'فشل حذف الاستوري');
        }
    } catch (e) {
        alert('حدث خطأ أثناء حذف الاستوري');
    }
}

function nextStory() {
    if (!currentViewingGroup) return;
    if (activeStoryIndex < currentViewingGroup.stories.length - 1) {
        activeStoryIndex++;
        renderCurrentStory();
    } else {
        hideModal('storyViewerModal');
    }
}

function prevStory() {
    if (!currentViewingGroup) return;
    if (activeStoryIndex > 0) {
        activeStoryIndex--;
        renderCurrentStory();
    }
}

// 7b. Story Viewers Modal (👀 مين شاف الاستوري)
async function openStoryViewsModal() {
    if (!currentViewingGroup) return;
    const story = currentViewingGroup.stories[activeStoryIndex];
    if (!story) return;

    const listEl = document.getElementById('storyViewersList');
    const countEl = document.getElementById('storyViewsModalCount');
    if (!listEl) return;

    listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">جاري تحميل المشاهدات... ⏳</div>`;
    showModal('storyViewsModal');

    try {
        const res = await fetch(`/api/stories/${story.id}/views`);
        const data = await res.json();
        const viewers = data.viewers || [];

        if (countEl) countEl.textContent = viewers.length;

        if (viewers.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <span class="text-3xl block mb-2">👻</span>
                    <p class="text-xs font-bold text-slate-400">لم يشاهد أحد هذا الاستوري بعد</p>
                </div>
            `;
            return;
        }

        let html = '';
        viewers.forEach(v => {
            const timeAgo = formatTimeAgo(v.viewed_at);
            html += `
                <div class="flex items-center justify-between p-2 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            ${renderAvatarHTML(v.avatar)}
                        </div>
                        <div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs font-bold text-white">${escapeHtml(v.nickname)}</span>
                                ${v.role === 'admin' ? '<span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-black">👑 أدمن</span>' : ''}
                            </div>
                            <span class="text-[10px] text-slate-400 block">${timeAgo}</span>
                        </div>
                    </div>
                    <span class="text-cyan-400 text-xs font-mono">👁️</span>
                </div>
            `;
        });
        listEl.innerHTML = html;
    } catch (err) {
        listEl.innerHTML = `<div class="text-center py-6 text-red-400 text-xs">فشل تحميل المشاهدات!</div>`;
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'الآن';
    const diffSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diffSeconds < 60) return 'الآن';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return new Date(dateString).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function openStoryCreator() {
    showModal('storyCreatorModal');
}

async function handleCreateStorySubmit(e) {
    e.preventDefault();
    const text = document.getElementById('storyTextInput').value.trim();
    const file = document.getElementById('storyFileInput').files[0];
    const gradient = document.querySelector('input[name="storyGradient"]:checked')?.value || 'from-purple-600 to-pink-500';

    if (!text && !file) {
        alert('اكتب نص الاستوري أو ارفع صورة/فيديو!');
        return;
    }

    const formData = new FormData();
    formData.append('userId', STATE.user.id);
    formData.append('text_content', text);
    formData.append('bg_gradient', gradient);
    if (file) formData.append('file', file);

    try {
        const res = await fetch('/api/stories', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            hideModal('storyCreatorModal');
            document.getElementById('storyTextInput').value = '';
            removeStorySelectedFile();
            loadStories();
            showNotification('تم نشر الاستوري بنجاح! 🔥');
        }
    } catch (e) {
        alert('فشل نشر الاستوري!');
    }
}

function removeStorySelectedFile() {
    const input = document.getElementById('storyFileInput');
    if (input) input.value = '';
    const img = document.getElementById('storyImagePreview');
    if (img) img.src = '';
    const emptyState = document.getElementById('storyFileEmptyState');
    const previewState = document.getElementById('storyFilePreviewState');
    if (emptyState) emptyState.classList.remove('hidden');
    if (previewState) previewState.classList.add('hidden');
}

// ----------------------------------------------------
// 8. Classroom AirDrop
// ----------------------------------------------------
async function loadAirDropFiles() {
    try {
        const res = await fetch('/api/airdrop/files');
        const files = await res.json();
        STATE.airdropFiles = files;
        renderAirDropList();
    } catch (e) {
        console.error('Failed to load airdrop:', e);
    }
}

function renderAirDropList() {
    const container = document.getElementById('airdropFilesList');
    if (!container) return;

    if (STATE.airdropFiles.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">لا توجد ملفات مرفوعة على AirDrop بعد. اسحب ملفك وشاركه الآن! ⚡</div>`;
        return;
    }

    container.innerHTML = STATE.airdropFiles.map(f => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 transition-all">
            <div class="flex items-center gap-3">
                <span class="text-2xl">📦</span>
                <div>
                    <h4 class="text-sm font-bold text-white truncate max-w-xs">${escapeHtml(f.file_name)}</h4>
                    <p class="text-[11px] text-slate-400">بواسطة: ${escapeHtml(f.sender_name)} • ${(f.file_size / (1024*1024)).toFixed(2)} MB</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span id="airdrop-dl-${f.id}" class="text-xs text-slate-400">📥 ${f.downloads_count || 0}</span>
                <a href="${f.file_url}" download="${f.file_name}" onclick="recordAirDropDownload('${f.id}')" class="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-1">
                    <span>تحميل فوري</span>
                    <span>⚡</span>
                </a>
            </div>
        </div>
    `).join('');
}

async function recordAirDropDownload(id) {
    try {
        await fetch(`/api/airdrop/download/${id}`, { method: 'POST' });
    } catch (e) {}
}

async function handleAirDropUpload(file) {
    if (!file || !STATE.user) return;
    const formData = new FormData();
    formData.append('senderId', STATE.user.id);
    formData.append('file', file);

    const progressEl = document.getElementById('airdropUploadProgress');
    if (progressEl) progressEl.classList.remove('hidden');

    try {
        const res = await fetch('/api/airdrop/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showNotification('تم رفع الملف على Classroom AirDrop بنجاح! 🚀');
        }
    } catch (e) {
        alert('فشل رفع الملف!');
    } finally {
        if (progressEl) progressEl.classList.add('hidden');
    }
}

// ----------------------------------------------------
// 9. Live Collaborative Whiteboard (سبورة الفصل الحية 🎨)
// ----------------------------------------------------
function resizeWhiteboardCanvas() {
    const canvas = STATE.whiteboard.canvas;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth || 900;
    const h = parent.clientHeight || 550;

    if (w <= 0 || h <= 0) return;

    if (canvas.width !== w || canvas.height !== h) {
        let prevImage = null;
        if (canvas.width > 0 && canvas.height > 0) {
            try {
                prevImage = STATE.whiteboard.ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch(e) {}
        }

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        STATE.whiteboard.ctx = ctx;

        ctx.fillStyle = '#070a13';
        ctx.fillRect(0, 0, w, h);

        if (prevImage) {
            try {
                ctx.putImageData(prevImage, 0, 0);
            } catch(e) {}
        }

        if (STATE.socket) {
            STATE.socket.emit('request_whiteboard_history');
        }
    }
}

function initWhiteboard() {
    const canvas = document.getElementById('whiteboardCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    STATE.whiteboard.canvas = canvas;
    STATE.whiteboard.ctx = ctx;

    canvas.width = 900;
    canvas.height = 550;
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    window.addEventListener('resize', () => {
        const modal = document.getElementById('whiteboardModal');
        if (modal && !modal.classList.contains('hidden')) {
            resizeWhiteboardCanvas();
        }
    });

    // Mouse & Touch events
    const startDraw = (e) => {
        STATE.whiteboard.drawing = true;
        const pos = getCanvasPos(e);
        STATE.whiteboard.lastX = pos.x;
        STATE.whiteboard.lastY = pos.y;
    };

    const drawMove = (e) => {
        if (!STATE.whiteboard.drawing) return;
        const pos = getCanvasPos(e);
        const drawData = {
            x0: STATE.whiteboard.lastX,
            y0: STATE.whiteboard.lastY,
            x1: pos.x,
            y1: pos.y,
            color: STATE.whiteboard.mode === 'eraser' ? '#070a13' : STATE.whiteboard.color,
            size: STATE.whiteboard.mode === 'eraser' ? STATE.whiteboard.brushSize * 5 : STATE.whiteboard.brushSize
        };

        drawStrokeOnCanvas(drawData);

        if (STATE.socket) {
            STATE.socket.emit('whiteboard_draw_step', drawData);
        }

        STATE.whiteboard.lastX = pos.x;
        STATE.whiteboard.lastY = pos.y;
    };

    const stopDraw = () => {
        STATE.whiteboard.drawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', drawMove);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); drawMove(e); }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); stopDraw(); }, { passive: false });

    // Socket drawing receiver
    if (STATE.socket) {
        STATE.socket.on('whiteboard_draw_step', (drawData) => {
            drawStrokeOnCanvas(drawData);
        });

        STATE.socket.on('whiteboard_init', (history) => {
            if (Array.isArray(history)) {
                history.forEach(stroke => drawStrokeOnCanvas(stroke));
            }
        });

        STATE.socket.on('whiteboard_cleared', () => {
            clearLocalCanvas();
        });
    }
}

function getCanvasPos(e) {
    const canvas = STATE.whiteboard.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (clientX === undefined && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (clientX === undefined && e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }

    return {
        x: ((clientX !== undefined ? clientX : 0) - rect.left) * scaleX,
        y: ((clientY !== undefined ? clientY : 0) - rect.top) * scaleY
    };
}

function drawStrokeOnCanvas({ x0, y0, x1, y1, color, size }) {
    const ctx = STATE.whiteboard.ctx;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();
}

function clearLocalCanvas() {
    const canvas = STATE.whiteboard.canvas;
    const ctx = STATE.whiteboard.ctx;
    if (canvas && ctx) {
        ctx.fillStyle = '#070a13';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function emitClearWhiteboard() {
    if (STATE.socket) {
        STATE.socket.emit('whiteboard_clear_board');
    }
    clearLocalCanvas();
}

function setWhiteboardColor(color) {
    STATE.whiteboard.color = color;
    STATE.whiteboard.mode = 'brush';
}

function setWhiteboardBrushSize(size) {
    STATE.whiteboard.brushSize = Number(size);
}

function setWhiteboardEraser() {
    STATE.whiteboard.mode = 'eraser';
}

function exportWhiteboardImage() {
    const canvas = STATE.whiteboard.canvas;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `whiteboard_no2ta_${Date.now()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
}

// ----------------------------------------------------
// 9b. Shared Live CodePad / Plain Text Bin & Code Sharing 💻
// ----------------------------------------------------
async function openCodepadModal() {
    showModal('codepadModal');
    const textarea = document.getElementById('sharedCodePadTextarea');
    if (textarea) {
        if (!textarea.value && STATE.codepad.text) {
            textarea.value = STATE.codepad.text;
        } else if (!textarea.value) {
            try {
                const res = await fetch('/api/codepad');
                const data = await res.json();
                if (data.text !== undefined) {
                    STATE.codepad.text = data.text;
                    textarea.value = data.text;
                }
            } catch (e) {}
        }
        updateCodePadStats();
        setTimeout(() => textarea.focus(), 150);
    }
    if (STATE.socket) {
        STATE.socket.emit('codepad_request_sync');
    }
}

function updateCodePadStats() {
    const textarea = document.getElementById('sharedCodePadTextarea');
    const statsEl = document.getElementById('codepadStats');
    if (!textarea || !statsEl) return;
    const val = textarea.value;
    const lines = val ? val.split('\n').length : 0;
    const chars = val.length;
    statsEl.textContent = `${lines} سطر • ${chars} حرف`;
}

function handleCodePadInput() {
    updateCodePadStats();
    const textarea = document.getElementById('sharedCodePadTextarea');
    if (!textarea) return;

    STATE.codepad.text = textarea.value;

    const ind = document.getElementById('codepadSyncIndicator');
    if (ind) {
        ind.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span><span>جاري المزامنة...</span>';
    }

    clearTimeout(STATE.codepad.debounceTimer);
    STATE.codepad.debounceTimer = setTimeout(() => {
        if (STATE.socket) {
            STATE.socket.emit('codepad_update', {
                text: STATE.codepad.text,
                senderName: STATE.user ? STATE.user.nickname : 'زميل'
            });
        }
        if (ind) {
            ind.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>متصل ومتزامن ⚡</span>';
        }
    }, 350);
}

function copyAllCodePadText() {
    const textarea = document.getElementById('sharedCodePadTextarea');
    const btn = document.getElementById('copyAllCodepadBtn');
    if (!textarea || !textarea.value.trim()) {
        showNotification('الكشكول فاضي! الصق فيه كود الأول.');
        return;
    }
    copyTextToClipboard(textarea.value, btn);
}

function clearCodePadText() {
    if (!confirm('هل أنت متأكد من مسح محتوى كشكول الأكواد المشترك بالكامل؟')) return;
    const textarea = document.getElementById('sharedCodePadTextarea');
    if (textarea) {
        textarea.value = '';
        STATE.codepad.text = '';
        updateCodePadStats();
        if (STATE.socket) {
            STATE.socket.emit('codepad_update', { text: '', senderName: STATE.user ? STATE.user.nickname : 'زميل' });
        }
        showNotification('تم تفريغ كشكول الأكواد المشترك 🗑️');
    }
}

function shareCodePadToChat() {
    const textarea = document.getElementById('sharedCodePadTextarea');
    if (!textarea || !textarea.value.trim()) {
        alert('الكشكول فاضي! اكتب كود أو نص الأول لمشاركته في الشات.');
        return;
    }
    const code = textarea.value.trim();
    sendChatMessagePayload({
        content: code,
        mediaType: 'code',
        mediaName: 'كشكول الأكواد (CodePad)'
    });
    hideModal('codepadModal');
    showNotification('تمت مشاركة محتوى الكشكول في الشات بنجاح! 🚀');
}

function openCodeSnippetModal() {
    showModal('codeSnippetModal');
    const codeInput = document.getElementById('snippetCodeInput');
    if (codeInput) {
        setTimeout(() => codeInput.focus(), 150);
    }
}

function handleCodeSnippetSubmit(e) {
    if (e) e.preventDefault();
    const codeInput = document.getElementById('snippetCodeInput');
    const titleInput = document.getElementById('snippetTitleInput');
    const langSelect = document.getElementById('snippetLanguageSelect');

    const code = codeInput ? codeInput.value.trim() : '';
    if (!code) {
        alert('الرجاء كتابة أو لصق الكود أولاً!');
        return;
    }

    const title = titleInput ? titleInput.value.trim() : '';
    const lang = langSelect ? langSelect.value : 'Plain Text';
    const mediaName = title ? `${title} (${lang})` : lang;

    sendChatMessagePayload({
        content: code,
        mediaType: 'code',
        mediaName: mediaName
    });

    if (codeInput) codeInput.value = '';
    if (titleInput) titleInput.value = '';
    hideModal('codeSnippetModal');
    showNotification('تمت مشاركة الكود في الشات بنجاح! 🚀');
}

function copySnippetCode(messageId, btnElement) {
    const codeEl = document.getElementById(`code-content-${messageId}`);
    if (codeEl) {
        const text = codeEl.innerText || codeEl.textContent;
        copyTextToClipboard(text, btnElement);
        return;
    }
    const msg = STATE.messages.find(m => m.id === messageId);
    if (msg && msg.content) {
        copyTextToClipboard(msg.content, btnElement);
    }
}

async function copyTextToClipboard(text, btnElement) {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            success = true;
        } catch (e) {
            success = false;
        }
    }
    if (!success) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '-9999px';
            textarea.setAttribute('readonly', '');
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            success = document.execCommand('copy');
            document.body.removeChild(textarea);
        } catch (err) {
            success = false;
        }
    }

    if (btnElement) {
        const origHTML = btnElement.innerHTML;
        btnElement.innerHTML = '<span>✅ تم النسخ!</span>';
        btnElement.classList.add('bg-emerald-500', 'text-slate-950');
        setTimeout(() => {
            btnElement.innerHTML = origHTML;
            btnElement.classList.remove('bg-emerald-500', 'text-slate-950');
        }, 2000);
    }
    showNotification('تم نسخ الكود للحافظة بنجاح! 📋');
    return success;
}

function handleTextareaTabKey(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const value = this.value;
        this.value = value.substring(0, start) + '    ' + value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
        this.dispatchEvent(new Event('input'));
    }
}

// ----------------------------------------------------
// 9c. Classroom Real-time Screen Sharing & Live Cinema 🖥️🍿 (WebRTC)
// ----------------------------------------------------

// Toggle Button in Header
function toggleScreenShare() {
    if (STATE.screenShare.isSharing) {
        stopScreenShare();
    } else if (STATE.screenShare.isViewing) {
        closeScreenShareView();
    } else if (STATE.screenShare.activeShareInfo) {
        // Someone else is sharing: join it!
        joinScreenShare();
    } else {
        // Start new screen share as presenter
        startScreenShare();
    }
}

async function startScreenShare() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('ميزة مشاركة الشاشة غير مدعومة في هذا المتصفح. يرجى استخدام متصفح حديث (Chrome / Edge / Firefox).');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always',
                displaySurface: 'monitor',
                frameRate: { ideal: 30, max: 60 }
            },
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        STATE.screenShare.localStream = stream;
        STATE.screenShare.isSharing = true;
        STATE.screenShare.isViewing = false;

        const videoEl = document.getElementById('screenShareVideo');
        if (videoEl) {
            videoEl.srcObject = stream;
            videoEl.muted = true; // Mute locally to prevent audio feedback loop!
            videoEl.play().catch(e => console.warn('Video play error:', e));
        }

        openScreenSharePanel({
            presenterName: STATE.user ? STATE.user.nickname : 'أنا',
            isPresenter: true
        });

        // Listen for native browser stop sharing bar click
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.onended = () => {
                stopScreenShare();
            };
        }

        // Notify server
        if (STATE.socket) {
            STATE.socket.emit('screen_share_start', {
                presenterId: STATE.user ? STATE.user.id : null,
                presenterName: STATE.user ? STATE.user.nickname : 'زميلك',
                hasAudio: stream.getAudioTracks().length > 0
            });
        }

        showNotification('تم بدء بث الشاشة بنجاح! 🖥️ زمايلك في الفصل يقدروا يشوفوا البث الآن.');
    } catch (err) {
        console.error('Error starting screen share:', err);
        if (err.name !== 'NotAllowedError') {
            alert('حدث خطأ أثناء محاولة مشاركة الشاشة. يرجى المحاولة مرة أخرى.');
        }
    }
}

function stopScreenShare() {
    if (STATE.screenShare.localStream) {
        STATE.screenShare.localStream.getTracks().forEach(track => {
            track.stop();
        });
        STATE.screenShare.localStream = null;
    }

    // Close all viewer peer connections
    STATE.screenShare.peerConnections.forEach(pc => pc.close());
    STATE.screenShare.peerConnections.clear();

    STATE.screenShare.isSharing = false;
    closeScreenSharePanel();

    if (STATE.socket) {
        STATE.socket.emit('screen_share_stop');
    }

    showNotification('تم إيقاف بث الشاشة ⏹️');
}

function joinScreenShare() {
    if (!STATE.screenShare.activeShareInfo) {
        showNotification('لا يوجد بث شاشة مباشر حالياً.');
        return;
    }

    STATE.screenShare.isViewing = true;
    STATE.screenShare.isSharing = false;

    // Dismiss join banner
    dismissScreenShareNotification();

    openScreenSharePanel({
        presenterName: STATE.screenShare.activeShareInfo.presenterName || 'زميلك',
        isPresenter: false
    });

    const loadingOverlay = document.getElementById('screenShareLoadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    // Initialize or Reset Viewer RTCPeerConnection
    if (STATE.screenShare.viewerPeerConnection) {
        STATE.screenShare.viewerPeerConnection.close();
    }

    const pc = new RTCPeerConnection(STATE.screenShare.rtcConfig);
    STATE.screenShare.viewerPeerConnection = pc;

    pc.ontrack = (event) => {
        console.log('🎥 Received remote screen share track:', event.track.kind);
        const videoEl = document.getElementById('screenShareVideo');
        if (videoEl) {
            videoEl.srcObject = event.streams[0];
            videoEl.muted = false; // Audio on for viewers
            videoEl.play().catch(e => console.warn('Autoplay error:', e));
        }
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    };

    pc.onicecandidate = (event) => {
        if (event.candidate && STATE.screenShare.activeShareInfo && STATE.socket) {
            STATE.socket.emit('webrtc_ice_candidate', {
                targetSocketId: STATE.screenShare.activeShareInfo.presenterSocketId,
                candidate: event.candidate
            });
        }
    };

    // Request presenter to send an offer
    if (STATE.socket) {
        STATE.socket.emit('webrtc_viewer_join', {
            viewerName: STATE.user ? STATE.user.nickname : 'طالب'
        });
    }
}

function closeScreenShareView() {
    if (STATE.screenShare.viewerPeerConnection) {
        STATE.screenShare.viewerPeerConnection.close();
        STATE.screenShare.viewerPeerConnection = null;
    }
    STATE.screenShare.isViewing = false;
    closeScreenSharePanel();
    showNotification('تم الخروج من مشاهدة البث 🚪');
}

function handleScreenShareControlClick() {
    if (STATE.screenShare.isSharing) {
        stopScreenShare();
    } else {
        closeScreenShareView();
    }
}

function openScreenSharePanel({ presenterName, isPresenter }) {
    const panel = document.getElementById('screenShareTheaterPanel');
    const nameEl = document.getElementById('screenSharePresenterName');
    const controlBtnText = document.getElementById('screenShareControlBtnText');
    const statusPill = document.getElementById('screenShareStatusPill');

    if (panel) panel.classList.remove('hidden');
    if (nameEl) nameEl.textContent = isPresenter ? `${presenterName} (أنت)` : presenterName;
    if (controlBtnText) controlBtnText.textContent = isPresenter ? 'إيقاف البث' : 'خروج من المشاهدة';
    if (statusPill) {
        statusPill.textContent = isPresenter ? '🔴 أنت تبث الآن' : '🔴 بث حي مباشر';
    }

    updateScreenShareHeaderButton();
}

function closeScreenSharePanel() {
    const panel = document.getElementById('screenShareTheaterPanel');
    const videoEl = document.getElementById('screenShareVideo');
    if (panel) panel.classList.add('hidden');
    if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
    }
    updateScreenShareHeaderButton();
}

function updateScreenShareHeaderButton() {
    const btn = document.getElementById('screenShareToggleBtn');
    const label = document.getElementById('screenShareBtnLabel');
    const dot = document.getElementById('screenShareLiveDot');
    if (!btn || !label || !dot) return;

    if (STATE.screenShare.isSharing) {
        label.textContent = 'إيقاف البث';
        btn.classList.add('bg-red-500/20', 'border-red-500/40', 'text-red-400');
        btn.classList.remove('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
        dot.classList.remove('hidden');
    } else if (STATE.screenShare.isViewing) {
        label.textContent = 'الخروج من البث';
        btn.classList.add('bg-cyan-500/20', 'border-cyan-500/40', 'text-cyan-400');
        btn.classList.remove('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
        dot.classList.remove('hidden');
    } else if (STATE.screenShare.activeShareInfo) {
        label.textContent = 'مشاهدة البث 🔴';
        btn.classList.add('bg-emerald-500/20', 'border-emerald-500/40', 'text-emerald-400');
        dot.classList.remove('hidden');
    } else {
        label.textContent = 'بث الشاشة';
        btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all shadow-sm relative';
        dot.classList.add('hidden');
    }
}

// Fullscreen & PiP & Audio Helpers
function toggleScreenShareFullscreen() {
    const videoEl = document.getElementById('screenShareVideo');
    if (!videoEl) return;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        if (videoEl.requestFullscreen) {
            videoEl.requestFullscreen();
        } else if (videoEl.webkitRequestFullscreen) {
            videoEl.webkitRequestFullscreen();
        }
    }
}

async function toggleScreenSharePiP() {
    const videoEl = document.getElementById('screenShareVideo');
    if (!videoEl || !document.pictureInPictureEnabled) return;
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await videoEl.requestPictureInPicture();
        }
    } catch (e) {
        console.warn('PiP error:', e);
    }
}

function toggleScreenShareAudio() {
    const videoEl = document.getElementById('screenShareVideo');
    const iconEl = document.getElementById('screenShareAudioIcon');
    if (!videoEl || !iconEl) return;
    videoEl.muted = !videoEl.muted;
    iconEl.textContent = videoEl.muted ? '🔇' : '🔊';
    showNotification(videoEl.muted ? 'تم كتم صوت البث 🔇' : 'تم تفعيل صوت البث 🔊');
}

function dismissScreenShareNotification() {
    const banner = document.getElementById('screenShareJoinNotification');
    if (banner) banner.classList.add('hidden');
}

// ----------------- WebRTC Event Handlers -----------------

function handleScreenShareStarted(shareInfo) {
    STATE.screenShare.activeShareInfo = shareInfo;
    updateScreenShareHeaderButton();

    // If I am NOT the presenter, show incoming notification banner
    const isMe = STATE.socket && STATE.socket.id === shareInfo.presenterSocketId;
    if (!isMe) {
        const banner = document.getElementById('screenShareJoinNotification');
        const textEl = document.getElementById('screenShareJoinText');
        if (banner && textEl) {
            textEl.textContent = `🔴 ${shareInfo.presenterName} بدأ بث شاشته الآن! اضغط لمشاهدة البث مباشرة جنب الشات.`;
            banner.classList.remove('hidden');
        }
        showNotification(`🖥️ ${shareInfo.presenterName} بدأ بث شاشته الآن!`);
    }
}

function handleScreenShareEnded() {
    STATE.screenShare.activeShareInfo = null;
    dismissScreenShareNotification();

    if (STATE.screenShare.isViewing) {
        closeScreenShareView();
        showNotification('انتهى البث المباشر للشاشة ⏹️');
    } else if (STATE.screenShare.isSharing) {
        stopScreenShare();
    } else {
        updateScreenShareHeaderButton();
    }
}

// Presenter: Handle viewer join request -> send WebRTC offer
async function handleViewerJoined({ viewerSocketId, viewerName }) {
    if (!STATE.screenShare.isSharing || !STATE.screenShare.localStream) return;
    console.log(`📡 Presenter establishing WebRTC stream to viewer ${viewerName} (${viewerSocketId})`);

    const pc = new RTCPeerConnection(STATE.screenShare.rtcConfig);
    STATE.screenShare.peerConnections.set(viewerSocketId, pc);

    // Add local tracks to peer connection
    STATE.screenShare.localStream.getTracks().forEach(track => {
        pc.addTrack(track, STATE.screenShare.localStream);
    });

    pc.onicecandidate = (event) => {
        if (event.candidate && STATE.socket) {
            STATE.socket.emit('webrtc_ice_candidate', {
                targetSocketId: viewerSocketId,
                candidate: event.candidate
            });
        }
    };

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (STATE.socket) {
            STATE.socket.emit('webrtc_offer', {
                targetSocketId: viewerSocketId,
                offer: pc.localDescription
            });
        }
    } catch (e) {
        console.error('Error creating offer for viewer:', e);
    }
}

// Viewer: Handle incoming offer from presenter -> send WebRTC answer
async function handleIncomingOffer({ presenterSocketId, offer }) {
    if (!STATE.screenShare.isViewing) return;
    const pc = STATE.screenShare.viewerPeerConnection;
    if (!pc) return;

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (STATE.socket) {
            STATE.socket.emit('webrtc_answer', {
                targetSocketId: presenterSocketId,
                answer: pc.localDescription
            });
        }
    } catch (e) {
        console.error('Error handling incoming offer:', e);
    }
}

// Presenter: Handle incoming answer from viewer
async function handleIncomingAnswer({ viewerSocketId, answer }) {
    const pc = STATE.screenShare.peerConnections.get(viewerSocketId);
    if (pc) {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
            console.error('Error setting remote answer for viewer:', e);
        }
    }
}

// Both: Handle incoming ICE candidate
async function handleIncomingIceCandidate({ fromSocketId, candidate }) {
    try {
        if (STATE.screenShare.isSharing) {
            const pc = STATE.screenShare.peerConnections.get(fromSocketId);
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else if (STATE.screenShare.isViewing && STATE.screenShare.viewerPeerConnection) {
            await STATE.screenShare.viewerPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (e) {
        console.warn('Error adding ICE candidate:', e);
    }
}

// ----------------------------------------------------
// 10. Admin Superpowers Dashboard
// ----------------------------------------------------
async function openAdminDashboard() {
    // Strictly ONLY the hardware admin (MAC D0:8E:79:18:9F:A0) can open this!
    if (!STATE.networkInfo || !STATE.networkInfo.isHostAdmin) {
        return; // Silent abort for any other student
    }

    try {
        const res = await fetch('/api/admin/devices');
        if (!res.ok) return;
        const data = await res.json();
        renderAdminDashboard(data);
        showModal('adminModal');
    } catch (e) {
        alert('فشل تحميل لوحة الأدمن!');
    }
}

function renderAdminDashboard(data) {
    const container = document.getElementById('adminDevicesTable');
    if (!container) return;

    container.innerHTML = data.devices.map(d => `
        <tr class="border-b border-slate-800 text-xs">
            <td class="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                <span class="w-6 h-6 rounded-full overflow-hidden inline-flex items-center justify-center text-sm shrink-0">${renderAvatarHTML(d.avatar)}</span>
                <span>${escapeHtml(d.nickname)}</span>
            </td>
            <td class="py-2.5 px-3 text-cyan-400 font-mono">${d.ip}</td>
            <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${d.mac}</td>
            <td class="py-2.5 px-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${d.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}">
                    ${d.role}
                </span>
            </td>
            <td class="py-2.5 px-3">
                ${d.role !== 'admin' ? `
                    <button onclick="adminKickUser('${d.userId}')" class="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all text-[11px] font-bold">
                        طرد ⛔
                    </button>
                ` : '<span class="text-slate-600 text-[10px]">-</span>'}
            </td>
        </tr>
    `).join('');

    const focusBtn = document.getElementById('adminToggleFocusBtn');
    if (focusBtn) {
        focusBtn.textContent = data.isChatFocusLocked ? '🔓 إلغاء قفل الشات (وضع الشرح)' : '🔒 تفعيل وضع التركيز (قفل الشات)';
        focusBtn.className = data.isChatFocusLocked 
            ? 'w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 text-slate-950 transition-all'
            : 'w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 transition-all';
    }
}

async function adminBroadcastAlert() {
    const msg = prompt('📢 اكتب نص الإذاعة العامة لجميع أجهزة الفصل:');
    if (!msg) return;

    await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'broadcast_alert',
            payload: { message: msg }
        })
    });
}

async function adminStealthRelease() {
    await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'stealth_release',
            payload: {}
        })
    });
    alert('تم إرسال أمر فك التمويه لجميع الشاشات بنجاح! 🚀');
}

async function adminToggleFocusMode() {
    const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'toggle_focus_mode',
            payload: {}
        })
    });
    const data = await res.json();
    const focusBtn = document.getElementById('adminToggleFocusBtn');
    if (focusBtn) {
        focusBtn.textContent = data.isChatFocusLocked ? '🔓 إلغاء قفل الشات (وضع الشرح)' : '🔒 تفعيل وضع التركيز (قفل الشات)';
    }
}

async function adminKickUser(userId) {
    if (!confirm('هل أنت متأكد من طرد هذا الطالب من الفصل؟')) return;
    await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'kick_user',
            payload: { userId }
        })
    });
    openAdminDashboard(); // Refresh
}

async function adminDeleteMessage(messageId) {
    if (!confirm('حذف هذه الرسالة من عند الجميع؟')) return;
    await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'delete_message',
            payload: { messageId }
        })
    });
}

// ----------------------------------------------------
// 11. Modal & Notification Utilities
// ----------------------------------------------------
function showModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('hidden');
    if (id === 'profileModal' && STATE.user) {
        const nick = document.getElementById('editNickname');
        const bio = document.getElementById('editBio');
        if (nick) nick.value = STATE.user.nickname || '';
        if (bio) bio.value = STATE.user.bio || '';
        const radio = document.querySelector(`input[name="editAvatar"][value="${STATE.user.avatar}"]`);
        if (radio) {
            radio.checked = true;
        } else {
            document.querySelectorAll('input[name="editAvatar"]').forEach(r => r.checked = false);
        }
        const previewEl = document.getElementById('editAvatarCustomPreview');
        if (previewEl) previewEl.innerHTML = renderAvatarHTML(STATE.user.avatar);
        STATE.pendingEditAvatarUrl = null;
    }
    if (id === 'storyCreatorModal') {
        removeStorySelectedFile();
    }
    if (id === 'whiteboardModal') {
        setTimeout(resizeWhiteboardCanvas, 50);
        setTimeout(resizeWhiteboardCanvas, 200);
    }
}

function hideModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
}

function showNotification(text) {
    const banner = document.getElementById('globalNotificationPill');
    const msgEl = document.getElementById('globalNotificationMsg');
    if (banner && msgEl) {
        msgEl.textContent = text;
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 4000);
    }
}

function showAnnouncementModal({ title, message, time }) {
    const modal = document.getElementById('announcementModal');
    if (modal) {
        document.getElementById('announcementTitle').textContent = title;
        document.getElementById('announcementText').textContent = message;
        document.getElementById('announcementTime').textContent = time;
        modal.classList.remove('hidden');
    }
}

function showTypingIndicator(nickname) {
    const el = document.getElementById('chatTypingIndicator');
    if (el) {
        el.textContent = `${nickname} يكتب الآن... ✍️`;
        el.classList.remove('hidden');
    }
}

function hideTypingIndicator() {
    const el = document.getElementById('chatTypingIndicator');
    if (el) el.classList.add('hidden');
}

function setDisappearingTimer(seconds) {
    STATE.disappearingSeconds = seconds;
    const btn = document.getElementById('disappearingToggleBtn');
    if (btn) {
        if (seconds > 0) {
            btn.innerHTML = `🔥 ${seconds}s`;
            btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30';
        } else {
            btn.innerHTML = `⏳ مؤقت`;
            btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white border border-slate-700';
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

function connectToEnteredHost() {
    const input = document.getElementById('targetHostIpInput');
    let target = input ? input.value.trim() : '';
    if (!target) {
        alert('يرجى كتابة عنوان IP السيرفر أولاً!');
        return;
    }
    target = target.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    let host = target;
    let port = 5000;
    if (target.includes(':')) {
        const parts = target.split(':');
        host = parts[0];
        port = parts[1];
    }
    localStorage.setItem('no2ta_custom_host_ip', host);
    window.location.href = `http://${host}:${port}`;
}

// ----------------------------------------------------
// 12. Setup Event Listeners
// ----------------------------------------------------
function setupEventListeners() {
    // Auth Form
    const authForm = document.getElementById('authForm');
    if (authForm) authForm.addEventListener('submit', handleLoginSubmit);

    // Chat Message Form
    const chatForm = document.getElementById('chatForm');
    if (chatForm) chatForm.addEventListener('submit', handleSendMessage);

    // Typing Input emitter
    const msgInput = document.getElementById('messageInput');
    let typingTimer = null;
    if (msgInput) {
        msgInput.addEventListener('input', () => {
            if (STATE.socket && STATE.user) {
                STATE.socket.emit('typing_start', {
                    userId: STATE.user.id,
                    nickname: STATE.user.nickname
                });
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    STATE.socket.emit('typing_stop', { userId: STATE.user.id });
                }, 1500);
            }
        });
    }

    // Media File Attachment Picker
    const filePicker = document.getElementById('chatFileInput');
    if (filePicker) {
        filePicker.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload/media', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    sendChatMessagePayload({
                        mediaUrl: data.url,
                        mediaType: data.type,
                        mediaName: data.name,
                        mediaSize: data.size
                    });
                }
            } catch (err) {
                alert('فشل رفع الملف!');
            }
        });
    }

    // Voice Record Button
    const voiceBtn = document.getElementById('voiceRecordBtn');
    if (voiceBtn) voiceBtn.addEventListener('click', toggleVoiceRecording);

    const voiceCancelBtn = document.getElementById('voiceCancelBtn');
    if (voiceCancelBtn) voiceCancelBtn.addEventListener('click', cancelVoiceRecording);

    // AirDrop Drag and Drop
    const airdropDropZone = document.getElementById('airdropDropZone');
    const airdropFileInput = document.getElementById('airdropFileInput');
    if (airdropDropZone && airdropFileInput) {
        airdropDropZone.addEventListener('click', () => airdropFileInput.click());
        airdropFileInput.addEventListener('change', (e) => handleAirDropUpload(e.target.files[0]));

        airdropDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            airdropDropZone.classList.add('border-cyan-400', 'bg-cyan-500/10');
        });
        airdropDropZone.addEventListener('dragleave', () => {
            airdropDropZone.classList.remove('border-cyan-400', 'bg-cyan-500/10');
        });
        airdropDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            airdropDropZone.classList.remove('border-cyan-400', 'bg-cyan-500/10');
            if (e.dataTransfer.files.length > 0) {
                handleAirDropUpload(e.dataTransfer.files[0]);
            }
        });
    }

    // Story Create Form
    const storyForm = document.getElementById('storyCreateForm');
    if (storyForm) storyForm.addEventListener('submit', handleCreateStorySubmit);

    // Profile Edit Form
    const profileForm = document.getElementById('profileEditForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!STATE.user) return;
            const nickname = document.getElementById('editNickname').value.trim();
            const bio = document.getElementById('editBio').value.trim();
            const avatar = STATE.pendingEditAvatarUrl || document.querySelector('input[name="editAvatar"]:checked')?.value;

            try {
                const res = await fetch('/api/users/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: STATE.user.id,
                        nickname: nickname || undefined,
                        avatar: avatar || undefined,
                        bio: bio || undefined
                    })
                });
                const data = await res.json();
                if (data.success) {
                    STATE.user = data.user;
                    STATE.pendingEditAvatarUrl = null;
                    localStorage.setItem('no2ta_user', JSON.stringify(data.user));
                    updateProfileUI();
                    loadUsers(); // Refresh sidebar
                    hideModal('profileModal');
                    showNotification('تم تحديث بروفايلك بنجاح! 🚀');
                }
            } catch (err) {
                alert('فشل تحديث البروفايل!');
            }
        });
    }

    // Avatar Upload Listeners (From Device)
    const editAvatarFileInput = document.getElementById('editAvatarFileInput');
    if (editAvatarFileInput) {
        editAvatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const previewEl = document.getElementById('editAvatarCustomPreview');
                if (previewEl) previewEl.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover rounded-full" />`;
            };
            reader.readAsDataURL(file);

            const formData = new FormData();
            formData.append('avatar', file);
            try {
                showNotification('جاري رفع صورة البروفايل... ⏳');
                const res = await fetch('/api/upload/avatar', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    STATE.pendingEditAvatarUrl = data.url;
                    document.querySelectorAll('input[name="editAvatar"]').forEach(r => r.checked = false);
                    showNotification('تم رفع الصورة بنجاح! 📷 اضغط حفظ التعديلات');
                }
            } catch (err) {
                alert('فشل رفع صورة البروفايل!');
            }
        });
    }

    const authAvatarFileInput = document.getElementById('authAvatarFileInput');
    if (authAvatarFileInput) {
        authAvatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const previewEl = document.getElementById('authAvatarCustomPreview');
                if (previewEl) previewEl.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover rounded-full" />`;
            };
            reader.readAsDataURL(file);

            const formData = new FormData();
            formData.append('avatar', file);
            try {
                const res = await fetch('/api/upload/avatar', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    STATE.pendingAuthAvatarUrl = data.url;
                    document.querySelectorAll('input[name="authAvatar"]').forEach(r => r.checked = false);
                    showNotification('تم اختيار صورتك الشخصية بنجاح! 📷');
                }
            } catch (err) {
                alert('فشل رفع الصورة!');
            }
        });
    }

    // Story File Preview Listeners
    const storyFileInput = document.getElementById('storyFileInput');
    if (storyFileInput) {
        storyFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const img = document.getElementById('storyImagePreview');
                        if (img) img.src = ev.target.result;
                        const emptyState = document.getElementById('storyFileEmptyState');
                        const previewState = document.getElementById('storyFilePreviewState');
                        if (emptyState) emptyState.classList.add('hidden');
                        if (previewState) previewState.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                } else {
                    const emptyState = document.getElementById('storyFileEmptyState');
                    const previewState = document.getElementById('storyFilePreviewState');
                    if (emptyState) emptyState.classList.add('hidden');
                    if (previewState) previewState.classList.remove('hidden');
                }
            }
        });
    }

    // Stealth Iframe Message Listener
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'NO2TA_STEALTH_RESTORE') {
            STATE.localStealthSuppressed = true;
            releaseStealthMode();
        } else if (e.data && e.data.type === 'NO2TA_LOCAL_STEALTH_CLOSE') {
            // Password verified inside iframe: close on THIS device only!
            STATE.localStealthSuppressed = true;
            releaseStealthMode({ message: 'تم إغلاق شاشة التمويه على جهازك فقط 🤫' });
        } else if (e.data && e.data.type === 'NO2TA_TRIGGER_PANIC') {
            // F2 pressed inside iframe: trigger panic on everyone!
            triggerPanicButton();
        }
    });

    // CodePad / Plain Text Bin Listeners
    const codepadArea = document.getElementById('sharedCodePadTextarea');
    if (codepadArea) {
        codepadArea.addEventListener('input', handleCodePadInput);
        codepadArea.addEventListener('keydown', handleTextareaTabKey);
    }

    const snippetArea = document.getElementById('snippetCodeInput');
    if (snippetArea) {
        snippetArea.addEventListener('keydown', handleTextareaTabKey);
    }

    const snippetForm = document.getElementById('codeSnippetForm');
    if (snippetForm) {
        snippetForm.addEventListener('submit', handleCodeSnippetSubmit);
    }
}

function logoutCurrentUser() {
    if (confirm('هل تريد تسجيل الخروج من نؤطة؟')) {
        localStorage.removeItem('no2ta_user');
        window.location.reload();
    }
}
