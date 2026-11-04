// ==========================================
// 🚀 No2ta ("نؤطة") - Core Application Controller
// ==========================================

const STATE = {
    user: null,
    socket: null,
    users: [],
    onlineUserIds: new Set(),
    activeChat: { type: 'general', recipient: null, group: null },
    groups: [],
    activeSidebarTab: 'general',
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
    radio: {
        activeTrack: null,
        isPlaying: false,
        isSeeking: false,
        audioEl: null
    },
    netSupport: {
        devices: [],
        currentShowDeviceId: null,
        pollInterval: null,
        studentStreamInterval: null,
        studentMediaStream: null
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
function renderIcons() {
    if (window.lucide) lucide.createIcons();
}

// ---------------------- Quick Math Challenge (live competitive mini-game) ----------------------
function startMathGame() {
    if (STATE.socket) STATE.socket.emit('math_game_start');
}

function submitMathAnswer(e) {
    e.preventDefault();
    const input = document.getElementById('mathGameAnswerInput');
    if (!input || !input.value.trim()) return;
    if (STATE.socket) {
        STATE.socket.emit('math_game_answer', {
            answer: input.value.trim(),
            nickname: STATE.user ? STATE.user.nickname : 'لاعب'
        });
    }
    input.value = '';
}

function renderMathGameScores(containerId, scores) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!scores || scores.length === 0) {
        el.innerHTML = `<p class="text-micro text-slate-500 text-center">لسه محدش سجل نقطة</p>`;
        return;
    }
    el.innerHTML = scores.map(([name, pts], i) => `
        <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg ${i === 0 ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-slate-900/60'} text-xs">
            <span class="font-bold text-slate-200">#${i + 1} ${escapeHtml(name)}</span>
            <span class="font-mono font-black text-indigo-300">${pts}</span>
        </div>
    `).join('');
}

function handleMathGameState(state) {
    const idleView = document.getElementById('mathGameIdleView');
    const questionView = document.getElementById('mathGameQuestionView');
    const finishedView = document.getElementById('mathGameFinishedView');
    if (!idleView || !questionView || !finishedView) return;

    if (state.status === 'question') {
        idleView.classList.add('hidden');
        finishedView.classList.add('hidden');
        questionView.classList.remove('hidden');
        document.getElementById('mathGameProgress').textContent = `سؤال ${state.index + 1} / ${state.total}`;
        document.getElementById('mathGameQuestionText').textContent = state.question;
        document.getElementById('mathGameRoundResult').textContent = '';
        renderMathGameScores('mathGameLiveScores', state.scores);
        const input = document.getElementById('mathGameAnswerInput');
        if (input) { input.value = ''; input.focus(); }
    } else if (state.status === 'finished') {
        idleView.classList.add('hidden');
        questionView.classList.add('hidden');
        finishedView.classList.remove('hidden');
        renderMathGameScores('mathGameFinalScores', state.scores);
    }
}

function handleMathGameRoundResult(data) {
    const resultEl = document.getElementById('mathGameRoundResult');
    if (!resultEl) return;
    resultEl.textContent = data.winner
        ? `${data.winner} جاوب صح! (${data.answer})`
        : `محدش جاوب في الوقت (${data.answer})`;
}

// ---------------------------------------------------------------
// Custom Dropdown — replaces the browser's native <select> popup
// (whose look can't be themed) with a styled list matching the app,
// while keeping the original <select> in the DOM (hidden) so every
// existing `select.value` read/`change` listener keeps working untouched.
// ---------------------------------------------------------------
function enhanceSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select || select.dataset.enhanced) return;
    select.dataset.enhanced = '1';
    select.classList.add('hidden');

    const wrap = document.createElement('div');
    wrap.className = 'relative';
    select.insertAdjacentElement('afterend', wrap);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = select.className.replace('hidden', '') + ' flex items-center justify-between gap-2 cursor-pointer';

    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'truncate';
    const chevron = document.createElement('i');
    chevron.setAttribute('data-lucide', 'chevron-down');
    chevron.className = 'w-4 h-4 shrink-0 text-slate-400 transition-transform';
    trigger.appendChild(triggerLabel);
    trigger.appendChild(chevron);
    wrap.appendChild(trigger);

    const list = document.createElement('div');
    list.className = 'hidden absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-slate-700 bg-slate-900 shadow-2xl py-1';
    wrap.appendChild(list);

    function renderOptions() {
        list.innerHTML = '';
        Array.from(select.options).forEach(opt => {
            const item = document.createElement('button');
            item.type = 'button';
            const active = opt.value === select.value;
            item.className = `w-full text-right px-3.5 py-2 text-sm transition-colors ${active ? 'bg-cyan-500/15 text-cyan-300 font-bold' : 'text-slate-200 hover:bg-slate-800'}`;
            item.textContent = opt.textContent;
            item.onclick = () => {
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                syncTriggerLabel();
                closeList();
            };
            list.appendChild(item);
        });
    }

    function syncTriggerLabel() {
        const selectedOpt = select.options[select.selectedIndex];
        triggerLabel.textContent = selectedOpt ? selectedOpt.textContent : '';
    }

    function closeList() {
        list.classList.add('hidden');
        chevron.classList.remove('rotate-180');
    }

    function openList() {
        renderOptions();
        list.classList.remove('hidden');
        chevron.classList.add('rotate-180');
        renderIcons();
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (list.classList.contains('hidden')) openList(); else closeList();
    });
    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) closeList();
    });

    // If the underlying <select>'s options change later (populated dynamically),
    // refreshSelectLabel(selectId) keeps the visible trigger in sync.
    select._customSelectRefresh = () => { syncTriggerLabel(); if (!list.classList.contains('hidden')) renderOptions(); };

    syncTriggerLabel();
    renderIcons();
}

function refreshSelectLabel(selectId) {
    const select = document.getElementById(selectId);
    if (select && select._customSelectRefresh) select._customSelectRefresh();
}

document.addEventListener('DOMContentLoaded', async () => {
    renderIcons();
    enhanceSelect('snippetLanguageSelect');

    // Alexandria Live Clock & Prayer Times Engine
    initAlexandriaPrayerEngine();
    initTasbeehEngine();

    // 1. Fetch Network Info & Check Login
    await fetchNetworkInfo();
    checkExistingAuth();

    // 2. Setup Global Hotkeys for Panic Button
    setupStealthHotkeys();

    // 3. Setup UI Listeners
    setupEventListeners();

    // 4. Desktop Notifications & Read Receipts
    initDesktopNotifications();
});

// ----------------------------------------------------
// Notifications, Tab Alert & Seen (سين) System
// ----------------------------------------------------
let titleAlertInterval = null;
const originalDocTitle = 'نؤطة (No2ta) - شبكة الفصل الاجتماعية';

function triggerTabTitleAlert(senderName) {
    if (document.hasFocus()) return;
    if (titleAlertInterval) clearInterval(titleAlertInterval);

    let isAlert = true;
    titleAlertInterval = setInterval(() => {
        document.title = isAlert ? `💬 (1) رسالة من ${senderName} | نؤطة` : originalDocTitle;
        isAlert = !isAlert;
    }, 1200);
}

function stopTabTitleAlert() {
    if (titleAlertInterval) {
        clearInterval(titleAlertInterval);
        titleAlertInterval = null;
        document.title = originalDocTitle;
    }
}

window.addEventListener('focus', () => {
    stopTabTitleAlert();
    // When returning to window, mark active direct chat as read
    if (STATE.activeChat && STATE.activeChat.type === 'direct' && STATE.activeChat.recipient && STATE.user) {
        STATE.socket?.emit('mark_messages_read', {
            senderId: STATE.activeChat.recipient.id,
            recipientId: STATE.user.id
        });
    }
});

function initDesktopNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
        const askPermission = () => {
            Notification.requestPermission();
            window.removeEventListener('click', askPermission);
            window.removeEventListener('keydown', askPermission);
        };
        window.addEventListener('click', askPermission, { once: true });
        window.addEventListener('keydown', askPermission, { once: true });
    }
}

function showDesktopNotification(senderName, text, chatType, targetId) {
    try {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        if (document.hasFocus()) return;

        const notif = new Notification(`💬 ${senderName} (نؤطة ⚡)`, {
            body: text,
            icon: '/favicon.ico',
            tag: `no2ta-chat-${targetId || 'general'}`
        });

        notif.onclick = () => {
            window.focus();
            if (chatType === 'direct' && targetId) {
                selectDirectChat(targetId);
            } else if (chatType === 'group' && targetId) {
                selectGroupChat(targetId);
            } else {
                selectGeneralChat();
            }
            notif.close();
        };
    } catch (e) {
        console.warn('Desktop notification error:', e);
    }
}

