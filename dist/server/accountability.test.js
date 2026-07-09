import { describe, expect, it } from 'vitest';
import { isTaskComplete, missingAchievementTypes, nextStreak, weekKey } from './accountability';
const task = {
    id: 'task-1',
    topic_id: 'topic-1',
    required_milestones: ['reading', 'coding'],
};
function submission(milestone_type, status) {
    return { id: milestone_type, weekly_task_id: task.id, milestone_type, status };
}
describe('accountability rules', () => {
    it('requires every milestone to be approved or excused', () => {
        expect(isTaskComplete(task, [
            submission('reading', 'approved'),
            submission('coding', 'in_review'),
        ])).toBe(false);
        expect(isTaskComplete(task, [
            submission('reading', 'approved'),
            submission('coding', 'excused'),
        ])).toBe(true);
    });
    it('increments once per UTC week and preserves the longest streak', () => {
        expect(weekKey(new Date('2026-07-09T12:00:00Z'))).toBe('2026-07-06');
        expect(nextStreak(3, 5, new Date('2026-07-06'), new Date('2026-07-09')))
            .toEqual({ current: 3, longest: 5, changed: false });
        expect(nextStreak(3, 5, new Date('2026-06-29'), new Date('2026-07-09')))
            .toEqual({ current: 4, longest: 5, changed: true });
    });
    it('returns only newly earned achievements', () => {
        const result = missingAchievementTypes([{ type: 'first_submission' }], {
            hasSubmission: true, streak: 4, stageComplete: false,
            capstoneComplete: false, hasReview: true, perfectWeek: false,
        });
        expect(result).toEqual(['streak_4', 'first_review_given']);
    });
});
//# sourceMappingURL=accountability.test.js.map