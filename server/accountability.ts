import type { Achievement, Submission, Topic, WeeklyTask } from '../shared/schema';

type Milestone = Submission['milestone_type'];

export function parseMilestones(value: WeeklyTask['required_milestones'] | string): Milestone[] {
  return Array.isArray(value) ? value : JSON.parse(value) as Milestone[];
}

export function isTaskComplete(task: WeeklyTask, submissions: Submission[]): boolean {
  const accepted = new Set(
    submissions
      .filter(submission =>
        submission.weekly_task_id === task.id &&
        ['approved', 'excused'].includes(submission.status)
      )
      .map(submission => submission.milestone_type)
  );
  return parseMilestones(task.required_milestones).every(milestone => accepted.has(milestone));
}

export function isTopicComplete(
  topicId: string,
  tasks: WeeklyTask[],
  submissions: Submission[]
): boolean {
  const topicTasks = tasks.filter(task => task.topic_id === topicId);
  return topicTasks.length > 0 && topicTasks.every(task => isTaskComplete(task, submissions));
}

export function unlockedTopicIds(
  topics: Topic[],
  tasks: WeeklyTask[],
  submissions: Submission[]
): Set<string> {
  const ordered = [...topics].sort((a, b) => a.order_index - b.order_index);
  const unlocked = new Set<string>();
  for (const topic of ordered) {
    if (
      ordered
        .filter(candidate => candidate.order_index < topic.order_index)
        .every(candidate => isTopicComplete(candidate.id, tasks, submissions))
    ) {
      unlocked.add(topic.id);
    }
  }
  return unlocked;
}

export function weekKey(date: Date): string {
  const value = new Date(date);
  const day = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - day);
  return value.toISOString().slice(0, 10);
}

export function nextStreak(
  current: number,
  longest: number,
  lastCompleteWeek: Date | null,
  completedAt: Date
): { current: number; longest: number; changed: boolean } {
  if (lastCompleteWeek && weekKey(lastCompleteWeek) === weekKey(completedAt)) {
    return { current, longest, changed: false };
  }
  const next = current + 1;
  return { current: next, longest: Math.max(longest, next), changed: true };
}

export function missingAchievementTypes(
  earned: Achievement[],
  facts: {
    hasSubmission: boolean;
    streak: number;
    stageComplete: boolean;
    capstoneComplete: boolean;
    hasReview: boolean;
    perfectWeek: boolean;
  }
): Achievement['type'][] {
  const existing = new Set(earned.map(achievement => achievement.type));
  const candidates: Array<[Achievement['type'], boolean]> = [
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