function formatChatTime(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) {
            return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

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
    loadGroups();
    loadStories();
    loadMessages();
    loadAirDropFiles();
    initWhiteboard();
    startStudentAutoScreenStream();
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
        roleEl.textContent = STATE.user.role === 'admin' ? 'أدمن الفصل' : 'طالب عبقري';
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

    const netSupportBtn = document.getElementById('netSupportBtn');
    if (netSupportBtn) {
        if (STATE.user.role === 'admin' || (STATE.networkInfo && STATE.networkInfo.isHostAdmin)) {
            netSupportBtn.classList.remove('hidden');
        } else {
            netSupportBtn.classList.add('hidden');
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
        if (STATE.user && STATE.user.role !== 'admin') {
            setTimeout(captureStudentLiveSnapshot, 800);
        }
    });

    
    STATE.socket.on('streak_updated', (data) => {
        if (!data || !STATE.user) return;
        const otherId = data.userA === STATE.user.id ? data.userB : data.userA;
        let s = STATE.streaks.find(item => item.other_user_id === otherId);
        if (s) {
            s.streak_count = data.streak_count;
            s.is_frozen = data.is_frozen;
            s.interaction_count = data.interaction_count;
        } else {
            STATE.streaks.push({
                other_user_id: otherId,
                streak_count: data.streak_count,
                is_frozen: data.is_frozen,
                interaction_count: data.interaction_count
            });
        }
        renderUsersList();
        updateDirectStreakBadge(otherId);

        if (data.status === 'boosted') {
            const targetUser = STATE.users.find(u => u.id === otherId);
            const name = targetUser ? targetUser.nickname : 'زميلك';
            showNotification(`🔥 زاد الاستريك بينك وبين ${name} إلى ${data.streak_count}! حافظ عليه ⚡`);
        }
    });

    STATE.socket.on('dhikr_spoken_broadcast', (data) => {
        if (!data || !data.dhikrId) return;
        playDhikrAudioPhrase(data.dhikrId, data.dhikrTitle);
        showDhikrFloatingToast(data);
    });

    STATE.socket.on('salawat_broadcast', (data) => {
        handleSalawatBroadcast(data);
    });

    STATE.socket.on('tasbeeh_global_update', (data) => {
        if (data && typeof data.total !== 'undefined') {
            tasbeehState.classroomTotal = data.total;
            const el = document.getElementById('tasbeehClassroomTotal');
            if (el) el.textContent = data.total.toLocaleString('ar-EG');
        }
    });

    STATE.socket.on('presence_update', (data) => {
        STATE.onlineUserIds = new Set(data.onlineUserIds);
        renderUsersList();
        if (STATE.activeChat?.type === "direct") updateDirectStreakBadge(STATE.activeChat.recipient?.id);
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
        const isMe = STATE.user && message.sender_id === STATE.user.id;
        const isCurrentChat = (message.chat_type === 'general' && STATE.activeChat.type === 'general') ||
            (message.chat_type === 'direct' && STATE.activeChat.type === 'direct' &&
             (message.sender_id === STATE.activeChat.recipient?.id || message.recipient_id === STATE.activeChat.recipient?.id)) ||
            (message.chat_type === 'group' && STATE.activeChat.type === 'group' &&
             message.recipient_id === STATE.activeChat.group?.id);

        if (isCurrentChat) {
            STATE.messages.push(message);
            appendMessageBubble(message);
            scrollToBottom();
        }

        // Sound Notification
        if (isMe) {
            window.soundEngine.playSend();
        } else {
            window.soundEngine.playReceive();
        }

        // 1. Dynamic Reordering & Unread Indicator ("اخر شات اكلمه يظهر فوق" + "تفضل جنبها علامة")
        if (message.chat_type === 'direct') {
            const partnerId = isMe ? message.recipient_id : message.sender_id;
            const partnerIdx = STATE.users.findIndex(u => u.id === partnerId);
            if (partnerIdx !== -1) {
                const [partner] = STATE.users.splice(partnerIdx, 1);
                partner.last_message_at = message.created_at;
                partner.last_message_text = message.content || (message.media_type ? 'ملف مرفق 📎' : '');

                if (!isMe) {
                    if (!isCurrentChat || !document.hasFocus()) {
                        partner.unread_count = (Number(partner.unread_count) || 0) + 1;
                    } else {
                        STATE.socket.emit('mark_messages_read', { senderId: partner.id, recipientId: STATE.user.id });
                    }
                }

                // Place at index 0 (top of sidebar!)
                STATE.users.unshift(partner);
                renderUsersList();
            } else {
                loadUsers();
            }
        } else if (message.chat_type === 'group' && message.recipient_id) {
            const groupIdx = STATE.groups.findIndex(g => g.id === message.recipient_id);
            if (groupIdx !== -1) {
                const [grp] = STATE.groups.splice(groupIdx, 1);
                grp.last_message_at = message.created_at;
                STATE.groups.unshift(grp);
                if (typeof renderGroupsList === 'function') renderGroupsList();
            }
        }

        // 2. Incoming Notification Delivery ("تجيلي نوتفيكيشن")
        if (!isMe) {
            const senderName = message.sender_name || 'زميل في الفصل';
            const previewText = message.content 
                ? (message.content.length > 40 ? message.content.substring(0, 37) + '...' : message.content)
                : (message.media_type ? 'أرسل مرفقاً 📎' : 'رسالة جديدة');

            // Floating in-app pill notification (if chat is not active or window blurred)
            if (!isCurrentChat || !document.hasFocus()) {
                const chatTag = message.chat_type === 'direct' ? 'خاص' : (message.chat_type === 'group' ? 'جروب' : 'عام');
                showNotification(`💬 [${chatTag}] ${senderName}: ${previewText}`, 4000);
            }

            // Native Desktop Web Notification
            const targetId = message.chat_type === 'direct' ? message.sender_id : (message.chat_type === 'group' ? message.recipient_id : null);
            showDesktopNotification(senderName, previewText, message.chat_type, targetId);

            // Tab Title Alert Flash
            triggerTabTitleAlert(senderName);
        }

        // 3. Streak Engine Update
        if (streakInfo && (message.sender_id === STATE.user?.id || message.recipient_id === STATE.user?.id)) {
            const otherId = message.sender_id === STATE.user.id ? message.recipient_id : message.sender_id;
            let s = STATE.streaks.find(item => item.other_user_id === otherId);
            if (s) {
                s.streak_count = streakInfo.streak_count;
                s.is_frozen = streakInfo.is_frozen;
                s.interaction_count = streakInfo.interaction_count;
            } else {
                STATE.streaks.push({
                    other_user_id: otherId,
                    streak_count: streakInfo.streak_count,
                    is_frozen: streakInfo.is_frozen,
                    interaction_count: streakInfo.interaction_count
                });
            }
            renderUsersList();
            updateDirectStreakBadge(otherId);

            if (streakInfo.status === 'boosted') {
                showNotification(`🔥 استريك مشتعل! وصلتوا لـ ${streakInfo.streak_count} استريك معاً ⚡`);
            }
        }
    });

    // Handle messages marked as read by recipient (double cyan checkmarks ✓✓)
    STATE.socket.on('messages_marked_read', (data) => {
        const { readerId } = data;
        if (STATE.activeChat && STATE.activeChat.type === 'direct' && STATE.activeChat.recipient?.id === readerId) {
            STATE.messages.forEach(m => {
                if (m.sender_id === STATE.user?.id) {
                    m.is_read = 1;
                }
            });
            document.querySelectorAll('.msg-read-check').forEach(el => {
                el.textContent = '✓✓';
                el.className = 'msg-read-check text-cyan-400 font-bold';
                el.title = 'تمت القراءة (سين) ✓✓';
            });
        }
    });

    // 👥 Classroom Groups Socket Events
    STATE.socket.on('group_created', (data) => {
        loadGroups();
        if (data && data.group) {
            const isMember = (data.group.creator_id === STATE.user?.id) ||
                             (data.group.members && data.group.members.some(m => m.id === STATE.user?.id));
            if (isMember && data.group.creator_id !== STATE.user?.id) {
                showNotification(`👥 تمت إضافتك إلى جروب جديد: "${data.group.name}"! 🎉`);
            }
        }
    });

    STATE.socket.on('group_deleted', (data) => {
        loadGroups();
        if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === data.groupId) {
            showNotification(`⚠️ تم حذف الجروب "${data.groupName || ''}". العودة لشات الفصل.`);
            selectGeneralChat();
        }
    });

    STATE.socket.on('new_group_join_request', (data) => {
        loadGroups();
        if (window.soundEngine && typeof window.soundEngine.playNotification === 'function') {
            window.soundEngine.playNotification();
        }
        showNotification(`طلب انضمام جديد من ${data.request?.nickname || 'زميل'} لجروب "${data.groupName}"!`);
        if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === data.groupId) {
            const reqBtn = document.getElementById('groupHeaderJoinRequestsBtn');
            const reqCount = document.getElementById('groupHeaderJoinRequestsCount');
            if (reqBtn && reqCount) {
                reqBtn.classList.remove('hidden');
                const curr = parseInt(reqCount.textContent || '0', 10) + 1;
                reqCount.textContent = curr;
            }
        }
    });

    STATE.socket.on('group_join_request_accepted', (data) => {
        loadGroups();
        if (STATE.user && data.userId === STATE.user.id) {
            showNotification(`🎉 وافق المشرف على انضمامك لجروب "${data.groupName}"! الشات متاح لك الآن.`);
            if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === data.groupId) {
                loadGroups().then(() => {
                    selectGroupChat(data.groupId);
                });
            }
        }
    });

    STATE.socket.on('group_join_request_rejected', (data) => {
        loadGroups();
        if (STATE.user && data.userId === STATE.user.id) {
            showNotification(`❌ تم رفض طلب انضمامك لجروب "${data.groupName}".`);
            if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === data.groupId) {
                loadGroups().then(() => {
                    selectGroupChat(data.groupId);
                });
            }
        }
    });

    STATE.socket.on('groups_updated', () => {
        loadGroups();
    });

    // 🎵 Classroom Music Library Sync
    STATE.socket.on('music_library_updated', () => {
        loadMusicLibrary();
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
        if (badge) badge.textContent = count;
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

    // 🎵 SYNCHRONIZED CLASSROOM RADIO EVENTS 🎵
    STATE.socket.on('radio_sync_state', (state) => {
        handleRadioSyncState(state);
    });

    // Quick Math Challenge
    STATE.socket.on('math_game_state', (state) => handleMathGameState(state));
    STATE.socket.on('math_game_round_result', (data) => handleMathGameRoundResult(data));

    // 👁️ LIVE STORY VIEW UPDATE
    STATE.socket.on('story_view_updated', ({ storyId, viewsCount }) => {
        if (currentViewingGroup && currentViewingGroup.stories[activeStoryIndex]?.id === storyId) {
            updateStoryViewsDisplay(viewsCount);
        }
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

    // 🖥️ NETSUPPORT CLASSROOM MONITOR & REMOTE CONTROL EVENTS
    STATE.socket.on('netsupport_lock_screen', (data) => {
        const overlay = document.getElementById('studentLockScreenOverlay');
        const reasonEl = document.getElementById('studentLockReasonText');
        if (reasonEl && data && data.reason) {
            reasonEl.textContent = data.reason;
        }
        if (overlay) overlay.classList.remove('hidden');
        const audio = getRadioAudioElement();
        if (audio) audio.pause();
    });

    STATE.socket.on('netsupport_unlock_screen', () => {
        const overlay = document.getElementById('studentLockScreenOverlay');
        if (overlay) overlay.classList.add('hidden');
        showNotification('🔓 تم فك قفل الشاشة بواسطة الأستاذ.');
    });

    STATE.socket.on('netsupport_popup_message', (data) => {
        const modal = document.getElementById('studentDirectWarningModal');
        const titleEl = document.getElementById('studentDirectWarningTitle');
        const msgEl = document.getElementById('studentDirectWarningMsg');
        const timeEl = document.getElementById('studentDirectWarningTime');
        if (titleEl && data.title) titleEl.textContent = data.title;
        if (msgEl) msgEl.textContent = data.message;
        if (timeEl) timeEl.textContent = data.time || '';
        if (modal) modal.classList.remove('hidden');
        if (window.soundEngine && typeof window.soundEngine.playAnnouncement === 'function') {
            window.soundEngine.playAnnouncement();
        }
    });

    STATE.socket.on('netsupport_play_alarm', () => {
        if (window.soundEngine && typeof window.soundEngine.playAnnouncement === 'function') {
            window.soundEngine.playAnnouncement();
        }
        showNotification('🔔 تنبيه صوتي عاجل من مشرف المعمل!');
    });

    STATE.socket.on('netsupport_navigate_url', (data) => {
        if (data && data.url) {
            window.location.href = data.url;
        }
    });

    STATE.socket.on('netsupport_request_screen_share', () => {
        promptStudentNetSupportScreenShare();
    });

    STATE.socket.on('netsupport_device_frame_update', (data) => {
        handleNetSupportFrameUpdate(data);
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

    // Mute and pause radio audio / YouTube playback immediately
    if (window.ytPlayer && typeof window.ytPlayer.pauseVideo === 'function') {
        try {
            window.ytPlayer.pauseVideo();
            window.ytPlayer.mute();
        } catch (e) {}
    }
    const radioAudio = document.getElementById('classroomAudioElement');
    if (radioAudio) {
        radioAudio.pause();
        radioAudio.muted = true;
    }

    // 1. Change Document Title & Favicon to Physics Exam
    document.title = 'نموذج إجابة واختبار مهارات فلاتر - Flutter Competency Exam & Model Answers';
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

    // Unmute YouTube player if active
    if (window.ytPlayer && typeof window.ytPlayer.unMute === 'function') {
        try {
            window.ytPlayer.unMute();
            if (STATE.radio.isPlaying && STATE.radio.activeTrack?.videoId) {
                window.ytPlayer.playVideo();
            }
        } catch (e) {}
    }
    const radioAudio = document.getElementById('classroomAudioElement');
    if (radioAudio) {
        radioAudio.muted = false;
        if (STATE.radio.isPlaying && !STATE.radio.activeTrack?.videoId) {
            radioAudio.play().catch(() => {});
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
        const currentUserId = STATE.user ? STATE.user.id : '';
        const res = await fetch(`/api/users?currentUserId=${encodeURIComponent(currentUserId)}`);
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
            ? `<span class="inline-flex items-center gap-1 text-micro font-bold px-1.5 py-0.5 rounded-full ${isFrozen ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'}" title="${isFrozen ? 'الاستريك مجمد لعطلة نهاية الأسبوع ❄️' : 'استريك نشط اليوم 🔥'}">
                ${isFrozen ? '❄️🔥' : '🔥'} ${streakCount}
               </span>`
            : '';

        const unreadCount = Number(u.unread_count || 0);
        const hasUnread = unreadCount > 0;
        const isSelected = STATE.activeChat.type === 'direct' && STATE.activeChat.recipient?.id === u.id;

        // Visual Unread Badge (سين)
        const unreadBadge = hasUnread 
            ? `<span class="unread-pill inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-micro font-black bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/50 animate-pulse" title="${unreadCount} رسائل غير مقروءة">
                ${unreadCount > 99 ? '99+' : unreadCount}
               </span>`
            : '';

        const timeStr = formatChatTime(u.last_message_at);
        let previewHTML = '';
        if (u.last_message_text) {
            previewHTML = hasUnread 
                ? `<p class="text-[11px] text-cyan-300 font-bold truncate max-w-[130px] flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>${escapeHtml(u.last_message_text)}</p>`
                : `<p class="text-[11px] text-slate-400 truncate max-w-[130px]">${escapeHtml(u.last_message_text)}</p>`;
        } else {
            previewHTML = `<p class="text-[11px] text-slate-500 truncate max-w-[130px]">${escapeHtml(u.bio || 'طالب عبقري')}</p>`;
        }

        let cardBgClass = 'hover:bg-slate-800/60 border border-transparent';
        if (isSelected) {
            cardBgClass = 'bg-cyan-500/15 border border-cyan-500/40 shadow-sm';
        } else if (hasUnread) {
            cardBgClass = 'bg-cyan-950/30 border border-cyan-500/50 hover:bg-cyan-900/30 shadow-md shadow-cyan-950/50';
        }

        return `
            <div onclick="selectDirectChat('${u.id}')" class="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${cardBgClass}">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="relative shrink-0">
                        <div class="w-10 h-10 rounded-full bg-slate-800 border ${hasUnread ? 'border-cyan-400 ring-2 ring-cyan-400/30' : 'border-slate-700'} flex items-center justify-center text-xl overflow-hidden transition-all">
                            ${renderAvatarHTML(u.avatar)}
                        </div>
                        <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-500 live-glow' : 'bg-slate-600'}"></span>
                        ${hasUnread ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-900 animate-ping"></span><span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-slate-900"></span>` : ''}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                            <div class="flex items-center gap-1.5 truncate">
                                <span class="text-sm font-bold ${hasUnread ? 'text-cyan-200' : 'text-white'} truncate">${escapeHtml(u.nickname)}</span>
                                ${u.role === 'admin' ? '<span class="text-micro text-amber-400 font-black shrink-0">👑</span>' : ''}
                            </div>
                            ${timeStr ? `<span class="text-micro ${hasUnread ? 'text-cyan-400 font-bold' : 'text-slate-500'} shrink-0">${timeStr}</span>` : ''}
                        </div>
                        ${previewHTML}
                    </div>
                </div>
                <div class="shrink-0 flex items-center gap-1.5 mr-2">
                    ${streakBadge}
                    ${unreadBadge}
                </div>
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

// ----------------------------------------------------
// 4b. Sidebar Tabs & Chats Switcher (General / Groups / Direct)
// ----------------------------------------------------
function switchSidebarTab(tabName) {
    STATE.activeSidebarTab = tabName;
    updateSidebarTabsUI(tabName);

    const usersContainer = document.getElementById('usersListContainer');
    const groupsContainer = document.getElementById('groupsListContainer');
    const sectionTitle = document.getElementById('sidebarSectionTitle');
    const sectionAction = document.getElementById('sidebarSectionAction');

    if (tabName === 'groups') {
        if (usersContainer) usersContainer.classList.add('hidden');
        if (groupsContainer) groupsContainer.classList.remove('hidden');
        if (sectionTitle) sectionTitle.textContent = 'جروبات الفصل';
        if (sectionAction) {
            sectionAction.innerHTML = `
                <button onclick="openCreateGroupModal()" class="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-[11px] font-bold shadow-md transition-all flex items-center gap-1">
                    <i data-lucide="plus" class="w-3 h-3"></i>
                    <span>إنشاء جروب</span>
                </button>
            `;
            renderIcons();
        }
        renderGroupsList();
    } else {
        if (groupsContainer) groupsContainer.classList.add('hidden');
        if (usersContainer) usersContainer.classList.remove('hidden');
        if (sectionTitle) sectionTitle.textContent = 'زملاء الفصل والـ Streaks';
        if (sectionAction) {
            sectionAction.innerHTML = '<span class="text-micro text-cyan-400 font-normal flex items-center gap-1"><i data-lucide="zap" class="w-3 h-3"></i> تحديث حي</span>';
            renderIcons();
        }
        renderUsersList();
    }
}

function updateSidebarTabsUI(activeTab) {
    const tabGen = document.getElementById('tabGeneralBtn');
    const tabGroups = document.getElementById('tabGroupsBtn');
    const tabDirect = document.getElementById('tabDirectBtn');

    const activeClass = 'flex-1 py-1.5 text-[11px] font-bold rounded-lg bg-cyan-500 text-slate-950 transition-all';
    const activeGroupClass = 'flex-1 py-1.5 text-[11px] font-bold rounded-lg bg-purple-500 text-white transition-all flex items-center justify-center gap-1';
    const inactiveClass = 'flex-1 py-1.5 text-[11px] font-semibold rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1';

    if (tabGen) tabGen.className = activeTab === 'general' ? activeClass : inactiveClass;
    if (tabGroups) tabGroups.className = activeTab === 'groups' ? activeGroupClass : inactiveClass;
    if (tabDirect) tabDirect.className = activeTab === 'direct' ? activeClass : inactiveClass;
}

function toggleChatInputVisibility(visible) {
    const chatForm = document.getElementById('chatForm');
    const lockedNotice = document.getElementById('groupLockedNoticeBar');
    if (visible) {
        if (chatForm) chatForm.classList.remove('hidden');
        if (lockedNotice) lockedNotice.classList.add('hidden');
    } else {
        if (chatForm) chatForm.classList.add('hidden');
        if (lockedNotice) lockedNotice.classList.remove('hidden');
    }
}


function updateDirectStreakBadge(otherUserId) {
    if (!STATE.activeChat || STATE.activeChat.type !== 'direct' || !STATE.activeChat.recipient) return;
    if (otherUserId && STATE.activeChat.recipient.id !== otherUserId) return;

    const streak = STATE.streaks.find(s => s.other_user_id === STATE.activeChat.recipient.id);
    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) {
        if (streak && streak.streak_count > 0) {
            directBadge.innerHTML = `<i data-lucide="${streak.is_frozen ? 'snowflake' : 'flame'}" class="w-3 h-3 inline-block align-text-bottom"></i> استريك ${streak.streak_count} يوم`;
            renderIcons();
            directBadge.classList.remove('hidden');
            directBadge.classList.remove('scale-110');
            void directBadge.offsetWidth;
            directBadge.classList.add('scale-110', 'transition-transform');
            setTimeout(() => directBadge.classList.remove('scale-110'), 300);
        } else {
            directBadge.classList.add('hidden');
        }
    }
}

function selectGeneralChat() {
    stopTabTitleAlert();
    STATE.activeChat = { type: 'general', recipient: null, group: null };
    document.getElementById('currentChatTitle').textContent = 'شات الفصل العام (General)';
    document.getElementById('currentChatSubtitle').textContent = 'متاح لجميع الزملاء في الفصل';
    document.getElementById('currentChatAvatar').innerHTML = '<i data-lucide="globe" class="w-[18px] h-[18px] text-cyan-400"></i>';
    renderIcons();
    
    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) directBadge.classList.add('hidden');

    const groupControls = document.getElementById('groupHeaderControls');
    if (groupControls) {
        groupControls.classList.add('hidden');
        groupControls.classList.remove('flex');
    }

    toggleChatInputVisibility(true);
    switchSidebarTab('general');
    loadMessages();
}

function selectDirectChat(userId) {
    const target = STATE.users.find(u => u.id === userId);
    if (!target) return;

    // 1. Clear unread mark immediately ("سين")
    target.unread_count = 0;
    renderUsersList();

    // 2. Notify server that messages from this user are now read
    if (STATE.socket && STATE.user) {
        STATE.socket.emit('mark_messages_read', { senderId: target.id, recipientId: STATE.user.id });
    }
    stopTabTitleAlert();

    STATE.activeChat = { type: 'direct', recipient: target, group: null };
    document.getElementById('currentChatTitle').textContent = target.nickname;
    document.getElementById('currentChatSubtitle').textContent = STATE.onlineUserIds.has(target.id) ? 'متصل الآن' : 'غير متصل حالياً';
    document.getElementById('currentChatAvatar').innerHTML = renderAvatarHTML(target.avatar);

    const streak = STATE.streaks.find(s => s.other_user_id === target.id);
    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) {
        if (streak && streak.streak_count > 0) {
            directBadge.innerHTML = `<i data-lucide="${streak.is_frozen ? 'snowflake' : 'flame'}" class="w-3 h-3 inline-block align-text-bottom"></i> استريك ${streak.streak_count} يوم`;
            renderIcons();
            directBadge.classList.remove('hidden');
        } else {
            directBadge.classList.add('hidden');
        }
    }

    const groupControls = document.getElementById('groupHeaderControls');
    if (groupControls) {
        groupControls.classList.add('hidden');
        groupControls.classList.remove('flex');
    }

    toggleChatInputVisibility(true);
    switchSidebarTab('direct');
    loadMessages();
}

function selectGroupChat(groupId) {
    stopTabTitleAlert();
    const target = STATE.groups.find(g => g.id === groupId);
    if (!target) return;

    STATE.activeChat = { type: 'group', recipient: null, group: target };
    document.getElementById('currentChatTitle').textContent = target.name;
    const memberCount = target.members_count || (target.members ? target.members.length : 0);
    const isMember = target.is_member === true;
    const isCreator = STATE.user && (target.creator_id === STATE.user.id || STATE.user.role === 'admin');

    if (isMember) {
        document.getElementById('currentChatSubtitle').textContent = `${memberCount} أعضاء • أنشأه: ${target.creator_name || 'زميلك'}`;
    } else {
        document.getElementById('currentChatSubtitle').textContent = `جروب خاص • ${memberCount} أعضاء • المشرف: ${target.creator_name || 'زميلك'}`;
    }
    document.getElementById('currentChatAvatar').innerHTML = `<span class="text-2xl">${target.icon || '👥'}</span>`;

    const directBadge = document.getElementById('directStreakBadge');
    if (directBadge) directBadge.classList.add('hidden');

    // Show Group Header Controls only if user is a member
    const groupControls = document.getElementById('groupHeaderControls');
    const membersCountEl = document.getElementById('groupHeaderMembersCount');
    const deleteBtn = document.getElementById('groupHeaderDeleteBtn');
    const reqBtn = document.getElementById('groupHeaderJoinRequestsBtn');
    const reqCount = document.getElementById('groupHeaderJoinRequestsCount');

    if (isMember) {
        if (groupControls) {
            groupControls.classList.remove('hidden');
            groupControls.classList.add('flex');
        }
        if (membersCountEl) {
            membersCountEl.textContent = `${memberCount}`;
        }
        if (deleteBtn) {
            if (isCreator) {
                deleteBtn.classList.remove('hidden');
            } else {
                deleteBtn.classList.add('hidden');
            }
        }
        if (reqBtn) {
            if (isCreator) {
                reqBtn.classList.remove('hidden');
                if (reqCount) {
                    reqCount.textContent = target.pending_requests_count || 0;
                }
            } else {
                reqBtn.classList.add('hidden');
            }
        }
        toggleChatInputVisibility(true);
    } else {
        // Non-member: strictly hide group controls
        if (groupControls) {
            groupControls.classList.add('hidden');
            groupControls.classList.remove('flex');
        }
        toggleChatInputVisibility(false);
    }

    switchSidebarTab('groups');
    loadMessages();
}

// ----------------------------------------------------
// 4c. Classroom Groups Management & APIs
// ----------------------------------------------------
async function loadGroups() {
    if (!STATE.user) return;
    try {
        const res = await fetch(`/api/groups?userId=${encodeURIComponent(STATE.user.id)}`);
        const data = await res.json();
        STATE.groups = data.groups || [];
        
        const countBadge = document.getElementById('groupsCountBadge');
        if (countBadge) {
            countBadge.textContent = STATE.groups.length;
            if (STATE.groups.length > 0) {
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
            }
        }

        renderGroupsList();
    } catch (err) {
        console.error('Failed to load groups:', err);
    }
}

function renderGroupsList() {
    const container = document.getElementById('groupsListContainer');
    if (!container) return;

    if (STATE.groups.length === 0) {
        container.innerHTML = `
            <div class="p-4 text-center">
                <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-2xl flex items-center justify-center mx-auto mb-2 text-purple-400">
                    👥
                </div>
                <h4 class="text-xs font-bold text-white mb-1">لا توجد جروبات بعد</h4>
                <p class="text-micro text-slate-400 mb-3">أنشئ أول جروب في الفصل واجمع أصحابك وشلتك!</p>
                <button onclick="openCreateGroupModal()" class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-xs font-black shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5">
                    <span>✨</span>
                    <span>إنشاء أول جروب الآن</span>
                </button>
            </div>
        `;
        return;
    }

    let html = `
        <button onclick="openCreateGroupModal()" class="w-full p-2 rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm mb-1.5">
            <span>✨</span>
            <span>إنشاء جروب جديد (Create Group)</span>
            <span>➕</span>
        </button>
    `;

    STATE.groups.forEach(g => {
        const isSelected = STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === g.id;
        const memberCount = g.members_count || (g.members ? g.members.length : 0);
        const isCreator = STATE.user && (g.creator_id === STATE.user.id || STATE.user.role === 'admin');
        const isMember = g.is_member === true;
        const isPending = g.request_status === 'pending';
        const pendingCount = g.pending_requests_count || 0;

        let statusBadge = '';
        if (isCreator) {
            statusBadge = '<span class="text-micro px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">مؤسس 👑</span>';
        } else if (isMember) {
            statusBadge = '<span class="text-micro px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">عضو ✅</span>';
        } else if (isPending) {
            statusBadge = '<span class="text-micro px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">معلق</span>';
        } else {
            statusBadge = '<span class="text-micro px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-bold border border-slate-700">🔒 خاص</span>';
        }

        let pendingBadge = '';
        if (isCreator && pendingCount > 0) {
            pendingBadge = `<span class="text-micro px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black animate-pulse shadow-sm" title="${pendingCount} طلبات معلقة">${pendingCount}</span>`;
        }

        html += `
            <div onclick="selectGroupChat('${g.id}')" class="flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${isSelected ? 'bg-purple-500/20 border border-purple-500/40 shadow-md' : 'hover:bg-slate-800/60 border border-transparent'}">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-10 h-10 rounded-2xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-xl shrink-0 shadow">
                        ${g.icon || '👥'}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <h4 class="text-xs font-bold text-white truncate">${escapeHtml(g.name)}</h4>
                            ${statusBadge}
                        </div>
                        <p class="text-micro text-slate-400 truncate">${g.description ? escapeHtml(g.description) : `${memberCount} أعضاء في الجروب`}</p>
                    </div>
                </div>
                <div class="shrink-0 flex items-center gap-1">
                    ${pendingBadge}
                    <span class="text-micro px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">${memberCount} 👤</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function openCreateGroupModal() {
    if (!STATE.user) {
        showNotification('يجب تسجيل الدخول أولاً!');
        return;
    }
    const nameInput = document.getElementById('createGroupNameInput');
    const descInput = document.getElementById('createGroupDescInput');
    const iconInput = document.getElementById('createGroupIconInput');

    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (iconInput) iconInput.value = '👥';

    const searchInput = document.getElementById('groupMemberSearchInput');
    if (searchInput) searchInput.value = '';

    renderGroupMembersCheckboxes();
    showModal('createGroupModal');
    if (nameInput) setTimeout(() => nameInput.focus(), 150);
}

function setGroupIcon(icon) {
    const input = document.getElementById('createGroupIconInput');
    if (input) input.value = icon;
}

function renderGroupMembersCheckboxes(filterText = '') {
    const container = document.getElementById('groupMembersSelectionContainer');
    if (!container) return;

    // Filter out current user from selection list
    let availableUsers = STATE.users.filter(u => u.id !== STATE.user.id);
    if (filterText.trim()) {
        const q = filterText.trim().toLowerCase();
        availableUsers = availableUsers.filter(u => u.nickname.toLowerCase().includes(q));
    }

    if (availableUsers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-slate-500 text-xs">
                ${filterText ? 'لا يوجد زملاء مطابقين للبحث' : 'لا يوجد زملاء آخرين مسجلين في الفصل بعد! شاركهم رابط الدخول أولاً.'}
            </div>
        `;
        return;
    }

    container.innerHTML = availableUsers.map(u => {
        const isOnline = STATE.onlineUserIds.has(u.id);
        return `
            <label class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 cursor-pointer border border-transparent hover:border-white/5 transition-all">
                <div class="flex items-center gap-2.5 min-w-0">
                    <input type="checkbox" name="groupMemberCheckbox" value="${u.id}" onchange="updateSelectedMembersCount()" class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 accent-purple-500">
                    <div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0 overflow-hidden">
                        ${renderAvatarHTML(u.avatar)}
                    </div>
                    <span class="text-xs font-bold text-white truncate">${escapeHtml(u.nickname)}</span>
                </div>
                <span class="text-micro px-1.5 py-0.5 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}">
                    ${isOnline ? 'متصل' : 'غير متصل'}
                </span>
            </label>
        `;
    }).join('');

    updateSelectedMembersCount();
}

function filterGroupMembersList(val) {
    renderGroupMembersCheckboxes(val);
}

function updateSelectedMembersCount() {
    const checked = document.querySelectorAll('input[name="groupMemberCheckbox"]:checked');
    const badge = document.getElementById('selectedMembersCountBadge');
    if (badge) {
        badge.textContent = `${checked.length} مختار`;
    }
}

function toggleSelectAllGroupMembers() {
    const checkboxes = document.querySelectorAll('input[name="groupMemberCheckbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    const btn = document.getElementById('selectAllMembersBtn');
    if (btn) {
        btn.textContent = allChecked ? 'تحديد الكل' : 'إلغاء التحديد';
    }
    updateSelectedMembersCount();
}

async function handleCreateGroupSubmit(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById('createGroupNameInput');
    const descInput = document.getElementById('createGroupDescInput');
    const iconInput = document.getElementById('createGroupIconInput');
    const btn = document.getElementById('submitCreateGroupBtn');

    const name = nameInput ? nameInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';
    const icon = iconInput ? iconInput.value.trim() || '👥' : '👥';

    if (!name) {
        showNotification('الرجاء كتابة اسم الجروب أولاً!');
        return;
    }

    const checkedBoxes = document.querySelectorAll('input[name="groupMemberCheckbox"]:checked');
    const memberIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'جاري الإنشاء...';
    }

    try {
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                icon,
                description,
                creatorId: STATE.user.id,
                memberIds
            })
        });

        const data = await res.json();
        if (data.success && data.group) {
            hideModal('createGroupModal');
            showNotification(`🎉 تم إنشاء جروب "${data.group.name}" بنجاح!`);
            await loadGroups();
            selectGroupChat(data.group.id);
        } else {
            showNotification(data.error || 'فشل إنشاء الجروب');
        }
    } catch (err) {
        showNotification('حدث خطأ أثناء إنشاء الجروب');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>إنشاء الجروب</span>';
        }
    }
}

