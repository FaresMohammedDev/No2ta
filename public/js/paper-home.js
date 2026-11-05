/* New home reads existing application state; feature handlers remain authoritative. */
(() => {
    const $ = id => document.getElementById(id);
    let view = 'home';
    let signatures = {};
    function text(id, value) { const el = $(id); if (el && el.textContent !== String(value)) el.textContent = value; }
    function icon(name) { const el = document.createElement('i'); el.dataset.lucide = name; return el; }
    function button(label, action, classes = 'n-btn') { const el = document.createElement('button'); el.type = 'button'; el.className = classes; el.textContent = label; el.addEventListener('click', action); return el; }
    function show(next = 'home', section) {
        const previousView = view;
        view = next === 'chat' ? 'chat' : 'home';
        $('paperHome').hidden = view !== 'home';
        $('legacyChat').hidden = view !== 'chat';
        $('classroomHeader').hidden = true;
        document.body.classList.toggle('paper-chat-open', view === 'chat');
        $('legacyStories').hidden = true;
        document.querySelectorAll('[data-paper-nav]').forEach(el => {
            if (el.dataset.paperNav === (section || view)) el.setAttribute('aria-current', 'page');
            else el.removeAttribute('aria-current');
        });
        if (section) $(section)?.scrollIntoView({ behavior: 'auto', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'auto' });
        if (view === 'chat' && previousView !== 'chat') {
            requestAnimationFrame(scrollToBottom);
        }
        render();
    }
    function openChats() {
        if (STATE.activeChat.type === 'direct' && STATE.activeChat.recipient) selectDirectChat(STATE.activeChat.recipient.id);
        else if (STATE.activeChat.type === 'group' && STATE.activeChat.group) selectGroupChat(STATE.activeChat.group.id);
        else selectGeneralChat();
    }
    function closeChatList() {
        $('legacyChat').classList.remove('paper-show-list');
        $('paperChatListToggle').setAttribute('aria-expanded', 'false');
    }
    function toggleChatList() {
        const expanded = $('legacyChat').classList.toggle('paper-show-list');
        $('paperChatListToggle').setAttribute('aria-expanded', String(expanded));
        if (expanded) $('tabGeneralBtn').focus();
    }
    function closeTimer(returnFocus = false) {
        $('paperTimerMenu').hidden = true;
        $('disappearingToggleBtn').setAttribute('aria-expanded', 'false');
        if (returnFocus) $('disappearingToggleBtn').focus();
    }
    function toggleTimer() {
        const open = $('paperTimerMenu').hidden;
        $('paperTimerMenu').hidden = !open;
        $('disappearingToggleBtn').setAttribute('aria-expanded', String(open));
        if (open) $('paperTimerMenu').querySelector('button').focus();
    }
    function recentChats() {
        const recent = STATE.users.filter(u => u.id !== STATE.user?.id && u.last_message_at)
            .sort((a, b) => String(b.last_message_at).localeCompare(String(a.last_message_at))).slice(0, 4);
        const signature = JSON.stringify(recent.map(u => [u.id,u.nickname,u.last_message_text,u.unread_count]));
        if (signatures.chats === signature) return;
        signatures.chats = signature;
        const target = $('paperRecent'); target.replaceChildren();
        const general = button('', () => { show('chat'); selectGeneralChat(); }, 'paper-person');
        const avatar = document.createElement('span'); avatar.className = 'n-avatar'; avatar.append(icon('messages-square'));
        const desc = document.createElement('div'); desc.className = 'paper-person-info';
        const title = document.createElement('strong'); title.textContent = 'شات الفصل';
        const sub = document.createElement('small'); sub.textContent = 'المكان اللي بيجمعنا كلنا'; desc.append(title,sub); general.append(avatar,desc,icon('arrow-left')); target.append(general);
        for (const user of recent) {
            const row = button('', () => selectDirectChat(user.id), 'paper-person');
            const avatar = document.createElement('span'); avatar.className = 'n-avatar'; avatar.textContent = Array.from(user.nickname || 'ز')[0];
            const info = document.createElement('div'); info.className = 'paper-person-info';
            const name = document.createElement('strong'); name.textContent = user.nickname;
            const preview = document.createElement('small'); preview.textContent = user.last_message_text || 'مرفق في المحادثة'; info.append(name,preview); row.append(avatar,info);
            if (Number(user.unread_count) > 0) { const badge = document.createElement('span'); badge.className = 'n-badge'; badge.textContent = user.unread_count; row.append(badge); }
            target.append(row);
        }
        if (!recent.length) { const empty = document.createElement('p'); empty.className = 'n-small n-muted'; empty.style.paddingBlock = '18px'; empty.textContent = 'محادثاتك الخاصة هتظهر هنا بعد أول رسالة. افتح المحادثات واختار زميلك.'; target.append(empty); }
    }
    function stories() {
        const signature = JSON.stringify(STATE.stories);
        if (signatures.stories === signature) return;
        signatures.stories = signature;
        const target = $('paperStories'); target.replaceChildren();
        const add = button('', openStoryCreator, 'paper-story paper-add-story'); add.append(icon('plus')); const label = document.createElement('strong'); label.textContent = 'شارك لحظة'; const hint = document.createElement('small'); hint.textContent = 'صورة، نص، أو فكرة'; add.append(label,hint); target.append(add);
        for (const group of STATE.stories) {
            const first = group.stories[0]; if (!first) continue;
            const card = button('', () => viewUserStories(group.userId), 'paper-story'); card.setAttribute('aria-label', 'استوري ' + group.authorName);
            const art = document.createElement('div'); art.className = 'paper-story-art';
            if (first.media_type === 'image' && first.media_url) { const image = document.createElement('img'); image.src = first.media_url; image.alt = ''; image.loading = 'lazy'; art.append(image); }
            else { const snippet = document.createElement('span'); snippet.textContent = first.text_content || (first.media_type === 'video' ? 'شاهد الفيديو' : 'لحظة من يومنا'); art.append(snippet); }
            const footer = document.createElement('div'); footer.className = 'paper-story-footer'; const name = document.createElement('span'); name.textContent = group.authorName; footer.append(name);
            if (group.hasUnseen) { const dot = document.createElement('span'); dot.className = 'unseen'; dot.setAttribute('aria-label','استوري جديد'); footer.append(dot); }
            card.append(art,footer); target.append(card);
        }
        if (!STATE.stories.length) { const empty = document.createElement('div'); empty.className = 'paper-story-empty'; const title = document.createElement('strong'); title.textContent = 'لسه اليوم في أوله'; const caption = document.createElement('span'); caption.className = 'n-small'; caption.textContent = 'أول استوري تشاركه هيظهر هنا لزمايلك.'; empty.append(title,caption); target.append(empty); }
    }
    function render() {
        if (!$('paperHome')) return;
        const connected = !!STATE.socket?.connected;
        text('paperConnection', connected ? 'متصل بالفصل' : STATE.user ? 'جاري الاتصال بالفصل…' : 'سجّل دخولك للمشاركة');
        $('paperConnection').classList.toggle('connected', connected);
        text('paperGreeting', STATE.user ? `أهلًا يا ${STATE.user.nickname}` : 'أهلًا بيك في نؤطة');
        text('paperOnline', `${STATE.onlineUserIds.size} متصل الآن`);
        $('paperAdmin').hidden = STATE.user?.role !== 'admin';
        $('paperMonitor').hidden = STATE.user?.role !== 'admin';
        const now = new Date();
        text('paperDate', now.toLocaleDateString('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',day:'numeric',month:'long'}));
        text('paperClock', now.toLocaleTimeString('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit'}));
        if (typeof calculateSchoolSchedule === 'function') {
            const schedule = calculateSchoolSchedule(now);
            text('paperSchool', schedule.statusBadge);
            text('paperBreak', schedule.breakText);
            text('paperDismissal', schedule.dismissalText);
            text('paperSessionTimer', schedule.sessionTimer);
        }
        text('paperNextPrayer', $('modalNextPrayerName')?.textContent || 'مواقيت الصلاة');
        text('paperPrayerCountdown', $('modalNextPrayerCountdown')?.textContent || 'جاري حساب المواقيت…');
        const share = STATE.screenShare.activeShareInfo;
        $('paperActivity').hidden = !share;
        if (share) text('paperActivityText', `${share.presenterName || 'أحد الزملاء'} بيشارك شاشته الآن`);
        if (view === 'home') { recentChats(); stories(); }
        // Only create newly inserted icon placeholders, not all existing SVGs each second.
        if (document.querySelector('#paperShell i[data-lucide], #paperHome i[data-lucide]')) renderIcons();
    }
    // ----------------------------------------------------
    // Theme Management Engine (Dark Mode / Light Mode) ☀️🌙
    // ----------------------------------------------------
    function getThemeMode() {
        const saved = localStorage.getItem('no2ta_theme_mode');
        if (saved === 'dark' || saved === 'light') return saved;
        return 'light'; // Default to light mode
    }

    function applyThemeMode(mode) {
        const isDark = (mode === 'dark');
        document.documentElement.setAttribute('data-theme', mode);
        document.documentElement.setAttribute('data-no2ta-theme', 'paper');
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }

        // Update Theme Toggle Button in Header
        const toggleBtn = document.getElementById('themeToggleBtn');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-label', isDark ? 'التبديل إلى الوضع الفاتح (Light Mode)' : 'التبديل إلى الوضع الداكن (Dark Mode)');
            toggleBtn.setAttribute('title', isDark ? 'التبديل إلى الوضع الفاتح (Light Mode)' : 'التبديل إلى الوضع الداكن (Dark Mode)');
            toggleBtn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" class="w-4 h-4"></i>`;
        }

        // Update Segmented buttons in profileModal if present
        const lightSelect = document.getElementById('themeSelectLightBtn');
        const darkSelect = document.getElementById('themeSelectDarkBtn');
        if (lightSelect && darkSelect) {
            if (isDark) {
                darkSelect.className = 'flex-1 py-2 px-3 rounded-xl border border-cyan-500 bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer';
                lightSelect.className = 'flex-1 py-2 px-3 rounded-xl border border-white/10 bg-black/20 text-slate-400 hover:text-white text-xs flex items-center justify-center gap-1.5 transition cursor-pointer';
            } else {
                lightSelect.className = 'flex-1 py-2 px-3 rounded-xl border border-emerald-600 bg-emerald-600/20 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer';
                darkSelect.className = 'flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white/40 text-slate-600 hover:text-slate-900 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer';
            }
        }

        // Sync with Stealth Exam iframe if present
        const iframe = document.getElementById('stealthIframe');
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.postMessage({ type: 'theme_change', mode }, '*');
            } catch (e) {}
        }

        if (typeof renderIcons === 'function') {
            renderIcons();
        }
    }

    function setThemeMode(mode) {
        if (mode !== 'dark' && mode !== 'light') return;
        try {
            localStorage.setItem('no2ta_theme_mode', mode);
        } catch (e) {}
        applyThemeMode(mode);
        if (typeof showNotification === 'function') {
            showNotification(mode === 'dark' ? '🌙 تم تفعيل الوضع الداكن (Dark Mode)' : '☀️ تم تفعيل الوضع الفاتح (Light Mode)');
        }
    }

    function toggleThemeMode() {
        const current = document.documentElement.getAttribute('data-theme') || getThemeMode();
        const next = (current === 'dark') ? 'light' : 'dark';
        setThemeMode(next);
    }

    window.getThemeMode = getThemeMode;
    window.applyThemeMode = applyThemeMode;
    window.setThemeMode = setThemeMode;
    window.toggleThemeMode = toggleThemeMode;

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'theme_change' && (e.data.mode === 'light' || e.data.mode === 'dark')) {
            applyThemeMode(e.data.mode);
        }
    });

    window.No2taHome = { show, render, openChats, closeChatList, toggleChatList, closeTimer, toggleTimer, isChatVisible: () => view === 'chat', getThemeMode, applyThemeMode, setThemeMode, toggleThemeMode };
    document.addEventListener('DOMContentLoaded', () => {
        $('legacyChat').addEventListener('keydown', event => {
            const card = event.target.closest('[role="button"][tabindex="0"]');
            if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); card.click(); }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !$('paperTimerMenu').hidden) closeTimer(true);
        });
        document.addEventListener('click', event => {
            if (!$('paperTimerMenu').contains(event.target) && !$('disappearingToggleBtn').contains(event.target)) closeTimer();
        });
        document.querySelectorAll('[data-paper-nav]').forEach(el => el.addEventListener('click',()=> {
            const name = el.dataset.paperNav;
            if (name === 'chat') openChats();
            else show('home', name === 'home' ? null : name);
        }));
        applyThemeMode(getThemeMode());
        show('home');
        setInterval(() => { if (!document.hidden) render(); }, 1000);
        document.addEventListener('visibilitychange',()=>{if(!document.hidden) render();});
    });
})();
