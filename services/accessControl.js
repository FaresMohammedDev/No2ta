const crypto = require('crypto');

// 1. Preconfigured Named IP Roster
const PRECONFIGURED_ROSTER = {
    '192.168.20.41': { name: 'محمد حسين', role: 'student', avatar: 'rocket', bio: 'طالب في فصل العباقرة ⚡' },
    '192.168.20.44': { name: 'ادهم عمرو', role: 'student', avatar: 'rocket', bio: 'طالب في فصل العباقرة ⚡' },
    '192.168.20.47': { name: 'زياد حمدي', role: 'student', avatar: 'rocket', bio: 'طالب في فصل العباقرة ⚡' },
    '192.168.20.53': { name: 'احمد', role: 'student', avatar: 'rocket', bio: 'طالب في فصل العباقرة ⚡' },
    '192.168.20.56': { name: 'عبدالمنعم', role: 'student', avatar: 'rocket', bio: 'طالب في فصل العباقرة ⚡' },
    '192.168.20.57': { name: 'علام', role: 'student', avatar: 'rocket', bio: 'طالب في فصل العباقرة ⚡' },
    '192.168.20.60': { name: 'يوسف', role: 'student', avatar: 'rocket', bio: 'طالب في فصل العباقرة ⚡' },
    '192.168.20.42': { name: 'حبيبة', role: 'student', avatar: 'sparkles', bio: 'طالبة في فصل العباقرة ⚡' },
    '192.168.20.43': { name: 'بسملة', role: 'student', avatar: 'sparkles', bio: 'طالبة في فصل العباقرة ⚡' },
    '192.168.20.51': { name: 'فايزه', role: 'student', avatar: 'sparkles', bio: 'طالبة في فصل العباقرة ⚡' },
    '192.168.20.58': { name: 'ساره', role: 'student', avatar: 'sparkles', bio: 'طالبة في فصل العباقرة ⚡' },
    '192.168.20.54': { name: 'كبير الفصل (الأدمن 1)', role: 'admin', avatar: 'crown', bio: 'أدمن الفصل والمتحكم في الشبكة 👑' },
    '192.168.20.63': { name: 'كبير الفصل (الأدمن 2)', role: 'admin', avatar: 'crown', bio: 'أدمن الفصل والمتحكم في الشبكة 👑' },
    '127.0.0.1': { name: 'كبير الفصل (الأدمن 1)', role: 'admin', avatar: 'crown', bio: 'أدمن الفصل والمتحكم في الشبكة 👑' },
    '::1': { name: 'كبير الفصل (الأدمن 1)', role: 'admin', avatar: 'crown', bio: 'أدمن الفصل والمتحكم في الشبكة 👑' },
    'localhost': { name: 'كبير الفصل (الأدمن 1)', role: 'admin', avatar: 'crown', bio: 'أدمن الفصل والمتحكم في الشبكة 👑' }
};

// 2. Unnamed Whitelisted IPs (Enter without password, enter name on first connect)
const UNNAMED_WHITELIST_IPS = new Set([
    '192.168.20.45',
    '192.168.20.48',
    '192.168.20.52',
    '192.168.20.55',
    '192.168.20.62'
]);

// 3. Admin IPs
const ADMIN_IPS = new Set([
    '192.168.20.54',
    '192.168.20.63',
    '127.0.0.1',
    '::1',
    'localhost'
]);

const STRICT_ADMIN_MAC = 'D0:8E:79:18:9F:A0';

function isIpAdmin(clientIp, clientMac) {
    if (clientMac) {
        const cleanMac = clientMac.toUpperCase().replace(/-/g, ':');
        if (cleanMac === STRICT_ADMIN_MAC) return true;
    }
    if (clientIp && ADMIN_IPS.has(clientIp)) {
        return true;
    }
    return false;
}

function isIpWhitelisted(clientIp) {
    if (!clientIp) return false;
    if (ADMIN_IPS.has(clientIp)) return true;
    if (PRECONFIGURED_ROSTER[clientIp]) return true;
    if (UNNAMED_WHITELIST_IPS.has(clientIp)) return true;
    return false;
}

function getRosterEntry(clientIp) {
    return PRECONFIGURED_ROSTER[clientIp] || null;
}

// Seed roster users into the SQLite DB so they show in classmates list
async function seedRosterUsers(db) {
    try {
        const entries = Object.entries(PRECONFIGURED_ROSTER);
        for (const [ip, info] of entries) {
            // Skip duplicate aliases for localhost
            if (ip === '::1' || ip === 'localhost') continue;

            const existing = await db.get('SELECT * FROM users WHERE ip_address = ?', [ip]);
            if (existing) {
                // Update all existing records for this IP to the canonical name and role
                await db.run(
                    `UPDATE users SET nickname = ?, role = ?, avatar = COALESCE(avatar, ?) WHERE ip_address = ?`,
                    [info.name, info.role, info.avatar, ip]
                );
            } else {
                const newId = crypto.randomUUID();
                const devId = `dev_pre_${ip.replace(/\./g, '_')}`;
                await db.run(
                    `INSERT INTO users (id, device_id, ip_address, nickname, avatar, bio, role, is_online)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                    [newId, devId, ip, info.name, info.avatar, info.bio, info.role]
                );
            }
        }
        console.log('✅ Preconfigured IP roster seeded successfully in SQLite');
    } catch (err) {
        console.error('Error seeding roster users:', err);
    }
}

module.exports = {
    PRECONFIGURED_ROSTER,
    UNNAMED_WHITELIST_IPS,
    ADMIN_IPS,
    isIpAdmin,
    isIpWhitelisted,
    getRosterEntry,
    seedRosterUsers
};