async function handleDeleteCurrentGroup() {
    const grp = STATE.activeChat.group;
    if (!grp || !STATE.user) return;

    if (!confirm(`هل أنت متأكد من حذف الجروب "${grp.name}" نهائياً من الفصل؟`)) {
        return;
    }

    try {
        const res = await fetch(`/api/groups/${grp.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user.id })
        });
        const data = await res.json();
        if (data.success) {
            showNotification(`تم حذف الجروب "${grp.name}".`);
            await loadGroups();
            selectGeneralChat();
        } else {
            showNotification(data.error || 'تعذر حذف الجروب!');
        }
    } catch (err) {
        showNotification('حدث خطأ أثناء حذف الجروب.');
    }
}

function renderGroupLockedView(grp) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    toggleChatInputVisibility(false);

    const isPending = grp.request_status === 'pending';
    const isRejected = grp.request_status === 'rejected';

    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center p-6 text-center max-w-sm sm:max-w-md mx-auto my-auto">
            <div class="relative mb-4">
                <div class="w-20 h-20 rounded-3xl bg-purple-950/60 border-2 border-purple-500/40 flex items-center justify-center text-4xl shadow-2xl shadow-purple-500/10">
                    ${grp.icon || '👥'}
                </div>
                <div class="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-xs shadow-md">
                    🔒
                </div>
            </div>

            <div class="flex items-center gap-2 mb-1.5">
                <h3 class="text-base sm:text-lg font-black text-white">${escapeHtml(grp.name)}</h3>
                <span class="text-micro px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">خاص 🛡️</span>
            </div>

            <p class="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
                ${grp.description ? escapeHtml(grp.description) : 'هذا الجروب خاص بالأعضاء المعتمدين فقط. لا يمكنك قراءة الرسائل أو مشاهدة الأعضاء حتى يقبلك المشرف.'}
            </p>

            <div class="p-3 bg-slate-950/70 rounded-2xl border border-white/5 w-full mb-5 text-xs text-slate-300 space-y-2">
                <div class="flex justify-between items-center pb-1.5 border-b border-white/5">
                    <span class="text-slate-400">👑 منشئ الجروب:</span>
                    <span class="font-bold text-white">${escapeHtml(grp.creator_name || 'زميلك')}</span>
                </div>
                <div class="flex justify-between items-center pb-1.5 border-b border-white/5">
                    <span class="text-slate-400">👥 عدد الأعضاء:</span>
                    <span class="font-mono font-bold text-purple-400">${grp.members_count || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-400">🛡️ حالة الانضمام:</span>
                    ${isPending ? `
                        <span class="text-amber-400 font-bold flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                            قيد المراجعة
                        </span>
                    ` : isRejected ? `
                        <span class="text-red-400 font-bold">مرفوض ❌</span>
                    ` : `
                        <span class="text-slate-400 font-medium">غير منضم</span>
                    `}
                </div>
            </div>

            ${isPending ? `
                <div class="w-full py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex flex-col items-center gap-1.5 shadow-lg shadow-amber-500/5">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        <span>تم إرسال طلب الانضمام للمشرف!</span>
                    </div>
                    <p class="text-micro text-amber-200/70 font-normal">بمجرد موافقة ${escapeHtml(grp.creator_name || 'المشرف')}، سيفتح الشات تلقائياً هنا 🚀</p>
                </div>
            ` : isRejected ? `
                <div class="w-full space-y-2">
                    <div class="py-2.5 px-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5">
                        <i data-lucide="triangle-alert" class="w-3.5 h-3.5 shrink-0"></i> رفض منشئ الجروب طلب انضمامك السابق.
                    </div>
                    <button id="sendJoinReqBtn" onclick="sendGroupJoinRequest('${grp.id}')" class="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="send" class="w-[14px] h-[14px]"></i>
                        <span>إعادة إرسال طلب انضمام</span>
                    </button>
                </div>
            ` : `
                <button id="sendJoinReqBtn" onclick="sendGroupJoinRequest('${grp.id}')" class="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-400 hover:to-pink-400 text-white font-black text-xs shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <i data-lucide="send" class="w-[14px] h-[14px]"></i>
                    <span>إرسال طلب انضمام للمشرف (Join Request)</span>
                </button>
            `}
        </div>
    `;
    renderIcons();
}

async function sendGroupJoinRequest(groupId) {
    if (!STATE.user) {
        showNotification('يجب تسجيل الدخول أولاً!');
        return;
    }
    const btn = document.getElementById('sendJoinReqBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>جاري الإرسال...</span>';
    }

    try {
        const res = await fetch(`/api/groups/${groupId}/join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user.id })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification(data.message || 'تم إرسال طلب الانضمام للمشرف!');
            const g = STATE.groups.find(item => item.id === groupId);
            if (g) {
                g.request_status = 'pending';
            }
            if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === groupId) {
                STATE.activeChat.group.request_status = 'pending';
                renderGroupLockedView(STATE.activeChat.group);
            }
            renderGroupsList();
        } else {
            showNotification(data.error || 'فشل إرسال طلب الانضمام!');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>إرسال طلب انضمام</span>';
            }
        }
    } catch (err) {
        console.error('sendGroupJoinRequest error:', err);
        showNotification('حدث خطأ أثناء الاتصال بالخادم!');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>إرسال طلب انضمام</span>';
        }
    }
}

async function openGroupJoinRequestsModal() {
    const grp = STATE.activeChat.group;
    if (!grp || !STATE.user) return;

    const listEl = document.getElementById('groupJoinRequestsListContainer');
    const subtitleEl = document.getElementById('groupJoinRequestsSubtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `طلبات الانضمام لجروب "${grp.name}"`;
    }
    if (listEl) {
        listEl.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">جاري تحميل الطلبات...</div>';
    }

    showModal('groupJoinRequestsModal');
    await loadGroupJoinRequests(grp.id);
}

async function loadGroupJoinRequests(groupId) {
    if (!STATE.user) return;
    const listEl = document.getElementById('groupJoinRequestsListContainer');
    try {
        const res = await fetch(`/api/groups/${groupId}/join-requests?userId=${encodeURIComponent(STATE.user.id)}`);
        const data = await res.json();
        if (!res.ok) {
            if (listEl) listEl.innerHTML = `<div class="text-center py-4 text-red-400 text-xs">${data.error || 'تعذر تحميل الطلبات!'}</div>`;
            return;
        }

        const requests = data.requests || [];
        const reqBadge = document.getElementById('groupHeaderJoinRequestsCount');
        const reqBtn = document.getElementById('groupHeaderJoinRequestsBtn');
        if (reqBadge) reqBadge.textContent = requests.length;
        if (reqBtn) {
            if (requests.length > 0) reqBtn.classList.remove('hidden');
        }
        if (STATE.activeChat.type === 'group' && STATE.activeChat.group?.id === groupId) {
            STATE.activeChat.group.pending_requests_count = requests.length;
        }

        if (requests.length === 0) {
            if (listEl) {
                listEl.innerHTML = `
                    <div class="text-center py-8 text-slate-400 text-xs">
                        <span class="text-3xl block mb-2">🎉</span>
                        <p class="font-bold text-white mb-1">لا توجد طلبات انضمام معلقة</p>
                        <p class="text-micro text-slate-500">سيظهر هنا أي زميل يطلب الانضمام لهذا الجروب للموافقة عليه أو رفضه.</p>
                    </div>
                `;
            }
            return;
        }

        if (listEl) {
            listEl.innerHTML = requests.map(r => `
                <div id="join-request-row-${r.id}" class="p-3 rounded-2xl bg-slate-900/80 border border-white/5 flex flex-col gap-2.5">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                                ${renderAvatarHTML(r.avatar || r.user_avatar)}
                            </div>
                            <div class="min-w-0">
                                <h5 class="text-xs font-bold text-white truncate">${escapeHtml(r.nickname || r.user_name)}</h5>
                                <span class="text-micro text-slate-400">طلب الانضمام: ${new Date(r.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-1 border-t border-white/5">
                        <button onclick="handleRespondJoinRequest('${groupId}', '${r.id}', 'accept')" class="flex-1 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                            <span>✅ قبول</span>
                        </button>
                        <button onclick="handleRespondJoinRequest('${groupId}', '${r.id}', 'reject')" class="flex-1 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                            <span>❌ رفض</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('loadGroupJoinRequests error:', err);
        if (listEl) listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-xs">تعذر تحميل الطلبات!</div>';
    }
}

async function handleRespondJoinRequest(groupId, requestId, action) {
    if (!STATE.user) return;
    const rowEl = document.getElementById(`join-request-row-${requestId}`);
    if (rowEl) {
        rowEl.style.opacity = '0.5';
        rowEl.style.pointerEvents = 'none';
    }

    try {
        const res = await fetch(`/api/groups/${groupId}/join-requests/${requestId}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: STATE.user.id,
                action: action
            })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification(action === 'accept' ? '✅ تم قبول الزميل في الجروب بنجاح!' : '❌ تم رفض طلب الانضمام.');
            await loadGroupJoinRequests(groupId);
            await loadGroups();
        } else {
            showNotification(data.error || 'حدث خطأ أثناء معالجة الطلب');
            if (rowEl) {
                rowEl.style.opacity = '1';
                rowEl.style.pointerEvents = 'auto';
            }
        }
    } catch (err) {
        console.error('handleRespondJoinRequest error:', err);
        showNotification('حدث خطأ في الاتصال بالخادم');
        if (rowEl) {
            rowEl.style.opacity = '1';
            rowEl.style.pointerEvents = 'auto';
        }
    }
}

async function openGroupMembersModal() {
    const grp = STATE.activeChat.group;
    if (!grp) return;
    if (!grp.is_member) {
        showNotification('🔒 لا يمكنك عرض الأعضاء لأنك لست عضواً في هذا الجروب!');
        return;
    }

    const iconEl = document.getElementById('groupInfoModalIcon');
    const titleEl = document.getElementById('groupInfoModalTitle');
    const descEl = document.getElementById('groupInfoModalDesc');
    const listEl = document.getElementById('groupMembersListModalContainer');

    if (iconEl) iconEl.textContent = grp.icon || '👥';
    if (titleEl) titleEl.textContent = grp.name;
    if (descEl) descEl.textContent = grp.description || `أنشئ بواسطة: ${grp.creator_name || 'زميلك'}`;

    if (listEl) {
        listEl.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">جاري تحميل الأعضاء...</div>';
    }

    showModal('groupMembersModal');

    try {
        const uId = STATE.user ? STATE.user.id : '';
        const res = await fetch(`/api/groups/${grp.id}/members?userId=${encodeURIComponent(uId)}`);
        const data = await res.json();
        const members = data.members || [];

        if (listEl) {
            listEl.innerHTML = members.map(m => {
                const isOnline = STATE.onlineUserIds.has(m.id);
                const isCreator = m.group_role === 'creator';
                return `
                    <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0 overflow-hidden">
                                ${renderAvatarHTML(m.avatar)}
                            </div>
                            <div class="min-w-0">
                                <h5 class="text-xs font-bold text-white truncate">${escapeHtml(m.nickname)}</h5>
                                <span class="text-micro text-purple-300 font-bold">${isCreator ? 'مؤسس الجروب 👑' : 'عضو في الجروب'}</span>
                            </div>
                        </div>
                        <span class="text-micro px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}">
                            ${isOnline ? 'متصل' : 'أوفلاين'}
                        </span>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        if (listEl) listEl.innerHTML = '<div class="text-center py-4 text-red-400 text-xs">تعذر تحميل الأعضاء!</div>';
    }
}

// ----------------------------------------------------
// 5. Messages Feed & Actions
// ----------------------------------------------------
async function loadMessages() {
    if (STATE.activeChat.type === 'group' && STATE.activeChat.group) {
        if (!STATE.activeChat.group.is_member) {
            renderGroupLockedView(STATE.activeChat.group);
            return;
        }
    }
    toggleChatInputVisibility(true);

    try {
        const params = new URLSearchParams({
            chat_type: STATE.activeChat.type,
            user_id: STATE.user ? STATE.user.id : ''
        });
        if (STATE.activeChat.type === 'direct' && STATE.activeChat.recipient) {
            params.append('recipient_id', STATE.activeChat.recipient.id);
        }
        if (STATE.activeChat.type === 'group' && STATE.activeChat.group) {
            params.append('group_id', STATE.activeChat.group.id);
        }

        const res = await fetch(`/api/messages?${params.toString()}`);
        if (res.status === 403) {
            const errData = await res.json().catch(() => ({}));
            if (STATE.activeChat.group) {
                STATE.activeChat.group.is_member = false;
                if (errData.request_status) {
                    STATE.activeChat.group.request_status = errData.request_status;
                }
                renderGroupLockedView(STATE.activeChat.group);
            }
            return;
        }
        const data = await res.json();
        STATE.messages = Array.isArray(data) ? data : [];
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
    const isDirectChat = m.chat_type === 'direct' || STATE.activeChat?.type === 'direct';
    const readCheckHTML = (isMe && isDirectChat)
        ? `<span class="msg-read-check text-[11px] font-bold ${m.is_read ? 'text-cyan-400' : 'text-slate-400'}" title="${m.is_read ? 'تمت القراءة (سين) ✓✓' : 'تم الإرسال ✓'}">${m.is_read ? '✓✓' : '✓'}</span>`
        : '';

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
                        <span class="text-micro text-slate-400">ملاحظة صوتية 🎙️</span>
                    </div>
                </div>
            `;
        } else {
            mediaHTML = `
                <a href="${m.media_url}" download="${m.media_name || 'file'}" class="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-white/10 hover:border-cyan-500/40 transition-all text-xs">
                    <span class="text-xl">📁</span>
                    <div class="flex-1 truncate">
                        <p class="font-bold text-white truncate">${escapeHtml(m.media_name || 'ملف مرفق')}</p>
                        <p class="text-micro text-slate-400">${(m.media_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <span class="text-cyan-400 font-bold">📥</span>
                </a>
            `;
        }
    }

    const disappearingBadge = m.is_disappearing ? `
        <span class="inline-flex items-center gap-1 text-micro px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 burn-pulse">
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
                    ${m.sender_role === 'admin' ? '<span class="text-micro px-1 rounded bg-amber-500/20 text-amber-400 font-black">👑 الأدمن</span>' : ''}
                    ${disappearingBadge}
                    <span class="text-micro text-slate-500 en-text inline-flex items-center gap-1">${time} ${readCheckHTML}</span>
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
            <span class="text-micro font-bold text-slate-400">${count}</span>
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

    if (STATE.activeChat.type === 'group' && STATE.activeChat.group && !STATE.activeChat.group.is_member) {
        showNotification('🔒 هذا الجروب مغلق! لا يمكنك إرسال رسائل قبل قبول طلب انضمامك.');
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

    if (STATE.activeChat.type === 'group' && STATE.activeChat.group && !STATE.activeChat.group.is_member) {
        showNotification('🔒 هذا الجروب مغلق! لا يمكنك إرسال رسائل قبل قبول طلب انضمامك.');
        return;
    }

    let recipientId = null;
    if (STATE.activeChat.type === 'direct') {
        recipientId = STATE.activeChat.recipient?.id;
    } else if (STATE.activeChat.type === 'group') {
        recipientId = STATE.activeChat.group?.id;
    }

    STATE.socket.emit('send_message', {
        senderId: STATE.user.id,
        recipientId,
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

    if (avatarEl) avatarEl.innerHTML = renderAvatarHTML(currentViewingGroup.authorAvatar);
    if (nameEl) nameEl.textContent = currentViewingGroup.authorName;
    updateStoryViewsDisplay(story.views_count || 1);

    // Fetch fresh live views count from server
    fetch(`/api/stories/${story.id}/views`).then(r => r.json()).then(data => {
        if (data.viewers) {
            updateStoryViewsDisplay(data.viewers.length);
        }
    }).catch(() => {});

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

function updateStoryViewsDisplay(count) {
    const badge = document.getElementById('storyViewersBadge');
    const bottomLabel = document.getElementById('storyViewersBottomBtnText');
    const displayCount = count !== undefined ? count : 1;
    if (badge) { badge.innerHTML = `<i data-lucide="eye" class="w-3 h-3"></i> ${displayCount} مشاهدة`; renderIcons(); }
    if (bottomLabel) bottomLabel.textContent = `المشاهدات (${displayCount}) • اضغط لرؤية من شاهد الاستوري`;
}

// 7b. Story Viewers Modal (👀 مين شاف الاستوري)
async function openStoryViewsModal() {
    if (!currentViewingGroup) return;
    const story = currentViewingGroup.stories[activeStoryIndex];
    if (!story) return;

    const listEl = document.getElementById('storyViewersList');
    const countEl = document.getElementById('storyViewsModalCount');
    if (!listEl) return;

    listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">جاري تحميل المشاهدات...</div>`;
    showModal('storyViewsModal');

    try {
        const res = await fetch(`/api/stories/${story.id}/views`);
        const data = await res.json();
        const viewers = data.viewers || [];

        if (countEl) countEl.textContent = viewers.length;
        updateStoryViewsDisplay(viewers.length);

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
                                ${v.role === 'admin' ? '<span class="text-micro px-1 rounded bg-amber-500/20 text-amber-400 font-black">👑 أدمن</span>' : ''}
                            </div>
                            <span class="text-micro text-slate-400 block">${timeAgo}</span>
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
        container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">لا توجد ملفات مرفوعة على AirDrop بعد. اسحب ملفك وشاركه الآن!</div>`;
        return;
    }

    container.innerHTML = STATE.airdropFiles.map(f => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/30 transition-all">
            <div class="flex items-center gap-3">
                <i data-lucide="package" class="w-5 h-5 text-cyan-400 shrink-0"></i>
                <div>
                    <h4 class="text-sm font-bold text-white truncate max-w-xs">${escapeHtml(f.file_name)}</h4>
                    <p class="text-[11px] text-slate-400">بواسطة: ${escapeHtml(f.sender_name)} • ${(f.file_size / (1024*1024)).toFixed(2)} MB</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span id="airdrop-dl-${f.id}" class="text-xs text-slate-400 flex items-center gap-1"><i data-lucide="download" class="w-3 h-3"></i> ${f.downloads_count || 0}</span>
                <a href="${f.file_url}" download="${f.file_name}" onclick="recordAirDropDownload('${f.id}')" class="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-1">
                    <span>تحميل فوري</span>
                    <i data-lucide="zap" class="w-3 h-3"></i>
                </a>
            </div>
        </div>
    `).join('');
    renderIcons();
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
            ind.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>متصل ومتزامن</span>';
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
        statusPill.textContent = isPresenter ? 'أنت تبث الآن' : 'بث حي مباشر';
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
        label.textContent = 'مشاهدة البث';
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
    const iconOn = document.getElementById('screenShareAudioIconOn');
    const iconOff = document.getElementById('screenShareAudioIconOff');
    if (!videoEl || !iconOn || !iconOff) return;
    videoEl.muted = !videoEl.muted;
    iconOn.classList.toggle('hidden', videoEl.muted);
    iconOff.classList.toggle('hidden', !videoEl.muted);
    showNotification(videoEl.muted ? 'تم كتم صوت البث' : 'تم تفعيل صوت البث');
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
            textEl.textContent = `${shareInfo.presenterName} بدأ بث شاشته الآن! اضغط لمشاهدة البث مباشرة جنب الشات.`;
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
// 9d. Synchronized Classroom Music Library & Online Jukebox 🎵⚡ (LAN + Online Stream)
// ----------------------------------------------------

let currentMusicTab = 'online';

function switchMusicModalTab(tab) {
    currentMusicTab = tab;
    const onlineBtn = document.getElementById('onlineMusicTabBtn');
    const localBtn = document.getElementById('localMusicTabBtn');
    const onlinePanel = document.getElementById('onlineMusicTabPanel');
    const localPanel = document.getElementById('localMusicTabPanel');

    if (tab === 'online') {
        if (onlineBtn) {
            onlineBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/40 shadow-sm';
        }
        if (localBtn) {
            localBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white border border-transparent';
        }
        if (onlinePanel) onlinePanel.classList.remove('hidden');
        if (localPanel) localPanel.classList.add('hidden');
        setTimeout(() => {
            const inp = document.getElementById('onlineMusicSearchInput');
            if (inp) inp.focus();
        }, 100);
    } else {
        if (localBtn) {
            localBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/40 shadow-sm';
        }
        if (onlineBtn) {
            onlineBtn.className = 'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white border border-transparent';
        }
        if (localPanel) localPanel.classList.remove('hidden');
        if (onlinePanel) onlinePanel.classList.add('hidden');
        loadMusicLibrary();
        setTimeout(() => {
            const inp = document.getElementById('musicSearchInput');
            if (inp) inp.focus();
        }, 100);
    }
}


// ====================================================
// 📻 CAIRO HOLY QURAN RADIO BROADCAST SYSTEM
// ====================================================
// The live Quran stream now always arrives through our own server at
// /api/quran/live-relay (same-origin LAN request), which the server keeps alive and
// reconnects to the real radio source behind the scenes. The browser never talks to
// the blocked external radio domains directly anymore, so no client-side URL cycling
// is needed - just retry the one relay URL if playback hiccups.
let quranRelayRetryCount = 0;

let quranLibraryReciters = [];
let quranLibrarySurahs = [];

function openHolyQuranRadioModal() {
    showModal('holyQuranRadioModal');
    loadQuranLibraryPickers();
}

function openHolyQuranOfficialSite() {
    window.open('https://www.holyquranradio.com/', '_blank');
}

function toggleBroadcastQuranRadio() {
    openHolyQuranRadioModal();
}

async function loadQuranLibraryPickers() {
    const chipsEl = document.getElementById('quranReciterChips');
    const selectEl = document.getElementById('quranSurahSelect');
    if (!chipsEl || !selectEl) return;

    try {
        if (quranLibraryReciters.length === 0) {
            const r = await fetch('/api/quran/library/reciters').then(res => res.json());
            quranLibraryReciters = r.reciters || [];
        }
        if (quranLibrarySurahs.length === 0) {
            const s = await fetch('/api/quran/library/surahs').then(res => res.json());
            quranLibrarySurahs = s.surahs || [];
        }
    } catch (e) {
        console.warn('Failed to load Quran library lists:', e);
        return;
    }

    if (!chipsEl.dataset.populated) {
        chipsEl.innerHTML = quranLibraryReciters.map((r, i) => `
            <button type="button" onclick="selectQuranReciter('${r.id}')" data-reciter-chip="${r.id}"
                class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${i === 0 ? 'bg-amber-500/25 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}">
                ${r.name}
            </button>
        `).join('');
        chipsEl.dataset.populated = '1';
        chipsEl.dataset.selected = quranLibraryReciters[0]?.id || '';
    }
    if (!selectEl.dataset.populated) {
        selectEl.innerHTML = quranLibrarySurahs.map(s => `<option value="${s.number}">${s.number}. ${s.name}</option>`).join('');
        selectEl.dataset.populated = '1';
        enhanceSelect('quranSurahSelect');
    } else {
        refreshSelectLabel('quranSurahSelect');
    }
}

function selectQuranReciter(reciterId) {
    const chipsEl = document.getElementById('quranReciterChips');
    if (!chipsEl) return;
    chipsEl.dataset.selected = reciterId;
    chipsEl.querySelectorAll('[data-reciter-chip]').forEach(btn => {
        const active = btn.dataset.reciterChip === reciterId;
        btn.className = `shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? 'bg-amber-500/25 border-amber-400 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`;
    });
}

function getSelectedQuranChoice() {
    const chipsEl = document.getElementById('quranReciterChips');
    const selectEl = document.getElementById('quranSurahSelect');
    const reciterId = chipsEl?.dataset.selected || quranLibraryReciters[0]?.id;
    const surahNumber = selectEl?.value || 1;
    return { reciterId, surahNumber };
}

async function broadcastQuranLibrarySelection() {
    const { reciterId, surahNumber } = getSelectedQuranChoice();
    if (!reciterId) return;
    try {
        const res = await fetch('/api/quran/library/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reciterId, surahNumber, userName: STATE.user ? STATE.user.nickname : 'المشرف' })
        }).then(r => r.json());
        if (res.success) {
            showNotification(`جاري بث ${res.track.title} لكل الفصل`);
            hideModal('holyQuranRadioModal');
        } else {
            showNotification('تعذر بدء البث');
        }
    } catch (e) {
        showNotification('تعذر الاتصال بالسيرفر');
    }
}

function stopQuranLibraryBroadcast() {
    fetch('/api/quran/library/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
    }).catch(() => {});
    showNotification('تم إيقاف البث لجميع الأجهزة');
}

// ---- Local-only playback: plays on THIS device only, completely separate from the
// classroom-wide synced radio bar. Uses its own <audio> element and small floating bar. ----
let localOnlyAudioEl = null;

function getLocalOnlyAudioElement() {
    if (!localOnlyAudioEl) {
        localOnlyAudioEl = new Audio();
        localOnlyAudioEl.addEventListener('ended', () => hideLocalOnlyBar());
    }
    return localOnlyAudioEl;
}

function playLocalOnlyAudio(url, title) {
    const audio = getLocalOnlyAudioElement();
    audio.src = url;
    audio.play().catch(e => console.warn('Local-only playback error:', e));
    showLocalOnlyBar(title);
}

function showLocalOnlyBar(title) {
    let bar = document.getElementById('localOnlyPlayerBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'localOnlyPlayerBar';
        bar.className = 'fixed bottom-4 start-4 z-[70] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl';
        document.body.appendChild(bar);
    }
    bar.innerHTML = `
        <i data-lucide="headphones" class="w-[15px] h-[15px] text-slate-300"></i>
        <span class="text-xs font-bold text-white max-w-[160px] truncate">${title}</span>
        <span class="text-micro text-slate-500">عندك بس</span>
        <button type="button" onclick="stopLocalOnlyAudio()" class="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center">
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>
    `;
    bar.classList.remove('hidden');
    renderIcons();
}

function hideLocalOnlyBar() {
    const bar = document.getElementById('localOnlyPlayerBar');
    if (bar) bar.classList.add('hidden');
}

function stopLocalOnlyAudio() {
    if (localOnlyAudioEl) {
        localOnlyAudioEl.pause();
        localOnlyAudioEl.removeAttribute('src');
    }
    hideLocalOnlyBar();
}

function playQuranLibraryLocalOnly() {
    const { reciterId, surahNumber } = getSelectedQuranChoice();
    if (!reciterId) return;
    const surah = quranLibrarySurahs.find(s => String(s.number) === String(surahNumber));
    const reciter = quranLibraryReciters.find(r => r.id === reciterId);
    const url = `/api/quran/library/stream?reciter=${encodeURIComponent(reciterId)}&surah=${surahNumber}`;
    playLocalOnlyAudio(url, `سورة ${surah ? surah.name : ''} — ${reciter ? reciter.name : ''}`);
    hideModal('holyQuranRadioModal');
}

function handleRadioAudioError(e) {
    const audio = STATE.radio.audioEl;
    if (!audio || !STATE.radio.activeTrack) return;

    if (STATE.radio.activeTrack.id === 'quran_cairo_live') {
        quranRelayRetryCount++;
        if (quranRelayRetryCount <= 5) {
            // The server-side relay auto-reconnects to the real radio source on its own;
            // we just need to re-attach to our own LAN endpoint after a short pause.
            console.warn(`[Quran Radio] Relay hiccup, retrying (${quranRelayRetryCount}/5)...`);
            setTimeout(() => {
                if (STATE.radio.activeTrack && STATE.radio.activeTrack.id === 'quran_cairo_live' && STATE.radio.isPlaying) {
                    audio.src = '/api/quran/live-relay?t=' + Date.now();
                    audio.load();
                    audio.play().catch(err => console.warn('Relay retry play error:', err));
                }
            }, 1200);
        } else {
            console.warn('[Quran Radio] Relay still unreachable after several retries.');
            showNotification('⚠️ تعذر تشغيل الصوت المباشر تلقائياً؛ يمكنك فتح موقع holyquranradio.com مباشرة ↗');
            openHolyQuranRadioModal();
        }
    } else {
        // Generic one-shot retry for any other track (Quran surah, classroom music...) —
        // usually just a transient network hiccup.
        const failedSrc = audio.src;
        setTimeout(() => {
            if (STATE.radio.isPlaying && audio.src === failedSrc) {
                audio.load();
                audio.play().catch(err => console.warn('Audio retry play error:', err));
            }
        }, 1500);
    }
}

function openMusicModal() {
    showModal('musicSearchModal');
    switchMusicModalTab('online');
    loadMusicLibraryCountOnly();
}

async function loadMusicLibraryCountOnly() {
    try {
        const res = await fetch('/api/music/library');
        const data = await res.json();
        const count = data.tracks ? data.tracks.length : 0;
        const badge = document.getElementById('localTabCountBadge');
        if (badge) badge.textContent = count;
    } catch (e) {}
}

function quickSearchOnline(term) {
    const inp = document.getElementById('onlineMusicSearchInput');
    if (inp) {
        inp.value = term;
        searchOnlineMusic(term);
    }
}

let onlineSearchDebounce = null;
function handleOnlineMusicSearchInput(val) {
    if (onlineSearchDebounce) clearTimeout(onlineSearchDebounce);
    if (!val || !val.trim()) return;
    onlineSearchDebounce = setTimeout(() => {
        searchOnlineMusic(val);
    }, 600);
}

async function searchOnlineMusic(query) {
    const q = (query || '').trim();
    const container = document.getElementById('onlineMusicResultsContainer');
    if (!container) return;

    if (!q) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-500">
                <span class="text-4xl block mb-2">🌐</span>
                <p class="text-xs font-bold text-slate-400">ابحث عن أي أغنية أونلاين لتشغيلها لجميع الطلاب فوراً!</p>
                <p class="text-micro text-slate-500 mt-1">يتم سحب الأغنية وتوزيعها تلقائياً عبر شبكة المعمل بدون حجب ⚡</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="text-center py-12 text-pink-400">
            <span class="text-4xl block mb-3 animate-spin">🌀</span>
            <p class="text-xs font-bold text-white">جاري البحث عن "${escapeHtml(q)}" في قاعدة الموسيقى العالمية...</p>
            <p class="text-micro text-slate-400 mt-1">تخطي حجب الفايروول شغال 🛡️⚡</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/music/online/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const songs = data.songs || [];
        window._lastOnlineSongs = songs;

        renderOnlineMusicResults(songs, q);
    } catch (err) {
        container.innerHTML = `
            <div class="text-center py-8 text-red-400 text-xs">
                <span class="text-3xl block mb-2">⚠️</span>
                <p class="font-bold">تعذر البحث عن الأغاني أونلاين!</p>
                <p class="text-micro text-slate-400 mt-1">${escapeHtml(err.message)}</p>
            </div>
        `;
    }
}

function renderOnlineMusicResults(songs, query) {
    const container = document.getElementById('onlineMusicResultsContainer');
    if (!container) return;

    if (songs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-500">
                <span class="text-3xl block mb-2">🔍</span>
                <p class="text-xs font-bold text-slate-400">لم يتم العثور على نتائج لـ "${escapeHtml(query)}"</p>
                <p class="text-micro text-slate-500 mt-1">جرب كتابة اسم الأغنية أو الفنان بشكل مختلف (عربي أو إنجليزي)</p>
            </div>
        `;
        return;
    }

    let html = '';
    songs.forEach((song, idx) => {
        const isCurrentPlaying = STATE.radio.activeTrack && 
            (STATE.radio.activeTrack.id === 'track_online_' + song.id || STATE.radio.activeTrack.title === song.title) && 
            STATE.radio.isPlaying;

        html += `
            <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/80 border ${isCurrentPlaying ? 'border-pink-500/60 bg-pink-500/10' : 'border-slate-800'} hover:border-pink-500/40 transition-all group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 shadow-md flex items-center justify-center text-xl text-pink-400 relative">
                        ${song.cover ? `<img src="${song.cover}" loading="lazy" class="w-full h-full object-cover" onerror="this.outerHTML='🎵'">` : '🎵'}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <h4 class="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-xs group-hover:text-pink-300 transition-colors">${escapeHtml(song.title)}</h4>
                            ${isCurrentPlaying ? '<span class="text-micro px-1.5 py-0.2 rounded-full bg-pink-500/30 text-pink-300 font-bold animate-pulse">شغالة الآن</span>' : ''}
                        </div>
                        <p class="text-micro text-slate-400 truncate mt-0.5">
                            ${escapeHtml(song.artist || 'فنان')} 
                            ${song.album ? `• ${escapeHtml(song.album)}` : ''}
                            ${song.duration ? `• ${song.duration}` : ''}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Share to Chat -->
                    <button type="button" onclick="shareOnlineTrackToChat(${idx})" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all" title="مشاركة في الشات 💬">
                        💬
                    </button>
                    <!-- Play for Class -->
                    <button type="button" id="onlinePlayBtn_${idx}" onclick="playOnlineSongForEveryone(${idx})" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1">
                        <span>${isCurrentPlaying ? 'إعادة تشغيل 🔄' : 'تشغيل للكل 🎵'}</span>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function playOnlineSongForEveryone(idx) {
    const song = window._lastOnlineSongs?.[idx];
    if (!song) return;

    // Immediately prime and unblock local audio element inside user click gesture!
    const audio = getRadioAudioElement();
    if (audio) {
        audio.muted = false;
        audio.volume = 1.0;
    }

    const btn = document.getElementById(`onlinePlayBtn_${idx}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>جاري التشغيل... 🎵</span>`;
    }

    showNotification(`جاري تشغيل "${song.title}" لجميع أجهزة المعمل...`);

    try {
        const res = await fetch('/api/music/online/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                songId: song.id,
                title: song.title,
                artist: song.artist,
                rawCover: song.rawCover,
                streamUrl: song.streamUrl,
                duration: song.duration,
                djName: STATE.user ? STATE.user.nickname : 'دي جي الفصل',
                djId: STATE.user ? STATE.user.id : null
            })
        });

        const data = await res.json();
        if (data.success && data.track) {
            hideModal('musicSearchModal');
            showNotification(`🎶 تم تشغيل "${song.title}" لجميع أجهزة المعمل!`);
            loadMusicLibraryCountOnly();
            // Start local playback immediately with direct source
            if (audio && (data.track.audioUrl || data.track.file_url)) {
                audio.src = data.track.audioUrl || data.track.file_url;
                audio.play().catch(e => console.warn('Instant play catch:', e));
            }
        } else {
            showNotification(data.error || 'تعذر تشغيل الأغنية.');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>تشغيل للكل 🎵</span>`;
            }
        }
    } catch (err) {
        showNotification('حدث خطأ أثناء تشغيل الأغنية أونلاين: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>تشغيل للكل 🎵</span>`;
        }
    }
}

function shareOnlineTrackToChat(idx) {
    const song = window._lastOnlineSongs?.[idx];
    if (!song) return;

    sendChatMessagePayload({
        content: `🎵 أرشح لكم الاستماع إلى: **${song.title}** - *${song.artist}* 🎧`,
        mediaType: 'text',
        mediaName: song.title
    });
    hideModal('musicSearchModal');
    showNotification('تمت مشاركة الأغنية في الشات 💬');
}

let musicSearchDebounce = null;
function handleMusicSearchInput(val) {
    if (musicSearchDebounce) clearTimeout(musicSearchDebounce);
    musicSearchDebounce = setTimeout(() => {
        loadMusicLibrary(val);
    }, 250);
}

async function loadMusicLibrary(query = '') {
    const container = document.getElementById('musicResultsContainer');
    const countEl = document.getElementById('musicLibraryCountText');
    if (!container) return;

    try {
        const res = await fetch(`/api/music/library?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const tracks = data.tracks || [];
        window._lastSearchedTracks = tracks;

        if (countEl) {
            countEl.textContent = `${tracks.length} أغنية متوفرة في الفصل 🎵`;
        }
        const badge = document.getElementById('localTabCountBadge');
        if (badge) badge.textContent = tracks.length;

        renderMusicResults(tracks, query);
    } catch (err) {
        container.innerHTML = `
            <div class="text-center py-8 text-red-400 text-xs">
                <span class="text-3xl block mb-2">⚠️</span>
                <p class="font-bold">تعذر تحميل مكتبة موسيقى الفصل!</p>
            </div>
        `;
    }
}

function renderMusicResults(tracks, query) {
    const container = document.getElementById('musicResultsContainer');
    if (!container) return;

    if (tracks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-500">
                <span class="text-3xl block mb-2">🔍</span>
                <p class="text-xs font-bold text-slate-400">
                    ${query ? `لم يتم العثور على أغاني مطابقة لـ "${escapeHtml(query)}"` : 'لا توجد أغاني في مكتبة الفصل حالياً!'}
                </p>
                <p class="text-micro text-slate-500 mt-1">اضغط على زر "➕ رفع أغنية" فوق لرفع أي أغنية عندك على الجهاز!</p>
            </div>
        `;
        return;
    }

    let html = '';
    tracks.forEach((track, idx) => {
        const isCurrentPlaying = STATE.radio.activeTrack && STATE.radio.activeTrack.id === track.id && STATE.radio.isPlaying;
        const canDelete = STATE.user && (track.uploader_id === STATE.user.id || STATE.user.role === 'admin');

        html += `
            <div class="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/70 border ${isCurrentPlaying ? 'border-pink-500/60 bg-pink-500/10' : 'border-slate-800'} hover:border-pink-500/40 transition-all group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 shadow-md flex items-center justify-center text-xl text-pink-400">
                        ${track.cover ? `<img src="${track.cover}" class="w-full h-full object-cover" onerror="this.outerHTML='🎵'">` : (isCurrentPlaying ? '💿' : '🎵')}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <h4 class="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-xs group-hover:text-pink-300 transition-colors">${escapeHtml(track.title)}</h4>
                            ${isCurrentPlaying ? '<span class="text-micro px-1.5 py-0.2 rounded-full bg-pink-500/30 text-pink-300 font-bold animate-pulse">شغالة الآن</span>' : ''}
                        </div>
                        <p class="text-micro text-slate-400 truncate">
                            ${escapeHtml(track.artist || 'فنان')} 
                            ${track.uploader_name ? `• رافعها: ${escapeHtml(track.uploader_name)}` : ''}
                            ${track.duration ? '• ' + track.duration : ''}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Share to Chat -->
                    <button onclick="shareTrackToChatByIndex(${idx})" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all" title="مشاركة في الشات 💬">
                        💬
                    </button>
                    <!-- Delete Track (if allowed) -->
                    ${canDelete ? `
                        <button onclick="deleteLibraryMusic('${track.id}')" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-bold transition-all" title="حذف الأغنية من المكتبة">
                            🗑️
                        </button>
                    ` : ''}
                    <!-- Play for Class -->
                    <button onclick="playTrackForEveryoneByIndex(${idx})" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1">
                        <span>${isCurrentPlaying ? 'إعادة تشغيل 🔄' : 'تشغيل للكل 🎵'}</span>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function playTrackForEveryoneByIndex(idx) {
    const track = window._lastSearchedTracks?.[idx];
    if (!track) return;

    if (STATE.socket) {
        STATE.socket.emit('radio_play', {
            track: {
                id: track.id,
                title: track.title,
                artist: track.artist,
                cover: track.cover || '',
                audioUrl: track.file_url,
                file_url: track.file_url,
                duration: track.duration || ''
            },
            currentTime: 0,
            djName: STATE.user ? STATE.user.nickname : 'دي جي الفصل',
            djId: STATE.user ? STATE.user.id : null
        });
    }
    hideModal('musicSearchModal');
    showNotification(`🎶 تم تشغيل "${track.title}" لجميع الطلاب في الفصل!`);
}

function shareTrackToChatByIndex(idx) {
    const track = window._lastSearchedTracks?.[idx];
    if (!track) return;

    sendChatMessagePayload({
        content: `🎵 أستمع الآن إلى: **${track.title}** - *${track.artist}* 🎧`,
        mediaType: 'text',
        mediaName: track.title
    });
    hideModal('musicSearchModal');
    showNotification('تمت مشاركة الأغنية في الشات 💬');
}

async function handleRadioFileUpload(file) {
    if (!file || !STATE.user) {
        showNotification('الرجاء اختيار ملف صوتي صالح!');
        return;
    }
    showNotification(`جاري رفع "${file.name}" لمكتبة الفصل وتشغيلها...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('artist', STATE.user.nickname);
    formData.append('uploaderId', STATE.user.id);
    formData.append('uploaderName', STATE.user.nickname);

    try {
        const res = await fetch('/api/music/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success && data.track) {
            const track = data.track;
            if (STATE.socket) {
                STATE.socket.emit('radio_play', {
                    track: {
                        id: track.id,
                        title: track.title,
                        artist: track.artist,
                        cover: '',
                        audioUrl: track.file_url,
                        file_url: track.file_url,
                        duration: track.duration || ''
                    },
                    currentTime: 0,
                    djName: STATE.user.nickname,
                    djId: STATE.user.id
                });
            }
            hideModal('musicSearchModal');
            showNotification(`تم رفع وتشغيل "${track.title}" لجميع أجهزة المعمل! 🎵⚡`);
            loadMusicLibrary();
        } else {
            showNotification(data.error || 'فشل رفع الملف الصوتي.');
        }
    } catch (e) {
        showNotification('حدث خطأ أثناء رفع الملف الصوتي.');
    }
}

async function deleteLibraryMusic(trackId) {
    if (!STATE.user) return;
    if (!confirm('هل تريد حذف هذه الأغنية نهائياً من مكتبة الفصل؟')) return;

    try {
        const res = await fetch(`/api/music/${trackId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: STATE.user.id })
        });
        const data = await res.json();
        if (data.success) {
            showNotification('تم حذف الأغنية من المكتبة.');
            loadMusicLibrary();
        } else {
            showNotification(data.error || 'تعذر حذف الأغنية!');
        }
    } catch (err) {
        showNotification('حدث خطأ أثناء حذف الأغنية.');
    }
}

function handleRadioSyncState(state) {
    const bar = document.getElementById('classroomMusicBar');
    const audio = getRadioAudioElement();
    const titleEl = document.getElementById('radioTrackTitle');
    const artistEl = document.getElementById('radioTrackArtist');
    const coverWrapper = document.getElementById('radioCoverWrapper');
    const playIcon = document.getElementById('radioPlayIcon');

    if (!state || !state.track) {
        STATE.radio.activeTrack = null;
        STATE.radio.isPlaying = false;
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
        }
        if (bar) bar.classList.add('hidden');
        hideAutoplayUnlockBanner();
        return;
    }

    STATE.radio.activeTrack = state.track;
    STATE.radio.isPlaying = !!state.isPlaying;

    if (bar) bar.classList.remove('hidden');

    // Update Quran button/badges and the library modal's "now playing" banner
    const trackId = String((state && state.track && state.track.id) || '');
    const isQuranPlaying = !!(state && state.isPlaying && (trackId === 'quran_cairo_live' || trackId.startsWith('quran_surah_')));
    const quranBtn = document.getElementById('quranRadioBroadcastBtn');
    const quranLiveDot = document.getElementById('quranRadioLiveIndicator');
    const quranBtnText = document.getElementById('quranRadioBtnText');
    const adminQuranBtnText = document.getElementById('adminQuranRadioBtnText');
    const modalQuranBtnText = document.getElementById('modalQuranRadioBtnText');

    if (quranBtn) {
        if (isQuranPlaying) {
            quranBtn.className = 'flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-bold transition-all shadow-md shadow-amber-500/20 shrink-0 animate-pulse';
            if (quranLiveDot) quranLiveDot.classList.remove('hidden');
            if (quranBtnText) quranBtnText.textContent = 'القرآن شغّال';
        } else {
            quranBtn.className = 'flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm relative shrink-0';
            if (quranLiveDot) quranLiveDot.classList.add('hidden');
            if (quranBtnText) quranBtnText.textContent = 'إذاعة القرآن';
        }
    }
    if (adminQuranBtnText) {
        adminQuranBtnText.textContent = isQuranPlaying ? 'إيقاف إذاعة القرآن للجميع' : 'إذاعة القرآن (لكل الأجهزة)';
    }
    if (modalQuranBtnText) {
        modalQuranBtnText.textContent = isQuranPlaying ? 'إيقاف البث' : 'فتح المكتبة';
    }

    const quranNowPlaying = document.getElementById('quranLibraryNowPlaying');
    const quranNowPlayingText = document.getElementById('quranLibraryNowPlayingText');
    if (quranNowPlaying && quranNowPlayingText) {
        if (trackId.startsWith('quran_surah_') && state.isPlaying) {
            quranNowPlaying.classList.remove('hidden');
            quranNowPlayingText.textContent = `شغال دلوقتي: ${state.track.title} — ${state.track.artist}`;
        } else {
            quranNowPlaying.classList.add('hidden');
        }
    }

    if (trackId === 'quran_cairo_live') {
        quranRelayRetryCount = 0; // Reset retry counter on fresh play
    }

    if (titleEl) titleEl.textContent = state.track.title || 'أغنية الفصل';
    if (artistEl) artistEl.textContent = `${state.track.artist || 'موسيقى'} • مشغل بواسطة: ${state.djName || 'دي جي الفصل 🎧'}`;
    if (playIcon) playIcon.textContent = state.isPlaying ? '⏸' : '▶';

    if (coverWrapper) {
        if (state.track.cover) {
            coverWrapper.innerHTML = `<img src="${state.track.cover}" class="w-full h-full object-cover" onerror="this.outerHTML='<span class=\\'animate-spin\\'>📻</span>'">`;
        } else {
            coverWrapper.innerHTML = `<span class="animate-spin" style="animation-duration: 4s;">📻</span>`;
        }
    }

    if (audio) {
        audio.muted = false;
        let targetSrc = state.track.file_url || state.track.audioUrl;
        if (targetSrc && audio.src !== targetSrc && !audio.src.endsWith(targetSrc)) {
            audio.src = targetSrc;
            audio.load();
        } else if (!targetSrc) {
            audio.pause();
            audio.removeAttribute('src');
        }

        if (!state.track.isLive && state.track.id !== 'quran_cairo_live') {
            const expectedTime = state.currentTime || 0;
            if (Math.abs(audio.currentTime - expectedTime) > 2) {
                audio.currentTime = expectedTime;
            }
        }

        if (state.isPlaying && !STATE.isStealthActive && targetSrc) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    hideAutoplayUnlockBanner();
                }).catch(e => {
                    console.warn('Radio autoplay error (user gesture needed):', e);
                    showAutoplayUnlockBanner(state.track.title);
                });
            }
        } else {
            audio.pause();
            hideAutoplayUnlockBanner();
        }
    }
}

function showAutoplayUnlockBanner(title) {
    const banner = document.getElementById('musicAutoplayUnlockBanner');
    const titleEl = document.getElementById('musicAutoplayTrackTitle');
    if (banner) {
        if (titleEl && title) titleEl.textContent = `راديو الفصل: "${title}" • اضغط هنا للاستماع`;
        banner.classList.remove('hidden');
    }
}

function hideAutoplayUnlockBanner() {
    const banner = document.getElementById('musicAutoplayUnlockBanner');
    if (banner) banner.classList.add('hidden');
}

function unlockAudioAutoplay() {
    hideAutoplayUnlockBanner();
    const audio = getRadioAudioElement();
    if (audio) {
        audio.muted = false;
        audio.volume = 1.0;
        audio.play().catch(e => console.error('Unlock audio play error:', e));
    }
}

function getRadioAudioElement() {
    if (!STATE.radio.audioEl) {
        STATE.radio.audioEl = document.getElementById('classroomAudioElement');
        if (STATE.radio.audioEl) {
            STATE.radio.audioEl.addEventListener('timeupdate', updateRadioProgressUI);
            STATE.radio.audioEl.addEventListener('error', handleRadioAudioError);
            STATE.radio.audioEl.addEventListener('ended', () => {
                if (STATE.radio.activeTrack && (STATE.radio.activeTrack.id === 'quran_cairo_live' || STATE.radio.activeTrack.isLive)) {
                    console.log('[Quran Radio] Live stream ended/reconnecting...');
                    setTimeout(() => {
                        if (STATE.radio.isPlaying && STATE.radio.activeTrack && STATE.radio.activeTrack.id === 'quran_cairo_live') {
                            STATE.radio.audioEl.src = '/api/quran/live-relay?t=' + Date.now();
                            STATE.radio.audioEl.load();
                            STATE.radio.audioEl.play().catch(e => console.warn('Quran radio reconnect error:', e));
                        }
                    }, 1000);
                } else if (STATE.radio.activeTrack && String(STATE.radio.activeTrack.id || '').startsWith('quran_surah_')) {
                    // Continuous Quran playback: tell the server to advance everyone to the next surah.
                    if (STATE.socket) STATE.socket.emit('quran_track_ended');
                } else if (STATE.socket && STATE.radio.activeTrack) {
                    STATE.socket.emit('radio_stop');
                }
            });
        }
    }
    return STATE.radio.audioEl;
}

function updateRadioProgressUI() {
    if (STATE.radio.isSeeking) return;
    const progressBar = document.getElementById('radioProgressBar');
    const curTimeEl = document.getElementById('radioCurrentTime');
    const totTimeEl = document.getElementById('radioTotalDuration');
    const audio = STATE.radio.audioEl;
    if (!audio) return;

    // 🔴 Live stream handling (Cairo Quran Radio)
    if (STATE.radio.activeTrack && (STATE.radio.activeTrack.isLive || STATE.radio.activeTrack.id === 'quran_cairo_live' || !isFinite(audio.duration))) {
        if (progressBar) progressBar.value = 100;
        if (totTimeEl) totTimeEl.innerHTML = '<span class="text-emerald-400 font-bold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> مباشر</span>';
        if (curTimeEl) curTimeEl.textContent = 'بث حي';
        return;
    }

    if (audio.duration && !isNaN(audio.duration)) {
        if (progressBar) progressBar.value = (audio.currentTime / audio.duration) * 100;
        if (totTimeEl) totTimeEl.textContent = formatAudioSeconds(audio.duration);
    }
    if (curTimeEl) curTimeEl.textContent = formatAudioSeconds(audio.currentTime);
}

// Keep progress bar updated smoothly
setInterval(updateRadioProgressUI, 500);

function handleRadioProgressInput(percent) {
    const audio = STATE.radio.audioEl;
    if (!audio || !audio.duration) return;
    const newTime = (percent / 100) * audio.duration;
    audio.currentTime = newTime;

    if (STATE.socket) {
        STATE.socket.emit('radio_seek', { currentTime: newTime });
    }
}

function toggleRadioPlayPause() {
    if (!STATE.radio.activeTrack) return;
    const isPlaying = STATE.radio.isPlaying;
    const audio = getRadioAudioElement();
    const curTime = audio ? (audio.currentTime || 0) : 0;

    if (isPlaying) {
        if (STATE.socket) {
            STATE.socket.emit('radio_pause', { currentTime: curTime });
        }
    } else {
        if (STATE.socket) {
            STATE.socket.emit('radio_play', {
                track: STATE.radio.activeTrack,
                currentTime: curTime,
                djName: STATE.user ? STATE.user.nickname : 'أنت'
            });
        }
    }
}

function closeRadioBar() {
    if (confirm('هل تريد إيقاف الأغنية للجميع في الفصل؟')) {
        if (STATE.socket) {
            STATE.socket.emit('radio_stop');
        }
    } else {
        const bar = document.getElementById('classroomMusicBar');
        if (bar) bar.classList.add('hidden');
    }
}

function formatAudioSeconds(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
                <span class="px-2 py-0.5 rounded-full text-micro font-bold ${d.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}">
                    ${d.role}
                </span>
            </td>
            <td class="py-2.5 px-3">
                ${d.role !== 'admin' ? `
                    <button onclick="adminKickUser('${d.userId}')" class="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-all text-[11px] font-bold">
                        طرد ⛔
                    </button>
                ` : '<span class="text-slate-600 text-micro">-</span>'}
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
    renderIcons();
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
    if (id === 'netSupportModal' && STATE.netSupport && STATE.netSupport.pollInterval) {
        clearInterval(STATE.netSupport.pollInterval);
        STATE.netSupport.pollInterval = null;
    }
    if (id === 'netSupportShowModal' && STATE.netSupport) {
        STATE.netSupport.currentShowDeviceId = null;
    }
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
        el.textContent = `${nickname} يكتب الآن...`;
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
            btn.innerHTML = `مؤقت`;
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
                showNotification('جاري رفع صورة البروفايل...');
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

// ====================================================
// 14. NetSupport Classroom Monitor & Remote Control 🖥️⚡
// ====================================================

async function openNetSupportModal() {
    const modal = document.getElementById('netSupportModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    await refreshNetSupportDevices();

    // Start auto-refresh interval while modal is open (every 3 seconds)
    if (STATE.netSupport.pollInterval) clearInterval(STATE.netSupport.pollInterval);
    STATE.netSupport.pollInterval = setInterval(refreshNetSupportDevices, 3000);
}

async function refreshNetSupportDevices() {
    try {
        const res = await fetch('/api/netsupport/devices');
        if (!res.ok) {
            if (res.status === 403) {
                console.warn('NetSupport: Unauthorized device');
            }
            return;
        }
        const data = await res.json();
        const devices = data.devices || [];
        STATE.netSupport.devices = devices;

        // Update stats
        const totalEl = document.getElementById('netSupportStatsTotal');
        const screensEl = document.getElementById('netSupportStatsScreens');
        const headerCountEl = document.getElementById('netSupportOnlineCount');
        
        if (totalEl) totalEl.textContent = devices.length;
        if (screensEl) screensEl.textContent = devices.filter(d => !!d.lastFrame).length;
        if (headerCountEl) headerCountEl.textContent = devices.length;

        renderNetSupportGrid(devices);
    } catch (err) {
        console.error('Failed to refresh NetSupport devices:', err);
    }
}

function renderNetSupportGrid(devices) {
    const container = document.getElementById('netSupportGridContainer');
    if (!container) return;

    if (!devices || devices.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center justify-center text-center text-slate-500">
                <span class="text-5xl mb-3">🖥️</span>
                <p class="text-sm font-bold text-slate-300 mb-1">لا توجد أجهزة متصلة بالمعمل حالياً</p>
                <p class="text-xs text-slate-500 max-w-sm mb-4">عندما يفتح الطلاب نؤطة أو يتم تشغيل lab-agent.bat ستظهر شاشاتهم هنا فوراً وبشكل حي!</p>
                <button onclick="openNetSupportAgentGuideModal()" class="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition">
                    📖 طريقة تشغيل عميل المعمل (lab-agent.bat)
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = devices.map(dev => {
        const isLocked = !!dev.isLocked;
        const isStealth = !!dev.isStealth;
        const hasFrame = !!dev.lastFrame;
        const lastSeenSec = dev.lastFrameAt ? Math.round((Date.now() - dev.lastFrameAt) / 1000) : null;
        const timeAgoText = lastSeenSec !== null ? (lastSeenSec < 6 ? 'مباشر الآن' : `منذ ${lastSeenSec} ثانية`) : 'لا توجد لقطة';

        // Resolve real student name from STATE.users or STATE.allUsers if dev.nickname is generic
        let studentName = dev.nickname;
        let studentAvatar = dev.avatar;
        if (!studentName || studentName === 'طالب' || studentName.startsWith('جهاز_') || studentName.startsWith('طالب_')) {
            const matchedUser = (STATE.users || []).find(u => 
                (dev.userId && u.id === dev.userId) || 
                (dev.ip && (u.ip_address === dev.ip || u.ip === dev.ip)) || 
                (dev.mac && u.mac_address && u.mac_address === dev.mac)
            );
            if (matchedUser && matchedUser.nickname) {
                studentName = matchedUser.nickname;
                if (matchedUser.avatar) studentAvatar = matchedUser.avatar;
            }
        }
        if (!studentName || studentName === 'طالب') {
            studentName = `طالب (${dev.ip ? dev.ip.split('.').pop() : 'جهاز'})`;
        }

        const safeNick = escapeHtml(studentName);
        const safeIp = escapeHtml(dev.ip || '');
        const safeApp = dev.currentApp ? escapeHtml(dev.currentApp) : 'سطح المكتب';

        return `
            <div class="glass-panel rounded-2xl p-3 border ${isLocked ? 'border-red-500/60 bg-red-950/20' : 'border-white/10 bg-slate-900/60'} flex flex-col justify-between transition-all hover:border-cyan-500/50 shadow-lg group">
                <!-- Header -->
                <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm overflow-hidden shrink-0 border border-white/10 shadow-sm">
                            ${renderAvatarHTML(studentAvatar, 'w-full h-full')}
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5">
                                <h4 id="device_title_${dev.deviceId}" class="text-xs font-black text-white truncate max-w-[130px]" title="${safeNick}">${safeNick}</h4>
                                ${dev.role === 'admin' ? '<span class="text-micro px-1 rounded bg-amber-500/20 text-amber-300 font-bold">معلم</span>' : ''}
                            </div>
                            <p class="text-micro text-slate-400 font-mono truncate">${safeIp}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        ${isLocked ? '<span class="text-micro px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300 border border-red-500/40 font-bold animate-pulse">🔒 مقفول</span>' : ''}
                        ${isStealth ? '<span class="text-micro px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold">📚 تمويه</span>' : ''}
                    </div>
                </div>

                <!-- Screen Thumbnail / Preview -->
                <div class="relative w-full h-32 sm:h-36 bg-black rounded-xl overflow-hidden border border-white/5 flex items-center justify-center cursor-pointer group-hover:border-cyan-500/40 transition mb-2" onclick="openNetSupportShowModal('${dev.deviceId}')">
                    <img id="device_frame_${dev.deviceId}" src="${dev.lastFrame || ''}" class="w-full h-full object-contain ${hasFrame ? '' : 'hidden'}" alt="${safeNick} Screen" />
                    <div id="device_overlay_${dev.deviceId}" class="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center ${hasFrame ? '' : 'hidden'}">
                        <span class="px-2.5 py-1 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black shadow-lg flex items-center gap-1 scale-95 group-hover:scale-100 transition">
                            👁️ تكبير Show
                        </span>
                    </div>

                    <!-- Placeholder when waiting for stream (Auto-sync without manual request) -->
                    <div id="device_placeholder_${dev.deviceId}" class="flex flex-col items-center justify-center gap-2 p-3 text-center ${hasFrame ? 'hidden' : ''}">
                        <div class="relative flex items-center justify-center w-10 h-10">
                            <span class="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-ping"></span>
                            <span class="relative text-2xl">🖥️</span>
                        </div>
                        <div class="flex items-center gap-1 text-[11px] text-cyan-300 font-medium">
                            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span>بث الشاشة التلقائي نشط</span>
                        </div>
                        <span class="text-micro text-slate-500">جاري سحب لقطة الشاشة بدون طلب...</span>
                    </div>

                    <!-- Bottom Info Banner on Image -->
                    <div class="absolute bottom-1 inset-x-1.5 px-2 py-0.8 rounded-lg bg-black/80 backdrop-blur-sm flex items-center justify-between text-micro text-slate-300 font-mono pointer-events-none">
                        <span id="device_app_${dev.deviceId}" class="truncate max-w-[120px] text-slate-400" title="${safeApp}">${safeApp}</span>
                        <span id="device_status_${dev.deviceId}" class="${hasFrame ? 'text-emerald-400 font-bold' : 'text-cyan-400/80'}">${timeAgoText}</span>
                    </div>
                </div>

                <!-- Control Buttons -->
                <div class="grid grid-cols-4 gap-1 pt-1 border-t border-white/5">
                    <button onclick="openNetSupportShowModal('${dev.deviceId}')" class="py-1 px-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1" title="عرض ملء الشاشة كـ Show">
                        <span>👁️</span>
                        <span class="hidden sm:inline">Show</span>
                    </button>
                    <button onclick="adminNetSupportDeviceControl('${isLocked ? 'unlock_screen' : 'lock_screen'}', '${dev.socketId}', '${dev.ip}')" class="py-1 px-1.5 rounded-lg ${isLocked ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/30'} text-[11px] font-bold transition flex items-center justify-center gap-1" title="${isLocked ? 'إلغاء القفل' : 'قفل شاشة الطالب'}">
                        <span>${isLocked ? '🔓' : '🔒'}</span>
                        <span class="hidden sm:inline">${isLocked ? 'فتح' : 'قفل'}</span>
                    </button>
                    <button onclick="promptMessageToNetSupportDevice('${dev.socketId}', '${dev.ip}', '${safeNick}')" class="py-1 px-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1" title="إرسال رسالة تنبيه منبثقة للطالب">
                        <span>💬</span>
                        <span class="hidden sm:inline">تنبيه</span>
                    </button>
                    <button onclick="adminNetSupportDeviceControl('play_alarm', '${dev.socketId}', '${dev.ip}')" class="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1" title="رنين جرس إنذار على جهاز الطالب">
                        <span>🔔</span>
                        <span class="hidden sm:inline">إنذار</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function promptMessageToNetSupportDevice(socketId, ip, nickname) {
    const msg = prompt(`أدخل رسالة التنبيه التي ستظهر على شاشة ${nickname || 'الجهاز'}:`);
    if (msg && msg.trim()) {
        adminNetSupportDeviceControl('popup_message', socketId, ip, { message: msg.trim() });
    }
}

function openNetSupportShowModal(deviceId) {
    const dev = STATE.netSupport.devices.find(d => d.deviceId === deviceId);
    if (!dev) return;

    STATE.netSupport.currentShowDeviceId = deviceId;

    const modal = document.getElementById('netSupportShowModal');
    const avatarEl = document.getElementById('netSupportShowAvatar');
    const titleEl = document.getElementById('netSupportShowTitle');
    const subtitleEl = document.getElementById('netSupportShowSubtitle');
    const lockBtn = document.getElementById('netSupportShowLockBtn');
    const lockLabel = document.getElementById('netSupportShowLockLabel');
    const imgEl = document.getElementById('netSupportShowImage');
    const placeholderEl = document.getElementById('netSupportShowPlaceholder');

    if (avatarEl) avatarEl.innerHTML = renderAvatarHTML(dev.avatar, 'w-full h-full');
    if (titleEl) titleEl.textContent = `شاشة: ${dev.nickname || 'جهاز طالب'}`;
    if (subtitleEl) subtitleEl.textContent = `IP: ${dev.ip || ''} | MAC: ${dev.mac || 'N/A'} | التطبيق: ${dev.currentApp || 'Desktop'}`;

    if (lockBtn && lockLabel) {
        if (dev.isLocked) {
            lockBtn.className = 'px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer';
            lockLabel.textContent = 'إلغاء القفل 🔓';
        } else {
            lockBtn.className = 'px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer';
            lockLabel.textContent = 'قفل الشاشة 🔒';
        }
    }

    if (dev.lastFrame) {
        if (imgEl) {
            imgEl.src = dev.lastFrame;
            imgEl.classList.remove('hidden');
        }
        if (placeholderEl) placeholderEl.classList.add('hidden');
    } else {
        if (imgEl) imgEl.classList.add('hidden');
        if (placeholderEl) placeholderEl.classList.remove('hidden');
    }

    if (modal) modal.classList.remove('hidden');
}

function toggleCurrentShowLock() {
    if (!STATE.netSupport.currentShowDeviceId) return;
    const dev = STATE.netSupport.devices.find(d => d.deviceId === STATE.netSupport.currentShowDeviceId);
    if (!dev) return;

    const newLockState = !dev.isLocked;
    dev.isLocked = newLockState;

    const lockBtn = document.getElementById('netSupportShowLockBtn');
    const lockLabel = document.getElementById('netSupportShowLockLabel');
    if (lockBtn && lockLabel) {
        if (newLockState) {
            lockBtn.className = 'px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer';
            lockLabel.textContent = 'إلغاء القفل 🔓';
        } else {
            lockBtn.className = 'px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer';
            lockLabel.textContent = 'قفل الشاشة 🔒';
        }
    }

    adminNetSupportDeviceControl(newLockState ? 'lock_screen' : 'unlock_screen', dev.socketId, dev.ip);
}

function sendMsgToCurrentShowDevice() {
    if (!STATE.netSupport.currentShowDeviceId) return;
    const dev = STATE.netSupport.devices.find(d => d.deviceId === STATE.netSupport.currentShowDeviceId);
    if (!dev) return;
    promptMessageToNetSupportDevice(dev.socketId, dev.ip, dev.nickname);
}

function triggerAlarmCurrentShowDevice() {
    if (!STATE.netSupport.currentShowDeviceId) return;
    const dev = STATE.netSupport.devices.find(d => d.deviceId === STATE.netSupport.currentShowDeviceId);
    if (!dev) return;
    adminNetSupportDeviceControl('play_alarm', dev.socketId, dev.ip);
    showNotification(`تم إرسال إنذار صوتي لجهاز ${dev.nickname}! 🔔`);
}

async function adminNetSupportDeviceControl(action, targetSocketId, targetIp, payload = {}) {
    try {
        const res = await fetch('/api/netsupport/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, targetSocketId, targetIp, payload })
        });
        const data = await res.json();
        if (data.success) {
            showNotification(`تم تنفيذ الأمر بنجاح! ⚡`);
            await refreshNetSupportDevices();
        } else {
            alert(data.error || 'فشل إرسال أمر التحكم!');
        }
    } catch (err) {
        console.error('NetSupport control error:', err);
        showNotification('حدث خطأ أثناء إرسال أمر التحكم ⚠️');
    }
}

async function adminNetSupportGlobalAction(action) {
    if (action === 'lock_all') {
        if (confirm('هل أنت متأكد من قفل شاشات جميع الأجهزة في المعمل فوراً؟ 🔒')) {
            await adminNetSupportDeviceControl('lock_screen', 'all', 'all');
        }
    } else if (action === 'unlock_all') {
        await adminNetSupportDeviceControl('unlock_screen', 'all', 'all');
    } else if (action === 'stealth_all') {
        if (confirm('هل تريد تحويل جميع أجهزة المعمل لشاشة التمويه (مسألة فيزياء) فوراً؟ 📚')) {
            await adminNetSupportDeviceControl('force_stealth', 'all', 'all');
        }
    } else if (action === 'message_all') {
        const msg = prompt('اكتب رسالة التنبيه التي ستظهر لجميع الطلاب بالمعمل:');
        if (msg && msg.trim()) {
            await adminNetSupportDeviceControl('popup_message', 'all', 'all', { message: msg.trim() });
        }
    }
}

function openNetSupportAgentGuideModal() {
    const modal = document.getElementById('netSupportAgentGuideModal');
    if (modal) modal.classList.remove('hidden');
}

function handleNetSupportFrameUpdate(data) {
    if (!data || (!data.deviceId && !data.ip)) return;

    let dev = STATE.netSupport.devices.find(d => d.deviceId === data.deviceId || (data.ip && d.ip === data.ip));
    if (dev) {
        dev.lastFrame = data.lastFrame;
        dev.lastFrameAt = data.lastFrameAt || Date.now();
        if (data.currentApp) dev.currentApp = data.currentApp;
        if (typeof data.isLocked !== 'undefined') dev.isLocked = data.isLocked;
        if (typeof data.isStealth !== 'undefined') dev.isStealth = data.isStealth;
        if (data.nickname && data.nickname !== 'طالب') dev.nickname = data.nickname;
        if (data.avatar) dev.avatar = data.avatar;

        const titleEl = document.getElementById(`device_title_${dev.deviceId}`);
        if (titleEl && dev.nickname && dev.nickname !== 'طالب') {
            titleEl.textContent = dev.nickname;
            titleEl.title = dev.nickname;
        }
    }

    const targetDevId = dev ? dev.deviceId : data.deviceId;

    // Update active Show modal if currently viewing this device
    if (STATE.netSupport.currentShowDeviceId === targetDevId || STATE.netSupport.currentShowDeviceId === data.deviceId) {
        const imgEl = document.getElementById('netSupportShowImage');
        const placeholderEl = document.getElementById('netSupportShowPlaceholder');
        if (imgEl && data.lastFrame) {
            imgEl.src = data.lastFrame;
            imgEl.classList.remove('hidden');
        }
        if (placeholderEl && data.lastFrame) {
            placeholderEl.classList.add('hidden');
        }
    }

    // Update thumbnail in the grid
    const thumbImg = document.getElementById(`device_frame_${targetDevId}`) || document.getElementById(`device_frame_${data.deviceId}`);
    const placeholder = document.getElementById(`device_placeholder_${targetDevId}`) || document.getElementById(`device_placeholder_${data.deviceId}`);
    const overlay = document.getElementById(`device_overlay_${targetDevId}`) || document.getElementById(`device_overlay_${data.deviceId}`);
    const appEl = document.getElementById(`device_app_${targetDevId}`) || document.getElementById(`device_app_${data.deviceId}`);
    const statusEl = document.getElementById(`device_status_${targetDevId}`) || document.getElementById(`device_status_${data.deviceId}`);

    if (thumbImg && data.lastFrame) {
        thumbImg.src = data.lastFrame;
        thumbImg.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
        if (overlay) overlay.classList.remove('hidden');
    }
    if (appEl && data.currentApp) {
        appEl.textContent = data.currentApp;
        appEl.title = data.currentApp;
    }
    if (statusEl) {
        statusEl.textContent = 'مباشر الآن';
        statusEl.className = 'text-emerald-400 font-bold';
    }
}

// ----------------------------------------------------
// 14. NetSupport Zero-Request Student Screen Streaming
// ----------------------------------------------------
let isCapturingStudentFrame = false;

async function captureStudentLiveSnapshot() {
    if (!STATE.socket || !STATE.socket.connected || !STATE.user) return;
    if (STATE.user.role === 'admin') return; // Teacher doesn't capture own screen
    if (isCapturingStudentFrame) return; // Prevent overlapping runs

    isCapturingStudentFrame = true;
    try {
        let frameBase64 = null;
        let activeAppName = 'متصفح نؤطة';

        // Check if student minimized the browser or switched away from the tab
        if (document.hidden) {
            const canvas = document.createElement('canvas');
            canvas.width = 480;
            canvas.height = 270;
            const ctx = canvas.getContext('2d');

            // Dark alert canvas
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, 480, 270);

            // Amber border
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 4;
            ctx.strokeRect(12, 12, 456, 246);

            // Alert Title
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ الطالب مصغر المتصفح / خارج النافذة', 240, 85);

            // Subtitle
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            ctx.fillText('النافذة الحالية غير نشطة (Background / Out of Focus)', 240, 125);

            // Nickname + IP
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
            ctx.fillText(`${STATE.user.nickname || 'طالب'} (${STATE.user.ip || 'LAN'})`, 240, 165);

            // Timestamp
            ctx.fillStyle = '#64748b';
            ctx.font = '13px monospace';
            const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            ctx.fillText(`آخر نشاط مسجل: ${timeStr}`, 240, 205);

            frameBase64 = canvas.toDataURL('image/jpeg', 0.6);
            activeAppName = 'مصغر المتصفح (خارج نؤطة)';
        } else if (typeof window.html2canvas === 'function') {
            const canvas = await window.html2canvas(document.body, {
                scale: 0.28, // Fast, lightweight thumbnail for LAN
                logging: false,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#0a0d14'
            });
            frameBase64 = canvas.toDataURL('image/jpeg', 0.55);
            const activeTabName = document.querySelector('.nav-tab.active')?.textContent?.trim() || document.title || 'متصفح نؤطة';
            activeAppName = `نؤطة (${activeTabName})`;
        }

        if (frameBase64 && STATE.socket && STATE.socket.connected) {
            STATE.socket.emit('netsupport_client_frame', {
                frame: frameBase64,
                currentApp: activeAppName,
                userId: STATE.user?.id,
                nickname: STATE.user?.nickname,
                avatar: STATE.user?.avatar
            });
        }
    } catch (err) {
        console.debug('Zero-request screen capture error:', err);
    } finally {
        isCapturingStudentFrame = false;
    }
}

function startStudentAutoScreenStream() {
    if (STATE.netSupport && STATE.netSupport.studentAutoCaptureInterval) return;
    if (!STATE.netSupport) STATE.netSupport = {};

    // Don't auto-stream teacher's own screen back to teacher dashboard
    if (STATE.user && STATE.user.role === 'admin') return;

    // Trigger initial capture after short delay once connected
    const tryInitialCapture = () => {
        if (STATE.socket && STATE.socket.connected) {
            captureStudentLiveSnapshot();
        } else {
            setTimeout(tryInitialCapture, 1000);
        }
    };
    setTimeout(tryInitialCapture, 1500);

    // Continuous silent background capture every 2.5 seconds (zero requests, zero prompts)
    STATE.netSupport.studentAutoCaptureInterval = setInterval(() => {
        captureStudentLiveSnapshot();
    }, 2500);

    // Immediate capture on tab switch / window minimize
    document.addEventListener('visibilitychange', () => {
        captureStudentLiveSnapshot();
    });
}

async function promptStudentNetSupportScreenShare() {
    // Immediate fallback trigger
    captureStudentLiveSnapshot();
}


// ----------------------------------------------------
// 15. Alexandria Live Clock & Prayer Times Engine 🕌🕒
// ----------------------------------------------------
function calculateAlexandriaPrayersClient(date = new Date()) {
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
        fajr: fmt(noonLocal - haFajr),
        sunrise: fmt(noonLocal - haSunrise),
        dhuhr: fmt(noonLocal + 0.02),
        asr: fmt(noonLocal + haAsr),
        maghrib: fmt(noonLocal + haSunset + 0.03),
        isha: fmt(noonLocal + haIsha)
    };
}

let alexandriaPrayersData = null;

function tickAlexandriaClockAndPrayers() {
    const now = new Date();

    // 1. Alexandria live clock
    let alexTimeStr = '--:--:--';
    let alexDateStr = '';
    try {
        alexTimeStr = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            timeZone: 'Africa/Cairo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(now);

        alexDateStr = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
            timeZone: 'Africa/Cairo',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(now);
    } catch (e) {
        alexTimeStr = now.toLocaleTimeString('ar-EG');
    }

    // 2. Ensure prayer calculations for today
    if (!alexandriaPrayersData) {
        alexandriaPrayersData = calculateAlexandriaPrayersClient(now);
    }

    const p = alexandriaPrayersData;

    // 3. Compute current Alexandria seconds from midnight
    let h = 0, m = 0, s = 0;
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Cairo',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        }).formatToParts(now);
        h = parseInt(parts.find(x => x.type === 'hour')?.value || '0', 10);
        m = parseInt(parts.find(x => x.type === 'minute')?.value || '0', 10);
        s = parseInt(parts.find(x => x.type === 'second')?.value || '0', 10);
    } catch (e) {
        h = now.getHours();
        m = now.getMinutes();
        s = now.getSeconds();
    }
    const currentSec = h * 3600 + m * 60 + s;

    // 4. Find next prayer
    const prayerList = [
        { key: 'fajr', name: 'الفجر', sec: p.fajr.totalSec },
        { key: 'dhuhr', name: 'الظهر', sec: p.dhuhr.totalSec },
        { key: 'asr', name: 'العصر', sec: p.asr.totalSec },
        { key: 'maghrib', name: 'المغرب', sec: p.maghrib.totalSec },
        { key: 'isha', name: 'العشاء', sec: p.isha.totalSec }
    ];

    let nextPrayer = null;
    let diffSec = 0;

    for (const item of prayerList) {
        if (currentSec < item.sec) {
            nextPrayer = item;
            diffSec = item.sec - currentSec;
            break;
        }
    }

    if (!nextPrayer) {
        nextPrayer = prayerList[0];
        diffSec = (86400 - currentSec) + p.fajr.totalSec;
    }

    const remHours = Math.floor(diffSec / 3600);
    const remMins = Math.floor((diffSec % 3600) / 60);
    const remSecs = diffSec % 60;
    const shortCountdown = `${remHours > 0 ? remHours + ':' : ''}${remMins < 10 ? '0' + remMins : remMins}:${remSecs < 10 ? '0' + remSecs : remSecs}`;
    const detailedCountdown = `${remHours > 0 ? remHours + 'س و ' : ''}${remMins}د و ${remSecs}ث`;

    // 5. Update Header Pill
    const headerClock = document.getElementById('headerAlexandriaClock');
    const headerNextName = document.getElementById('headerNextPrayerName');
    const headerNextCountdown = document.getElementById('headerNextPrayerCountdown');
    if (headerClock) headerClock.textContent = alexTimeStr;
    if (headerNextName) headerNextName.textContent = nextPrayer.name;
    if (headerNextCountdown) headerNextCountdown.textContent = (remHours > 0 ? remHours + 'س و ' : '') + remMins + 'د';

    // 6. Update Sidebar Widget
    const sideClock = document.getElementById('sidebarAlexandriaClock');
    const sideDate = document.getElementById('sidebarAlexandriaDate');
    const sideNext = document.getElementById('sidebarAlexandriaNextCountdown');
    if (sideClock) sideClock.textContent = alexTimeStr;
    if (sideDate) sideDate.textContent = alexDateStr;
    if (sideNext) sideNext.textContent = `${nextPrayer.name} بعد ${shortCountdown}`;

    const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const key of prayerKeys) {
        const valEl = document.getElementById(`prayer_time_${key}`);
        const cardEl = document.getElementById(`prayer_card_${key}`);
        if (valEl && p[key]) valEl.textContent = p[key].time12;
        if (cardEl) {
            if (key === nextPrayer.key) {
                cardEl.className = 'p-1 rounded-lg bg-emerald-500/25 border border-emerald-400/60 ring-1 ring-emerald-400/50 shadow-sm transition-all';
                if (valEl) valEl.className = 'text-micro font-black text-emerald-200 mt-0.5';
            } else {
                cardEl.className = 'p-1 rounded-lg bg-black/40 border border-white/5 transition-all';
                if (valEl) valEl.className = 'text-micro font-bold text-slate-300 mt-0.5';
            }
        }
    }

    // Update School Day Schedule & Periods (الحصص والبريك والمرواح)
    updateSchoolScheduleUI(now);

    // 7. Update Modal
    const modalClock = document.getElementById('modalAlexandriaLiveClock');
    const modalDate = document.getElementById('modalAlexandriaFullDate');
    const modalNextName = document.getElementById('modalNextPrayerName');
    const modalNextCountdown = document.getElementById('modalNextPrayerCountdown');
    if (modalClock) modalClock.textContent = alexTimeStr;
    if (modalDate) modalDate.textContent = alexDateStr;
    if (modalNextName) modalNextName.textContent = nextPrayer.name;
    if (modalNextCountdown) modalNextCountdown.textContent = `باقي: ${detailedCountdown}`;

    const modalKeys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const key of modalKeys) {
        const mVal = document.getElementById(`modal_time_${key}`);
        const mRow = document.getElementById(`modal_row_${key}`);
        if (mVal && p[key]) mVal.textContent = p[key].time12;
        if (mRow) {
            if (key === nextPrayer.key) {
                mRow.className = 'p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900/90 border border-emerald-400/60 ring-1 ring-emerald-400/50 flex items-center justify-between transition-all shadow-md';
            } else if (key === 'sunrise') {
                mRow.className = 'p-2.5 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between text-slate-400 transition-all';
            } else {
                mRow.className = 'p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between transition-all';
            }
        }
    }
}

async function initAlexandriaPrayerEngine() {
    alexandriaPrayersData = calculateAlexandriaPrayersClient(new Date());
    tickAlexandriaClockAndPrayers();

    try {
        const res = await fetch('/api/alexandria-prayers');
        if (res.ok) {
            const data = await res.json();
            if (data && data.prayers) {
                alexandriaPrayersData = data.prayers;
                tickAlexandriaClockAndPrayers();
            }
        }
    } catch (err) {
        // Local calculation fallback is active
    }

    setInterval(tickAlexandriaClockAndPrayers, 1000);
}

function switchTimetableTab(tabName) {
    const tabBtnSchedule = document.getElementById('tabBtnSchoolSchedule');
    const tabBtnPrayers = document.getElementById('tabBtnPrayerTimes');
    const contentSchedule = document.getElementById('tabContentSchoolSchedule');
    const contentPrayers = document.getElementById('tabContentPrayerTimes');

    if (!tabBtnSchedule || !tabBtnPrayers || !contentSchedule || !contentPrayers) return;

    if (tabName === 'schedule') {
        tabBtnSchedule.className = 'flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm cursor-pointer';
        tabBtnPrayers.className = 'flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer';
        contentSchedule.classList.remove('hidden');
        contentPrayers.classList.add('hidden');
    } else {
        tabBtnPrayers.className = 'flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm cursor-pointer';
        tabBtnSchedule.className = 'flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer';
        contentPrayers.classList.remove('hidden');
        contentSchedule.classList.add('hidden');
    }
}

function openSchoolScheduleModal() {
    switchTimetableTab('schedule');
    tickAlexandriaClockAndPrayers();
    showModal('prayerTimesModal');
}

function openPrayerTimesModal(tab = 'prayers') {
    switchTimetableTab(tab);
    tickAlexandriaClockAndPrayers();
    showModal('prayerTimesModal');
}


// ----------------------------------------------------
// 16. Digital Tasbeeh & Classroom Barakah Engine 📿✨
// ----------------------------------------------------
const TASBEEH_AZKAR = [
    { id: 'subhanallah', title: 'سُبْحَانَ اللَّهِ', defaultTarget: 33 },
    { id: 'alhamdulillah', title: 'الْحَمْدُ لِلَّهِ', defaultTarget: 33 },
    { id: 'lailahaillallah', title: 'لَا إِلَهَ إِلَّا اللَّهُ', defaultTarget: 33 },
    { id: 'allahuakbar', title: 'اللَّهُ أَكْبَرُ', defaultTarget: 33 },
    { id: 'astaghfirullah', title: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', defaultTarget: 100 },
    { id: 'lahawla', title: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', defaultTarget: 100 },
    { id: 'salawat', title: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', defaultTarget: 100 },
    { id: 'subhan_wabihamdih', title: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ', defaultTarget: 100 },
    { id: 'hasbiyallah', title: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ', defaultTarget: 7 },
    { id: 'custom', title: 'ذِكْرٌ حُرٌّ', defaultTarget: 0 }
];

let tasbeehState = {
    selectedDhikrId: 'subhanallah',
    currentCount: 0,
    targetCount: 33,
    cycleCount: 1,
    soundEnabled: true,
    todayCount: 0,
    lifetimeCount: 0,
    classroomTotal: 0
};

// Web Audio API Sound Synthesizers for Offline Realistic Bead Click and Chime
function playTasbeehBeadClick() {
    if (!tasbeehState.soundEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Wooden bead click pitch
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650 + Math.random() * 50, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.035);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.035);
    } catch (e) {}
}

function playTasbeehGoalChime() {
    if (!tasbeehState.soundEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.2, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.25);
        });
    } catch (e) {}
}

function loadTasbeehStats() {
    try {
        const saved = JSON.parse(localStorage.getItem('no2ta_tasbeeh_stats') || '{}');
        const todayStr = new Date().toISOString().split('T')[0];
        if (saved.date === todayStr) {
            tasbeehState.todayCount = saved.today || 0;
        } else {
            tasbeehState.todayCount = 0;
        }
        tasbeehState.lifetimeCount = saved.lifetime || 0;
        tasbeehState.soundEnabled = saved.sound !== false;
    } catch (e) {}
}

function saveTasbeehStats() {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('no2ta_tasbeeh_stats', JSON.stringify({
            date: todayStr,
            today: tasbeehState.todayCount,
            lifetime: tasbeehState.lifetimeCount,
            sound: tasbeehState.soundEnabled
        }));
    } catch (e) {}
}

function renderTasbeehDhikrList() {
    const listEl = document.getElementById('tasbeehDhikrList');
    if (!listEl) return;

    listEl.innerHTML = TASBEEH_AZKAR.map(item => {
        const isSelected = item.id === tasbeehState.selectedDhikrId;
        return `
            <button onclick="selectTasbeehDhikr('${item.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5'
            }">
                ${item.title}
            </button>
        `;
    }).join('');
}

function updateTasbeehUI() {
    const currentDhikr = TASBEEH_AZKAR.find(d => d.id === tasbeehState.selectedDhikrId) || TASBEEH_AZKAR[0];

    const titleEl = document.getElementById('tasbeehCurrentDhikrTitle');
    const countEl = document.getElementById('tasbeehCountDisplay');
    const targetEl = document.getElementById('tasbeehTargetDisplay');
    const cycleEl = document.getElementById('tasbeehCycleCount');
    const todayEl = document.getElementById('tasbeehTodayCount');
    const lifetimeEl = document.getElementById('tasbeehLifetimeCount');
    const classroomEl = document.getElementById('tasbeehClassroomTotal');
    const circleRing = document.getElementById('tasbeehProgressCircle');
    const soundIconOn = document.getElementById('tasbeehSoundIconOn');
    const soundIconOff = document.getElementById('tasbeehSoundIconOff');

    if (titleEl) titleEl.textContent = currentDhikr.title;
    if (countEl) countEl.textContent = tasbeehState.currentCount;
    if (targetEl) targetEl.textContent = tasbeehState.targetCount > 0 ? tasbeehState.targetCount : '∞';
    if (cycleEl) cycleEl.textContent = tasbeehState.cycleCount;
    if (todayEl) todayEl.textContent = tasbeehState.todayCount.toLocaleString('ar-EG');
    if (lifetimeEl) lifetimeEl.textContent = tasbeehState.lifetimeCount.toLocaleString('ar-EG');
    if (classroomEl) classroomEl.textContent = tasbeehState.classroomTotal.toLocaleString('ar-EG');
    if (soundIconOn) soundIconOn.classList.toggle('hidden', !tasbeehState.soundEnabled);
    if (soundIconOff) soundIconOff.classList.toggle('hidden', tasbeehState.soundEnabled);

    [33, 100, 0].forEach(val => {
        const btn = document.getElementById(`targetBtn_${val}`);
        if (btn) {
            if (tasbeehState.targetCount === val) {
                btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 transition';
            } else {
                btn.className = 'px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition';
            }
        }
    });

    if (circleRing) {
        if (tasbeehState.targetCount > 0) {
            const fraction = Math.min(tasbeehState.currentCount / tasbeehState.targetCount, 1);
            const offset = 440 - (440 * fraction);
            circleRing.style.strokeDashoffset = offset;
            if (fraction >= 1) {
                circleRing.classList.remove('text-amber-400');
                circleRing.classList.add('text-emerald-400');
            } else {
                circleRing.classList.remove('text-emerald-400');
                circleRing.classList.add('text-amber-400');
            }
        } else {
            circleRing.style.strokeDashoffset = 0;
            circleRing.classList.remove('text-emerald-400');
            circleRing.classList.add('text-amber-400');
        }
    }
}

function incrementTasbeeh() {
    const currentDhikr = TASBEEH_AZKAR.find(d => d.id === tasbeehState.selectedDhikrId) || TASBEEH_AZKAR[0];

    if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch (e) {}
    }

    const circle = document.getElementById('tasbeehCounterCircle');
    if (circle) {
        circle.classList.add('scale-95');
        setTimeout(() => circle.classList.remove('scale-95'), 120);
    }

    tasbeehState.currentCount++;
    tasbeehState.todayCount++;
    tasbeehState.lifetimeCount++;
    tasbeehState.classroomTotal++;

    if (tasbeehState.targetCount > 0 && tasbeehState.currentCount >= tasbeehState.targetCount) {
        playTasbeehGoalChime();
        tasbeehState.cycleCount++;

        if (circle) {
            circle.classList.add('ring-4', 'ring-emerald-400', 'bg-emerald-950/40');
            setTimeout(() => {
                circle.classList.remove('ring-4', 'ring-emerald-400', 'bg-emerald-950/40');
            }, 600);
        }

        const currentIdx = TASBEEH_AZKAR.findIndex(d => d.id === tasbeehState.selectedDhikrId);
        if (tasbeehState.targetCount === 33 && currentIdx >= 0 && currentIdx < 3) {
            tasbeehState.selectedDhikrId = TASBEEH_AZKAR[currentIdx + 1].id;
            tasbeehState.currentCount = 0;
            renderTasbeehDhikrList();
            showNotification(`ما شاء الله! تمت الدورة بنجاح. الذكر التالي: ${TASBEEH_AZKAR[currentIdx + 1].title} 🌟`);
        } else {
            tasbeehState.currentCount = 0;
        }
    }

    saveTasbeehStats();
    updateTasbeehUI();

    if (STATE.socket && STATE.socket.connected) {
        STATE.socket.emit('tasbeeh_increment', {
            count: 1,
            dhikrId: currentDhikr ? currentDhikr.id : 'subhanallah',
            dhikrTitle: currentDhikr ? currentDhikr.title : 'سُبْحَانَ اللَّهِ',
            senderName: STATE.user ? STATE.user.nickname : 'زميل'
        });
    } else {
        if (currentDhikr) {
            playDhikrAudioPhrase(currentDhikr.id, currentDhikr.title);
        }
    }
}

function resetCurrentTasbeeh() {
    if (confirm('هل تريد تصفير عداد الذكر الحالي والبدء من جديد؟ 🔄')) {
        tasbeehState.currentCount = 0;
        tasbeehState.cycleCount = 1;
        updateTasbeehUI();
    }
}

function setTasbeehTarget(target) {
    tasbeehState.targetCount = target;
    tasbeehState.currentCount = 0;
    updateTasbeehUI();
}

function selectTasbeehDhikr(dhikrId) {
    const item = TASBEEH_AZKAR.find(d => d.id === dhikrId);
    if (!item) return;

    tasbeehState.selectedDhikrId = dhikrId;
    tasbeehState.targetCount = item.defaultTarget;
    tasbeehState.currentCount = 0;
    tasbeehState.cycleCount = 1;

    renderTasbeehDhikrList();
    updateTasbeehUI();
}

function toggleTasbeehSound() {
    tasbeehState.soundEnabled = !tasbeehState.soundEnabled;
    saveTasbeehStats();
    updateTasbeehUI();
}

function openTasbeehModal() {
    loadTasbeehStats();
    renderTasbeehDhikrList();
    updateTasbeehUI();
    showModal('tasbeehModal');
}

function initTasbeehEngine() {
    loadTasbeehStats();

    fetch('/api/tasbeeh')
        .then(r => r.json())
        .then(d => {
            if (d && typeof d.total !== 'undefined') {
                tasbeehState.classroomTotal = d.total;
                const el = document.getElementById('tasbeehClassroomTotal');
                if (el) el.textContent = d.total.toLocaleString('ar-EG');
            }
        })
        .catch(() => {});

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            const modal = document.getElementById('tasbeehModal');
            if (modal && !modal.classList.contains('hidden')) {
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                e.preventDefault();
                incrementTasbeeh();
            }
        }
    });
}


// ----------------------------------------------------
// 17. School Day Schedule & Countdown Engine (الحصص والبريك والمرواح) 🏫🔔
// ----------------------------------------------------
function calculateSchoolSchedule(now = new Date()) {
    let dayName = 'Sun';
    let h = 0, m = 0, s = 0;
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Cairo',
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        }).formatToParts(now);

        dayName = parts.find(p => p.type === 'weekday')?.value || 'Sun';
        h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        s = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
    } catch (e) {
        dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
        h = now.getHours();
        m = now.getMinutes();
        s = now.getSeconds();
    }

    const curSec = (h * 60 + m) * 60 + s;
    const isThursday = (dayName === 'Thu');
    const isWeekend = (dayName === 'Fri' || dayName === 'Sat');

    // 8 Sessions of 55 minutes each starting at 7:30 AM
    // Break at 11:10 for 40 minutes (ends 11:50)
    const schedule = [
        { type: 'session', num: 1, name: 'الحصة الأولى', startSec: (7 * 60 + 30) * 60, endSec: (8 * 60 + 25) * 60 },
        { type: 'session', num: 2, name: 'الحصة الثانية', startSec: (8 * 60 + 25) * 60, endSec: (9 * 60 + 20) * 60 },
        { type: 'session', num: 3, name: 'الحصة الثالثة', startSec: (9 * 60 + 20) * 60, endSec: (10 * 60 + 15) * 60 },
        { type: 'session', num: 4, name: 'الحصة الرابعة', startSec: (10 * 60 + 15) * 60, endSec: (11 * 60 + 10) * 60 },
        { type: 'break', num: 0, name: 'البريك / الفسحة ☕', startSec: (11 * 60 + 10) * 60, endSec: (11 * 60 + 50) * 60 },
        { type: 'session', num: 5, name: 'الحصة الخامسة', startSec: (11 * 60 + 50) * 60, endSec: (12 * 60 + 45) * 60 },
        { type: 'session', num: 6, name: 'الحصة السادسة', startSec: (12 * 60 + 45) * 60, endSec: (13 * 60 + 40) * 60 },
        { type: 'session', num: 7, name: 'الحصة السابعة', startSec: (13 * 60 + 40) * 60, endSec: (14 * 60 + 35) * 60 },
        { type: 'session', num: 8, name: 'الحصة الثامنة', startSec: (14 * 60 + 35) * 60, endSec: (15 * 60 + 30) * 60 }
    ];

    const breakStart = (11 * 60 + 10) * 60;
    const breakEnd = (11 * 60 + 50) * 60;
    const bionicStart = (15 * 60 + 30) * 60;
    const dismissalSec = isThursday ? (15 * 60 + 30) * 60 : (16 * 60) * 60;

    let currentItem = schedule.find(item => curSec >= item.startSec && curSec < item.endSec);
    let inBionic = (!isThursday && curSec >= bionicStart && curSec < dismissalSec);

    function fmtRemaining(sec) {
        if (sec <= 0) return '0د';
        const rh = Math.floor(sec / 3600);
        const rm = Math.floor((sec % 3600) / 60);
        const rs = sec % 60;
        if (rh > 0) return `${rh}س و ${rm}د`;
        if (rm > 0) return `${rm}د و ${rs}ث`;
        return `${rs}ث`;
    }

    // 1. Break text
    let breakText = '';
    let breakShortText = '';
    if (isWeekend) {
        breakText = 'إجازة الويك إند';
        breakShortText = 'ويك إند';
    } else if (curSec < breakStart) {
        breakText = 'فاضل: ' + fmtRemaining(breakStart - curSec);
        breakShortText = 'البريك: ' + fmtRemaining(breakStart - curSec);
    } else if (curSec >= breakStart && curSec < breakEnd) {
        breakText = 'شغال الآن! (فاضل ' + fmtRemaining(breakEnd - curSec) + ')';
        breakShortText = 'بريك (باقي ' + fmtRemaining(breakEnd - curSec) + ')';
    } else {
        breakText = 'انتهى البريك اليوم';
        breakShortText = 'انتهى البريك';
    }

    // 2. Dismissal text
    let dismissalText = '';
    if (isWeekend) {
        dismissalText = 'إجازة الويك إند';
    } else if (curSec < dismissalSec) {
        dismissalText = 'فاضل: ' + fmtRemaining(dismissalSec - curSec);
    } else {
        dismissalText = 'انتهى اليوم';
    }

    // 3. Bionic text
    let bionicText = '';
    if (isWeekend) {
        bionicText = 'إجازة';
    } else if (isThursday) {
        bionicText = 'مفيش الخميس';
    } else if (curSec < bionicStart) {
        bionicText = 'فاضل: ' + fmtRemaining(bionicStart - curSec);
    } else if (curSec >= bionicStart && curSec < dismissalSec) {
        bionicText = 'شغال الآن 🔬';
    } else {
        bionicText = 'انتهى اليوم';
    }

    // 4. Session status & timer
    let statusBadge = '';
    let sessionTimer = '';
    let sessionShortBadge = '';

    if (isWeekend) {
        statusBadge = 'إجازة نهاية الأسبوع';
        sessionShortBadge = 'ويك إند';
        sessionTimer = 'نلقاكم الأحد بإذن الله';
    } else if (currentItem) {
        const rem = currentItem.endSec - curSec;
        if (currentItem.type === 'break') {
            statusBadge = 'وقت البريك ☕ (11:10 - 11:50)';
            sessionShortBadge = 'بريك ☕';
            sessionTimer = 'نهاية البريك: ' + fmtRemaining(rem);
        } else {
            statusBadge = currentItem.name + ` (${currentItem.num})`;
            sessionShortBadge = `الحصة ${currentItem.num}`;
            sessionTimer = `فاضل ع الحصة ${currentItem.num}: ` + fmtRemaining(rem);
        }
    } else if (inBionic) {
        statusBadge = 'وقت البايونيك 🔬 (3:30 - 4:00)';
        sessionShortBadge = 'بايونيك 🔬';
        sessionTimer = 'فاضل ع المرواح: ' + fmtRemaining(dismissalSec - curSec);
    } else if (curSec < schedule[0].startSec) {
        statusBadge = 'قبل طابور اليوم (يبدأ 7:30 ص)';
        sessionShortBadge = 'قبل الحصص';
        sessionTimer = 'فاضل ع الحصة 1: ' + fmtRemaining(schedule[0].startSec - curSec);
    } else {
        statusBadge = 'انتهى اليوم الدراسي 🏠';
        sessionShortBadge = 'مرواح 🏠';
        sessionTimer = 'وقت المرواح 🏠 نراك غداً';
    }

    const timetableRows = [
        { num: 1, name: 'الحصة الأولى', time: '07:30 ص - 08:25 ص', duration: '55 دقيقة', icon: '1️⃣', startSec: (7 * 60 + 30) * 60, endSec: (8 * 60 + 25) * 60, type: 'session' },
        { num: 2, name: 'الحصة الثانية', time: '08:25 ص - 09:20 ص', duration: '55 دقيقة', icon: '2️⃣', startSec: (8 * 60 + 25) * 60, endSec: (9 * 60 + 20) * 60, type: 'session' },
        { num: 3, name: 'الحصة الثالثة', time: '09:20 ص - 10:15 ص', duration: '55 دقيقة', icon: '3️⃣', startSec: (9 * 60 + 20) * 60, endSec: (10 * 60 + 15) * 60, type: 'session' },
        { num: 4, name: 'الحصة الرابعة', time: '10:15 ص - 11:10 ص', duration: '55 دقيقة', icon: '4️⃣', startSec: (10 * 60 + 15) * 60, endSec: (11 * 60 + 10) * 60, type: 'session' },
        { num: 0, name: 'البريك / الفسحة المدرسية', time: '11:10 ص - 11:50 ص', duration: '40 دقيقة', icon: '☕', startSec: (11 * 60 + 10) * 60, endSec: (11 * 60 + 50) * 60, type: 'break' },
        { num: 5, name: 'الحصة الخامسة', time: '11:50 ص - 12:45 م', duration: '55 دقيقة', icon: '5️⃣', startSec: (11 * 60 + 50) * 60, endSec: (12 * 60 + 45) * 60, type: 'session' },
        { num: 6, name: 'الحصة السادسة', time: '12:45 م - 01:40 م', duration: '55 دقيقة', icon: '6️⃣', startSec: (12 * 60 + 45) * 60, endSec: (13 * 60 + 40) * 60, type: 'session' },
        { num: 7, name: 'الحصة السابعة', time: '01:40 م - 02:35 م', duration: '55 دقيقة', icon: '7️⃣', startSec: (13 * 60 + 40) * 60, endSec: (14 * 60 + 35) * 60, type: 'session' },
        { num: 8, name: 'الحصة الثامنة', time: '02:35 م - 03:30 م', duration: '55 دقيقة', icon: '8️⃣', startSec: (14 * 60 + 35) * 60, endSec: (15 * 60 + 30) * 60, type: 'session' },
        { num: 0, name: 'فترة البايونيك (Bionic)', time: '03:30 م - 04:00 م', duration: '30 دقيقة', icon: '🔬', startSec: (15 * 60 + 30) * 60, endSec: (16 * 60) * 60, type: 'bionic' },
        { num: 0, name: 'المرواح ونهاية اليوم الدراسي', time: isThursday ? '03:30 م فوراً' : '04:00 م', duration: 'نهاية اليوم', icon: '🏠', startSec: (isThursday ? 15.5 : 16) * 3600, endSec: 24 * 3600, type: 'dismissal' }
    ];

    return {
        isWeekend, isThursday, curSec, fmtRemaining,
        schedule, timetableRows,
        statusBadge, sessionShortBadge, sessionTimer,
        breakText, breakShortText,
        bionicText, dismissalText
    };
}

function updateSchoolScheduleUI(now = new Date()) {
    const school = calculateSchoolSchedule(now);

    // Update Header Pill
    const headerBadge = document.getElementById('headerSchoolStatusBadge');
    const headerBreak = document.getElementById('headerSchoolBreakCountdown');
    if (headerBadge) headerBadge.textContent = school.sessionShortBadge;
    if (headerBreak) headerBreak.textContent = school.breakShortText;

    // Update Sidebar Widget
    const sideSessionBadge = document.getElementById('sidebarSchoolSessionBadge');
    const sideSessionCountdown = document.getElementById('sidebarSchoolSessionCountdown');
    const sideBreakCountdown = document.getElementById('sidebarSchoolBreakCountdown');
    const sideBionicCountdown = document.getElementById('sidebarSchoolBionicCountdown');
    const sideDismissalCountdown = document.getElementById('sidebarSchoolDismissalCountdown');
    const sideDismissalLabel = document.getElementById('sidebarSchoolDismissalLabel');
    const sideBionicLabel = document.getElementById('sidebarSchoolBionicLabel');

    if (sideSessionBadge) sideSessionBadge.textContent = school.statusBadge;
    if (sideSessionCountdown) sideSessionCountdown.textContent = school.sessionTimer;
    if (sideBreakCountdown) sideBreakCountdown.textContent = school.breakText;
    if (sideBionicCountdown) sideBionicCountdown.textContent = school.bionicText;
    if (sideDismissalCountdown) sideDismissalCountdown.textContent = school.dismissalText;
    if (sideDismissalLabel) sideDismissalLabel.textContent = school.isThursday ? 'المرواح (3:30)' : 'المرواح (4:00)';
    if (sideBionicLabel) sideBionicLabel.textContent = school.isThursday ? 'مفيش بايونيك' : 'البايونيك (3:30)';

    // Update Modal Hero
    const mStatus = document.getElementById('modalSchoolCurrentStatus');
    const mTimer = document.getElementById('modalSchoolSessionTimer');
    const mBreak = document.getElementById('modalSchoolBreakTimer');
    const mBionic = document.getElementById('modalSchoolBionicTimer');
    const mDismissal = document.getElementById('modalSchoolDismissalTimer');
    const mBionicHeader = document.getElementById('modalSchoolBionicHeader');
    const mDismissalHeader = document.getElementById('modalSchoolDismissalHeader');

    if (mStatus) mStatus.textContent = school.statusBadge;
    if (mTimer) mTimer.textContent = school.sessionTimer;
    if (mBreak) mBreak.textContent = school.breakText;
    if (mBionic) mBionic.textContent = school.bionicText;
    if (mDismissal) mDismissal.textContent = school.dismissalText;
    if (mBionicHeader) mBionicHeader.textContent = school.isThursday ? '🔬 مفيش بايونيك' : '🔬 البايونيك (3:30)';
    if (mDismissalHeader) mDismissalHeader.textContent = school.isThursday ? '🏠 المرواح (3:30)' : '🏠 المرواح (4:00)';

    // Render Full Timetable Table Rows
    const container = document.getElementById('modalScheduleRowsContainer');
    if (container && school.timetableRows) {
        let rowsHtml = '';
        school.timetableRows.forEach(item => {
            const isBionicOnThu = (school.isThursday && item.type === 'bionic');
            const isActive = !school.isWeekend && !isBionicOnThu && (school.curSec >= item.startSec && school.curSec < item.endSec);
            const isPassed = !school.isWeekend && (school.curSec >= item.endSec) && !isBionicOnThu;
            
            let statusBadge = '';
            let rowBgClass = 'hover:bg-white/5 transition';

            if (school.isWeekend) {
                statusBadge = '<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-micro">ويك إند</span>';
            } else if (isBionicOnThu) {
                statusBadge = '<span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-micro border border-purple-500/20">❌ مفيش بايونيك الخميس</span>';
                rowBgClass = 'opacity-40 line-through bg-black/20';
            } else if (isActive) {
                const rem = school.fmtRemaining(item.endSec - school.curSec);
                statusBadge = `<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-micro animate-pulse">🟢 جارية الآن (باقي ${rem})</span>`;
                rowBgClass = 'bg-cyan-500/15 border-r-4 border-r-cyan-400 font-bold shadow-inner';
            } else if (isPassed) {
                statusBadge = '<span class="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-micro">✓ انتهت</span>';
                rowBgClass = 'opacity-60';
            } else {
                const until = school.fmtRemaining(item.startSec - school.curSec);
                statusBadge = `<span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-micro border border-white/5">قادمة (بعد ${until})</span>`;
            }

            const nameColor = item.type === 'break' ? 'text-amber-300 font-bold' : (item.type === 'bionic' ? 'text-purple-300 font-bold' : (item.type === 'dismissal' ? 'text-emerald-300 font-bold' : 'text-white font-medium'));

            rowsHtml += `
                <div class="p-2.5 flex items-center justify-between gap-2 ${rowBgClass}">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-base shrink-0">${item.icon}</span>
                        <div class="truncate">
                            <span class="${nameColor} block truncate text-xs">${item.name}</span>
                            <span class="text-micro text-slate-400 font-mono block mt-0.5">${item.time} • <span class="text-slate-500">${item.duration}</span></span>
                        </div>
                    </div>
                    <div class="shrink-0 text-left">
                        ${statusBadge}
                    </div>
                </div>
            `;
        });
        container.innerHTML = rowsHtml;
    }

    const dayBadge = document.getElementById('modalScheduleDayBadge');
    if (dayBadge) {
        if (school.isWeekend) {
            dayBadge.textContent = 'إجازة الويك إند';
            dayBadge.className = 'text-micro px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-bold';
        } else if (school.isThursday) {
            dayBadge.textContent = 'يوم الخميس • المرواح 3:30 م (بدون بايونيك)';
            dayBadge.className = 'text-micro px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold';
        } else {
            dayBadge.textContent = '8 حصص + بريك + بايونيك (المرواح 4:00)';
            dayBadge.className = 'text-micro px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold';
        }
    }
}


// ----------------------------------------------------
// 18. Arabic Real Audio Voice & Synchronized Salawat Engine 🕋🔊
const DHIKR_AUDIO_MAP = {
    'subhanallah': '/audio/human_subhanallah.wav',
    'alhamdulillah': '/audio/human_alhamdulillah.wav',
    'lailahaillallah': '/audio/human_lailahaillallah.wav',
    'allahuakbar': '/audio/human_allahuakbar.wav',
    'astaghfirullah': '/audio/human_astaghfirullah.wav',
    'lahawla': '/audio/human_lahawla.wav',
    'salawat': '/audio/human_salawat.mp3',
    'subhan_wabihamdih': '/audio/human_subhan_wabihamdih.wav',
    'hasbiyallah': '/audio/hasbiyallah.mp3'
};

const SALAWAT_HUMAN_VOICES = {
    'voice1': '/audio/human_salawat.mp3',      // صلِّ على النبي ﷺ
    'voice2': '/audio/human_salawat_10.wav',   // اللهم صلِّ على محمد ﷺ
    'voice3': '/audio/human_salawat_15.wav'    // صلِّ على النبي ﷺ نداء
};

// Pre-create Audio instances for instant human voice playback
const PRELOADED_DHIKR_AUDIO = {};
Object.keys(DHIKR_AUDIO_MAP).forEach(key => {
    try {
        const aud = new Audio(DHIKR_AUDIO_MAP[key]);
        aud.preload = 'auto';
        PRELOADED_DHIKR_AUDIO[key] = aud;
    } catch (e) {}
});

const PRELOADED_SALAWAT_AUDIO = {};
Object.keys(SALAWAT_HUMAN_VOICES).forEach(key => {
    try {
        const aud = new Audio(SALAWAT_HUMAN_VOICES[key]);
        aud.preload = 'auto';
        PRELOADED_SALAWAT_AUDIO[key] = aud;
    } catch (e) {}
});

// Browsers block audio.play() that isn't triggered by a direct user gesture — which is
// exactly how Salawat/Dhikr broadcasts arrive (a socket event, not a click). Priming every
// preloaded clip with a muted play+pause the moment the student FIRST touches the page at
// all unlocks autoplay for the rest of the session, so later broadcasts never silently fail.
let audioUnlockedForSession = false;
function unlockAllPreloadedAudioOnce() {
    if (audioUnlockedForSession) return;
    audioUnlockedForSession = true;
    [...Object.values(PRELOADED_SALAWAT_AUDIO), ...Object.values(PRELOADED_DHIKR_AUDIO || {})].forEach(aud => {
        try {
            const wasMuted = aud.muted;
            aud.muted = true;
            const p = aud.play();
            if (p !== undefined) {
                p.then(() => { aud.pause(); aud.currentTime = 0; aud.muted = wasMuted; })
                 .catch(() => { aud.muted = wasMuted; });
            }
        } catch (e) {}
    });
    document.removeEventListener('click', unlockAllPreloadedAudioOnce);
    document.removeEventListener('touchstart', unlockAllPreloadedAudioOnce);
    document.removeEventListener('keydown', unlockAllPreloadedAudioOnce);
}
document.addEventListener('click', unlockAllPreloadedAudioOnce, { once: true });
document.addEventListener('touchstart', unlockAllPreloadedAudioOnce, { once: true });
document.addEventListener('keydown', unlockAllPreloadedAudioOnce, { once: true });

let activeDhikrAudio = null;
let salawatSelectedSound = 'voice1'; // ONLY human voices: 'voice1', 'voice2', 'voice3'

function selectSalawatVoice(type) {
    salawatSelectedSound = type || 'voice1';
    ['voice1', 'voice2', 'voice3'].forEach(vKey => {
        const btn = document.getElementById('voiceOpt_' + vKey);
        if (btn) {
            if (vKey === salawatSelectedSound) {
                btn.className = 'py-1 px-1.5 rounded-lg text-center transition bg-amber-500 text-slate-950 shadow-sm cursor-pointer border border-amber-400 font-bold';
            } else {
                btn.className = 'py-1 px-1.5 rounded-lg text-center transition bg-black/40 text-slate-300 hover:text-white cursor-pointer border border-white/5';
            }
        }
    });
    playSalawatVoice(salawatSelectedSound);
}

function testSalawatAudioVoice() {
    playSalawatVoice(salawatSelectedSound);
}

function playDhikrAudioPhrase(dhikrId, fallbackText = '') {
    if (!tasbeehState.soundEnabled) return;

    try {
        const audioSrc = DHIKR_AUDIO_MAP[dhikrId] || '/audio/human_subhanallah.wav';
        const fresh = new Audio(audioSrc);
        fresh.volume = 1.0;
        activeDhikrAudio = fresh;

        const playPromise = fresh.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn('Dhikr audio playback error (user interaction needed):', err);
            });
        }
    } catch (e) {
        console.error('playDhikrAudioPhrase error:', e);
    }
}

