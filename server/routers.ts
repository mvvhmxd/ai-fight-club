import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getStages, getTopicsByStageId, getWeeklyTasksByTopicId,
  getSubmissionsByUserId, createSubmission, updateSubmissionStatus,
  getReviewsByReviewerId, getReviewBySubmissionId,
  getStreakByUserId, updateStreak, getAchievementsByUserId, createAchievement,
  createExcuse, getUserById, updateUserBlockStatus,
  getWeeklyTaskById, getSubmissionById, getAllUsers, getOverdueSubmissions,
  createReviewAssignment, completeReview, findReviewerForSubmission,
  markExpiredSubmissionsOverdue, hasOverdueSubmissions, getAllTopics,
  getAllWeeklyTasks, hasCompletedReview, getAllReviews,
  createStage, updateStage, createTopic, updateTopic,
  createWeeklyTask, updateWeeklyTask,
  deleteStage, deleteTopic, deleteWeeklyTask,
  reorderStages, reorderTopics, reorderWeeklyTasks,
} from './db.ts';
import type { AuthPayload } from './auth.ts';
import type { User } from '../shared/schema';
import { isTaskComplete, isTopicComplete, missingAchievementTypes, nextStreak, weekKey } from './accountability.ts';
import { verifyGitHubRepository } from './github.ts';

const router = Router();
const milestoneTypes = ['reading', 'video', 'notes', 'coding', 'mini_project', 'quiz', 'discussion'] as const;
const positiveInteger = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0;

function publicUser(user: User) {
  const { password_hash: _passwordHash, ...safe } = user;
  return safe;
}

async function topicIsUnlocked(userId: string, topicId: string): Promise<boolean> {
  const [stages, topics, tasks, submissions] = await Promise.all([
    getStages(), getAllTopics(), getAllWeeklyTasks(), getSubmissionsByUserId(userId),
  ]);
  const stageOrder = new Map(stages.map(stage => [stage.id, stage.order_index]));
  const ordered = [...topics].sort((a, b) =>
    (stageOrder.get(a.stage_id) || 0) - (stageOrder.get(b.stage_id) || 0) ||
    a.order_index - b.order_index
  );
  const index = ordered.findIndex(topic => topic.id === topicId);
  return index >= 0 && ordered.slice(0, index).every(topic => isTopicComplete(topic.id, tasks, submissions));
}

// Middleware to check if user is admin
function requireAdmin(req: Request & { user?: AuthPayload }, res: Response, next: Function) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ============ CURRICULUM ENDPOINTS ============

