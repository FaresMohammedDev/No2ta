const { run, get, all } = require('../data/db');
const crypto = require('crypto');

// Format date as YYYY-MM-DD
function getLocalDateString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Checks if today is Friday (5) or Saturday (6)
function isWeekendFreeze(d = new Date()) {
    const day = d.getDay();
    return day === 5 || day === 6; // Friday & Saturday
}

// Order pair IDs deterministically so user_a < user_b
function getOrderedPair(userA, userB) {
    return userA < userB ? [userA, userB] : [userB, userA];
}

async function recordInteraction(user1, user2) {
    if (!user1 || !user2 || user1 === user2) return null;

    const [uA, uB] = getOrderedPair(user1, user2);
    const todayStr = getLocalDateString();
    const now = new Date();
    const isFrozen = isWeekendFreeze(now) ? 1 : 0;

    const existing = await get(
        `SELECT * FROM streaks WHERE user_a = ? AND user_b = ?`,
        [uA, uB]
    );

    if (!existing) {
        // First interaction ever
        const id = crypto.randomUUID();
        await run(
            `INSERT INTO streaks (id, user_a, user_b, streak_count, last_interaction_date, is_frozen)
             VALUES (?, ?, ?, 1, ?, ?)`,
            [id, uA, uB, todayStr, isFrozen]
        );
        return { streak_count: 1, is_frozen: isFrozen, status: 'new' };
    }

    const lastDateStr = existing.last_interaction_date;
    if (lastDateStr === todayStr) {
        // Already recorded today, update frozen state flag
        await run(
            `UPDATE streaks SET is_frozen = ? WHERE id = ?`,
            [isFrozen, existing.id]
        );
        return { streak_count: existing.streak_count, is_frozen: isFrozen, status: 'same_day' };
    }

    const lastDate = new Date(lastDateStr);
    const diffTime = Math.abs(now.setHours(0,0,0,0) - lastDate.setHours(0,0,0,0));
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let newCount = existing.streak_count;

    if (isFrozen) {
        // Friday or Saturday - Streak is FROZEN! It cannot break.
        // If they chat on weekend, we update last_interaction_date and preserve or increment
        await run(
            `UPDATE streaks SET last_interaction_date = ?, is_frozen = 1 WHERE id = ?`,
            [todayStr, existing.id]
        );
        return { streak_count: existing.streak_count, is_frozen: 1, status: 'frozen_weekend' };
    }

    // Weekdays (Sunday to Thursday)
    const dayOfWeek = new Date().getDay(); // 0 is Sunday
    if (dayOfWeek === 0) {
        // Sunday: If last interaction was Thursday (3 days ago), Friday (2 days), or Saturday (1 day), streak continues!
        if (diffDays <= 3) {
            newCount += 1;
        } else {
            newCount = 1; // Missed before weekend
        }
    } else {
        // Mon - Thu: Must be consecutive (diffDays === 1)
        if (diffDays === 1) {
            newCount += 1;
        } else {
            newCount = 1;
        }
    }

    await run(
        `UPDATE streaks SET streak_count = ?, last_interaction_date = ?, is_frozen = ? WHERE id = ?`,
        [newCount, todayStr, 0, existing.id]
    );

    return { streak_count: newCount, is_frozen: 0, status: 'updated' };
}

async function getStreakBetween(user1, user2) {
    if (!user1 || !user2 || user1 === user2) return null;
    const [uA, uB] = getOrderedPair(user1, user2);
    const row = await get(`SELECT * FROM streaks WHERE user_a = ? AND user_b = ?`, [uA, uB]);
    const isFrozen = isWeekendFreeze() ? 1 : 0;
    if (!row) {
        return { streak_count: 0, is_frozen: isFrozen };
    }
    return { ...row, is_frozen: isFrozen || row.is_frozen };
}

async function getAllUserStreaks(userId) {
    const isFrozen = isWeekendFreeze() ? 1 : 0;
    const rows = await all(
        `SELECT s.*, 
            uA.nickname as user_a_name, uA.avatar as user_a_avatar,
            uB.nickname as user_b_name, uB.avatar as user_b_avatar
         FROM streaks s
         JOIN users uA ON s.user_a = uA.id
         JOIN users uB ON s.user_b = uB.id
         WHERE s.user_a = ? OR s.user_b = ?`,
        [userId, userId]
    );

    return rows.map(r => ({
        ...r,
        is_frozen: isFrozen || r.is_frozen,
        other_user_id: r.user_a === userId ? r.user_b : r.user_a,
        other_user_name: r.user_a === userId ? r.user_b_name : r.user_a_name,
        other_user_avatar: r.user_a === userId ? r.user_b_avatar : r.user_a_avatar
    }));
}

module.exports = {
    recordInteraction,
    getStreakBetween,
    getAllUserStreaks,
    isWeekendFreeze
};