function showDhikrFloatingToast(data) {
    if (!data || !data.dhikrTitle) return;
    let toast = document.getElementById('globalDhikrToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalDhikrToast';
        toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-slate-900/90 border border-emerald-500/50 shadow-2xl backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 pointer-events-none transition-all duration-300 opacity-0 -translate-y-2';
        document.body.appendChild(toast);
    }

    toast.innerHTML = `<i data-lucide="circle-dot-dashed" class="w-4 h-4 text-emerald-400 shrink-0"></i> <span>${data.senderName || 'زميل'}:</span> <span class="text-emerald-300 font-black text-sm">${data.dhikrTitle}</span>`;
    renderIcons();
    toast.classList.remove('opacity-0', '-translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    if (window._dhikrToastTimer) clearTimeout(window._dhikrToastTimer);
    window._dhikrToastTimer = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-2');
    }, 2200);
}

function playSalawatVoice(soundType = 'voice1') {
    if (!tasbeehState.soundEnabled) return;

    const voiceKey = SALAWAT_HUMAN_VOICES[soundType] ? soundType : 'voice1';
    const soundPath = SALAWAT_HUMAN_VOICES[voiceKey];

    try {
        let audio = PRELOADED_SALAWAT_AUDIO[voiceKey];
        if (!audio) {
            audio = new Audio(soundPath);
            PRELOADED_SALAWAT_AUDIO[voiceKey] = audio;
        }

        audio.currentTime = 0;
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn('Human Salawat voice play error, fresh fallback:', err);
                const fresh = new Audio(soundPath);
                fresh.volume = 1.0;
                fresh.play().catch(e => console.warn('Fresh salawat play error:', e));
            });
        }
    } catch (e) {
        console.error('playSalawatVoice error:', e);
    }
}

