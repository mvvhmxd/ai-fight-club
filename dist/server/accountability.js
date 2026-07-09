export function parseMilestones(value) {
    return Array.isArray(value) ? value : JSON.parse(value);
}
export function isTaskComplete(task, submissions) {
    const accepted = new Set(submissions
        .filter(submission => submission.weekly_task_id === task.id &&
        ['approved', 'excused'].includes(submission.status))
        .map(submission => submission.milestone_type));
    return parseMilestones(task.required_milestones).every(milestone => accepted.has(milestone));
}
export function isTopicComplete(topicId, tasks, submissions) {
    const topicTasks = tasks.filter(task => task.topic_id === topicId);
    return topicTasks.length > 0 && topicTasks.every(task => isTaskComplete(task, submissions));
}
export function unlockedTopicIds(topics, tasks, submissions) {
    const ordered = [...topics].sort((a, b) => a.order_index - b.order_index);
    const unlocked = new Set();
    for (const topic of ordered) {
        if (ordered
            .filter(candidate => candidate.order_index < topic.order_index)
            .every(candidate => isTopicComplete(candidate.id, tasks, submissions))) {
            unlocked.add(topic.id);
        }
    }
    return unlocked;
}
export function weekKey(date) {
    const value = new Date(date);
    const day = (value.getUTCDay() + 6) % 7;
    value.setUTCDate(value.getUTCDate() - day);
    return value.toISOString().slice(0, 10);
}
export function nextStreak(current, longest, lastCompleteWeek, completedAt) {
    if (lastCompleteWeek && weekKey(lastCompleteWeek) === weekKey(completedAt)) {
        return { current, longest, changed: false };
    }
    const next = current + 1;
    return { current: next, longest: Math.max(longest, next), changed: true };
}
export function missingAchievementTypes(earned, facts) {
    const existing = new Set(earned.map(achievement => achievement.type));
    const candidates = [
        ['first_submission', facts.hasSubmission],
        ['streak_4', facts.streak >= 4],
        ['streak_12', facts.streak >= 12],
        ['stage_complete', facts.stageComplete],
        ['capstone_complete', facts.capstoneComplete],
        ['first_review_given', facts.hasReview],
        ['perfect_week', facts.perfectWeek],
    ];
    return candidates.filter(([type, met]) => met && !existing.has(type)).map(([type]) => type);
}
//# sourceMappingURL=accountability.js.map