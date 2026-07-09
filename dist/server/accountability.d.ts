import { Achievement, Submission, Topic, WeeklyTask } from '../shared/schema';
type Milestone = Submission['milestone_type'];
export declare function parseMilestones(value: WeeklyTask['required_milestones'] | string): Milestone[];
export declare function isTaskComplete(task: WeeklyTask, submissions: Submission[]): boolean;
export declare function isTopicComplete(topicId: string, tasks: WeeklyTask[], submissions: Submission[]): boolean;
export declare function unlockedTopicIds(topics: Topic[], tasks: WeeklyTask[], submissions: Submission[]): Set<string>;
export declare function weekKey(date: Date): string;
export declare function nextStreak(current: number, longest: number, lastCompleteWeek: Date | null, completedAt: Date): {
    current: number;
    longest: number;
    changed: boolean;
};
export declare function missingAchievementTypes(earned: Achievement[], facts: {
    hasSubmission: boolean;
    streak: number;
    stageComplete: boolean;
    capstoneComplete: boolean;
    hasReview: boolean;
    perfectWeek: boolean;
}): Achievement['type'][];
export {};
//# sourceMappingURL=accountability.d.ts.map