function playSalawatBellChime() {
    // Only used if audio completely fails
}

let salawatBannerTimer = null;

function handleSalawatBroadcast(data = {}) {
    console.log('🕋 [SALAWAT] Received synchronized broadcast across lab devices (HUMAN VOICE):', data);

    // 1. Play real human voice ONLY!
    const soundToPlay = (data && data.soundType && SALAWAT_HUMAN_VOICES[data.soundType]) ? data.soundType : (salawatSelectedSound || 'voice1');
    playSalawatVoice(soundToPlay);

    // 2. Show glowing banner across screen
    const banner = document.getElementById('globalSalawatBanner');
    if (banner) {
        banner.classList.remove('hidden');
        setTimeout(() => {
            banner.classList.remove('-translate-y-6', 'opacity-0');
            banner.classList.add('translate-y-0', 'opacity-100');
        }, 50);

        if (salawatBannerTimer) clearTimeout(salawatBannerTimer);
        salawatBannerTimer = setTimeout(() => {
            banner.classList.remove('translate-y-0', 'opacity-100');
            banner.classList.add('-translate-y-6', 'opacity-0');
            setTimeout(() => banner.classList.add('hidden'), 500);
        }, 7000);
    }
}

function triggerClassroomSalawat(soundType = null) {
    const selected = (soundType && SALAWAT_HUMAN_VOICES[soundType]) ? soundType : (salawatSelectedSound || 'voice1');
    if (STATE.socket && STATE.socket.connected) {
        STATE.socket.emit('admin_trigger_salawat', { soundType: selected });
        showNotification('تم إطلاق صوت "صلِّ على محمد ﷺ" (صوت بشري 🎙️) لجميع الأجهزة بالمعمل!');
    } else {
        handleSalawatBroadcast({ soundType: selected });
    }
}