router.get('/stages', async (req: Request, res: Response) => {
  try {
    const stages = await getStages();
    res.json({ stages });
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stages/:stageId/topics', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    const { stageId } = req.params;
    const topics = await getTopicsByStageId(stageId);
    const decorated = await Promise.all(topics.map(async topic => ({
      ...topic,
      locked: !(await topicIsUnlocked(req.user!.id, topic.id)),
    })));
    res.json({ topics: decorated });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/topics/:topicId/tasks', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    const { topicId } = req.params;
    if (!(await topicIsUnlocked(req.user!.id, topicId)) && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Complete prerequisite topics first', locked: true });
    }
    const tasks = await getWeeklyTasksByTopicId(topicId);
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SUBMISSION ENDPOINTS ============

router.post('/submissions', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { weekly_task_id, milestone_type, github_url, notes_content, quiz_score } = req.body;

    // Check if user is blocked
    const user = await getUserById(req.user.id);
    if (user?.is_blocked) {
      return res.status(403).json({
        error: 'You have overdue submissions. Please resolve them before submitting new work.',
        blocked: true,
      });
    }

    // Get the task to validate it exists
    const task = await getWeeklyTaskById(weekly_task_id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (!(await topicIsUnlocked(req.user.id, task.topic_id))) {
      return res.status(403).json({ error: 'Complete prerequisite topics first', locked: true });
    }

    // Validate required milestones
    const requiredMilestones = Array.isArray(task.required_milestones)
      ? task.required_milestones
      : JSON.parse(task.required_milestones as any);

    if (!requiredMilestones.includes(milestone_type)) {
      return res.status(400).json({ error: 'Invalid milestone type for this task' });
    }

    // Determine status based on milestone type
    let status: 'submitted' | 'approved' | 'in_review' = 'submitted';
    let reviewerId: string | null = null;
    if (['reading', 'video', 'notes', 'quiz'].includes(milestone_type)) {
      status = 'approved'; // Self-report milestones are auto-approved
    } else if (['coding', 'mini_project'].includes(milestone_type)) {
      if (!github_url) {
        return res.status(400).json({ error: 'GitHub URL required for coding/project submissions' });
      }
      const verification = await verifyGitHubRepository(github_url);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error });
      }
      const reviewer = await findReviewerForSubmission(req.user.id, task.topic_id);
      if (!reviewer) {
        return res.status(409).json({ error: 'No eligible peer reviewer is currently available' });
      }
      reviewerId = reviewer.id;
      status = 'in_review'; // Requires peer review
    }

    // Create submission
    const submission = await createSubmission({
      user_id: req.user.id,
      weekly_task_id,
      milestone_type,
      status,
      submitted_at: new Date(),
      github_url: github_url || null,
      notes_content: notes_content || null,
      quiz_score: quiz_score || null,
    });

    if (reviewerId) {
      await createReviewAssignment(submission.id, reviewerId);
    }

    if (status === 'approved') {
      await updateProgress(req.user.id, weekly_task_id);
    }

    res.status(201).json({ submission });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/submissions/:submissionId', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { submissionId } = req.params;
    const submission = await getSubmissionById(submissionId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check access: owner, reviewer, or admin
    if (submission.user_id !== req.user.id && req.user.role !== 'admin') {
      const review = await getReviewBySubmissionId(submissionId);
      if (!review || review.reviewer_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:userId/submissions', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;

    // Can only view own submissions or admin can view anyone's
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const submissions = await getSubmissionsByUserId(userId);
    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ REVIEW ENDPOINTS ============

router.post('/submissions/:submissionId/review', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { submissionId } = req.params;
    const { feedback, decision } = req.body;

    if (!['approve', 'changes_requested', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    // Get submission
    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check if user is assigned as reviewer
    const existingReview = await getReviewBySubmissionId(submissionId);
    if (!existingReview || (existingReview.reviewer_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'You are not assigned to review this submission' });
    }

    if (existingReview.reviewed_at) {
      return res.status(409).json({ error: 'This review has already been completed' });
    }
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ error: 'Feedback is required' });
    }
    const review = await completeReview(existingReview.id, feedback.trim(), decision);

    // Update submission status based on decision
    if (decision === 'approve') {
      await updateSubmissionStatus(submissionId, 'approved');
      await updateProgress(submission.user_id, submission.weekly_task_id);
    } else if (decision === 'changes_requested') {
      await updateSubmissionStatus(submissionId, 'pending');
    } else if (decision === 'reject') {
      await updateSubmissionStatus(submissionId, 'rejected');
    }
    await checkAchievements(req.user.id);

    res.status(201).json({ review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:userId/reviews', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;

    // Can only view own reviews or admin can view anyone's
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reviews = await getReviewsByReviewerId(userId);
    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ EXCUSE ENDPOINTS ============

router.post('/submissions/:submissionId/excuse', requireAdmin, async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { submissionId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Get submission
    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Can only excuse overdue submissions
    if (submission.status !== 'overdue') {
      return res.status(400).json({ error: 'Can only excuse overdue submissions' });
    }

    // Create excuse
    const excuse = await createExcuse({
      submission_id: submissionId,
      granted_by_admin_id: req.user.id,
      reason,
      granted_at: new Date(),
    });

    // Update submission status to excused
    await updateSubmissionStatus(submissionId, 'excused');

    // Check if user has any other overdue submissions
    await updateUserBlockStatus(submission.user_id, await hasOverdueSubmissions(submission.user_id));

    res.status(201).json({ excuse });
  } catch (error) {
    console.error('Error creating excuse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ PROGRESS ENDPOINTS ============

router.get('/users/:userId/progress', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;

    // Can only view own progress or admin can view anyone's
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const submissions = await getSubmissionsByUserId(userId);
    const streak = await getStreakByUserId(userId);
    const achievements = await getAchievementsByUserId(userId);

    res.json({
      user: publicUser(user),
      submissions,
      streak,
      achievements,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:userId/streak', async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;

    // Can only view own streak or admin can view anyone's
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const streak = await getStreakByUserId(userId);
    res.json({ streak });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ADMIN ENDPOINTS ============

router.get('/admin/users', requireAdmin, async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({ users: users.map(publicUser) });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/overdue', requireAdmin, async (req: Request & { user?: AuthPayload }, res: Response) => {
  try {
    const overdue = await getOverdueSubmissions();
    res.json({ overdue });
  } catch (error) {
    console.error('Error fetching overdue submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/reviews', requireAdmin, async (_req: Request, res: Response) => {
  try {
    res.json({ reviews: await getAllReviews() });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/curriculum', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [stages, topics, tasks] = await Promise.all([
      getStages(), getAllTopics(), getAllWeeklyTasks(),
    ]);
    res.json({ stages, topics, tasks });
  } catch (error) {
    console.error('Error fetching curriculum:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/stages', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, order_index, description = '' } = req.body;
    if (!name?.trim() || !positiveInteger(order_index)) {
      return res.status(400).json({ error: 'Name and a positive order are required' });
    }
    const stage = await createStage({
      name: name.trim(), order_index: Number(order_index), description,
    });
    res.status(201).json({ stage });
  } catch (error) {
    console.error('Error creating stage:', error);
    res.status(400).json({ error: 'Stage order must be unique' });
  }
});

router.put('/admin/stages/:stageId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, order_index, description = '' } = req.body;
    if (!name?.trim() || !positiveInteger(order_index)) {
      return res.status(400).json({ error: 'Name and a positive order are required' });
    }
    res.json({ stage: await updateStage(req.params.stageId, {
      name: name.trim(), order_index: Number(order_index), description,
    }) });
  } catch (error) {
    console.error('Error updating stage:', error);
    res.status(400).json({ error: 'Stage could not be updated' });
  }
});

router.post('/admin/topics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { stage_id, name, order_index, resources = {} } = req.body;
    if (!stage_id || !name?.trim() || !positiveInteger(order_index)) {
      return res.status(400).json({ error: 'Stage, name, and a positive order are required' });
    }
    res.status(201).json({ topic: await createTopic({
      stage_id, name: name.trim(), order_index: Number(order_index), resources,
    }) });
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(400).json({ error: 'Topic order must be unique within its stage' });
  }
});

router.put('/admin/topics/:topicId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { stage_id, name, order_index, resources = {} } = req.body;
    if (!stage_id || !name?.trim() || !positiveInteger(order_index)) {
      return res.status(400).json({ error: 'Stage, name, and a positive order are required' });
    }
    res.json({ topic: await updateTopic(req.params.topicId, {
      stage_id, name: name.trim(), order_index: Number(order_index), resources,
    }) });
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(400).json({ error: 'Topic could not be updated' });
  }
});

function validMilestones(value: unknown): value is typeof milestoneTypes[number][] {
  return Array.isArray(value) && value.length > 0 &&
    value.every(item => milestoneTypes.includes(item));
}

router.post('/admin/tasks', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { topic_id, week_number, assigned_date, due_date, required_milestones } = req.body;
    if (!topic_id || !positiveInteger(week_number) || !assigned_date || !due_date ||
        !validMilestones(required_milestones)) {
      return res.status(400).json({ error: 'Topic, week, dates, and at least one valid milestone are required' });
    }
    res.status(201).json({ task: await createWeeklyTask({
      topic_id, week_number: Number(week_number), assigned_date: new Date(assigned_date),
      due_date: new Date(due_date), required_milestones,
    }) });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ error: 'Task could not be created' });
  }
});

router.put('/admin/tasks/:taskId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { topic_id, week_number, assigned_date, due_date, required_milestones } = req.body;
    if (!topic_id || !positiveInteger(week_number) || !assigned_date || !due_date ||
        !validMilestones(required_milestones)) {
      return res.status(400).json({ error: 'Topic, week, dates, and at least one valid milestone are required' });
    }
    res.json({ task: await updateWeeklyTask(req.params.taskId, {
      topic_id, week_number: Number(week_number), assigned_date: new Date(assigned_date),
      due_date: new Date(due_date), required_milestones,
    }) });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ error: 'Task could not be updated' });
  }
});

