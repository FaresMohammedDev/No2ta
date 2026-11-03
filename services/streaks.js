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
            `INSERT INTO streaks (id, user_a, user_b, streak_count, last_interaction_date, is_frozen, interaction_count)
             VALUES (?, ?, ?, 1, ?, ?, 1)`,
            [id, uA, uB, todayStr, isFrozen]
        );
        return { streak_count: 1, is_frozen: isFrozen, status: 'new', interaction_count: 1 };
    }

    const lastDateStr = existing.last_interaction_date;
    const currentInteractions = (existing.interaction_count || 1);

    // SAME DAY: Active conversation progress
    if (lastDateStr === todayStr) {
        const nextInteractions = currentInteractions + 1;
        let newStreak = existing.streak_count;
        let status = 'same_day';

        // Every 3 direct messages exchanged in the session gives a +1 boost!
        if (nextInteractions % 3 === 0) {
            newStreak += 1;
            status = 'boosted';
        }

        await run(
            `UPDATE streaks SET streak_count = ?, is_frozen = ?, interaction_count = ? WHERE id = ?`,
            [newStreak, isFrozen, nextInteractions, existing.id]
        );

        return {
            streak_count: newStreak,
            is_frozen: isFrozen,
            status: status,
            interaction_count: nextInteractions
        };
    }

    // DIFFERENT DAY: Consecutive classroom days & grace period
    const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(lastDateStr).getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let newCount = existing.streak_count;
    let status = 'updated';

    // Generous classroom grace period (up to 5 days covers weekends, holidays, and lab schedules)
    if (diffDays <= 5) {
        newCount += 1;
    } else {
        // If they missed more than 5 days, preserve partial progress so they aren't discouraged
        newCount = Math.max(1, Math.floor(existing.streak_count / 2) + 1);
    }

    await run(
        `UPDATE streaks SET streak_count = ?, last_interaction_date = ?, is_frozen = ?, interaction_count = 1 WHERE id = ?`,
        [newCount, todayStr, isFrozen, existing.id]
    );

    return {
        streak_count: newCount,
        is_frozen: isFrozen,
        status: status,
        interaction_count: 1
    };
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