router.put('/admin/reorder/stages', requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!Array.isArray(req.body.ids) || req.body.ids.some((id: unknown) => typeof id !== 'string')) {
      return res.status(400).json({ error: 'A complete stage ID order is required' });
    }
    await reorderStages(req.body.ids);
    res.json({ message: 'Stage order updated' });
  } catch (error) {
    console.error('Error reordering stages:', error);
    res.status(400).json({ error: 'Stages could not be reordered' });
  }
});

router.put('/admin/reorder/topics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { stage_id, ids } = req.body;
    if (!stage_id || !Array.isArray(ids) || ids.some((id: unknown) => typeof id !== 'string')) {
      return res.status(400).json({ error: 'Stage and complete topic ID order are required' });
    }
    await reorderTopics(stage_id, ids);
    res.json({ message: 'Topic order updated' });
  } catch (error) {
    console.error('Error reordering topics:', error);
    res.status(400).json({ error: 'Topics could not be reordered' });
  }
});

router.put('/admin/reorder/tasks', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { topic_id, ids } = req.body;
    if (!topic_id || !Array.isArray(ids) || ids.some((id: unknown) => typeof id !== 'string')) {
      return res.status(400).json({ error: 'Topic and complete task ID order are required' });
    }
    await reorderWeeklyTasks(topic_id, ids);
    res.json({ message: 'Task order updated' });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    res.status(400).json({ error: 'Tasks could not be reordered' });
  }
});

router.delete('/admin/stages/:stageId', requireAdmin, async (req: Request, res: Response) => {
  try {
    await deleteStage(req.params.stageId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting stage:', error);
    res.status(400).json({ error: 'Stage could not be deleted' });
  }
});

router.delete('/admin/topics/:topicId', requireAdmin, async (req: Request, res: Response) => {
  try {
    await deleteTopic(req.params.topicId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(400).json({ error: 'Topic could not be deleted' });
  }
});

router.delete('/admin/tasks/:taskId', requireAdmin, async (req: Request, res: Response) => {
  try {
    await deleteWeeklyTask(req.params.taskId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(400).json({ error: 'Task could not be deleted' });
  }
});

export async function processOverdueSubmissions() {
  const affectedUsers = await markExpiredSubmissionsOverdue();
  for (const userId of affectedUsers) {
    await updateUserBlockStatus(userId, true);
    const streak = await getStreakByUserId(userId);
    if (streak) {
      await updateStreak(userId, 0, streak.longest_streak_weeks, null);
    }
  }
  return affectedUsers.length;
}

async function updateProgress(userId: string, weeklyTaskId: string) {
  const [task, submissions, streak] = await Promise.all([
    getWeeklyTaskById(weeklyTaskId),
    getSubmissionsByUserId(userId),
    getStreakByUserId(userId),
  ]);
  if (task && streak && isTaskComplete(task, submissions)) {
    const result = nextStreak(
      streak.current_streak_weeks,
      streak.longest_streak_weeks,
      streak.last_complete_week,
      new Date()
    );
    if (result.changed) {
      await updateStreak(userId, result.current, result.longest);
    }
  }
  await checkAchievements(userId);
}

async function checkAchievements(userId: string) {
  try {
    const [submissions, streak, achievements, stages, topics, tasks, reviewed] = await Promise.all([
      getSubmissionsByUserId(userId), getStreakByUserId(userId),
      getAchievementsByUserId(userId), getStages(), getAllTopics(),
      getAllWeeklyTasks(), hasCompletedReview(userId),
    ]);
    const completedStages = stages.filter(stage => {
      const stageTopics = topics.filter(topic => topic.stage_id === stage.id);
      return stageTopics.length > 0 &&
        stageTopics.every(topic => isTopicComplete(topic.id, tasks, submissions));
    });
    const lastStage = [...stages].sort((a, b) => b.order_index - a.order_index)[0];
    const currentWeek = weekKey(new Date());
    const tasksThisWeek = tasks.filter(task => weekKey(new Date(task.due_date)) === currentWeek);
    const missing = missingAchievementTypes(achievements, {
      hasSubmission: submissions.some(submission => submission.submitted_at !== null),
      streak: streak?.current_streak_weeks || 0,
      stageComplete: completedStages.length > 0,
      capstoneComplete: Boolean(lastStage && completedStages.some(stage => stage.id === lastStage.id)),
      hasReview: reviewed,
      perfectWeek: tasksThisWeek.length > 0 &&
        tasksThisWeek.every(task => isTaskComplete(task, submissions)),
    });
    for (const type of missing) {
      await createAchievement({ user_id: userId, type, earned_at: new Date() });
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
}

export default router;
