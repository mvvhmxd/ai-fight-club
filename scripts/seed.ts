import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ai_fight_club',
  });

  try {
    // Clear existing data
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE `user`');
    await connection.execute('TRUNCATE TABLE `stage`');
    await connection.execute('TRUNCATE TABLE `topic`');
    await connection.execute('TRUNCATE TABLE `weekly_task`');
    await connection.execute('TRUNCATE TABLE `submission`');
    await connection.execute('TRUNCATE TABLE `review`');
    await connection.execute('TRUNCATE TABLE `streak`');
    await connection.execute('TRUNCATE TABLE `achievement`');
    await connection.execute('TRUNCATE TABLE `discussion_session`');
    await connection.execute('TRUNCATE TABLE `excuse`');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Cleared existing data');

    // Create users
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);

    const users = [
      { id: '1', name: 'Alice Chen', email: 'alice@example.com', password_hash: passwordHash, role: 'member' },
      { id: '2', name: 'Bob Smith', email: 'bob@example.com', password_hash: passwordHash, role: 'member' },
      { id: '3', name: 'Carol Davis', email: 'carol@example.com', password_hash: passwordHash, role: 'member' },
      { id: '4', name: 'Admin User', email: 'admin@example.com', password_hash: adminHash, role: 'admin' },
    ];

    for (const user of users) {
      await connection.execute(
        'INSERT INTO `user` (id, name, email, password_hash, role, joined_date, current_stage_id, timezone, is_blocked) VALUES (?, ?, ?, ?, ?, NOW(), NULL, "UTC", FALSE)',
        [user.id, user.name, user.email, user.password_hash, user.role]
      );
    }
    console.log('✓ Created 4 users');

    // Create streaks for all users
    for (const user of users) {
      await connection.execute(
        'INSERT INTO `streak` (user_id, current_streak_weeks, longest_streak_weeks) VALUES (?, 0, 0)',
        [user.id]
      );
    }
    console.log('✓ Created streak records');

    // Create stages
    const stages = [
      { id: '1', name: 'Python Foundations', order_index: 1, description: 'Learn Python basics and fundamentals' },
      { id: '2', name: 'Machine Learning', order_index: 2, description: 'ML algorithms and frameworks' },
      { id: '3', name: 'Deep Learning', order_index: 3, description: 'Neural networks and advanced DL' },
    ];

    for (const stage of stages) {
      await connection.execute(
        'INSERT INTO `stage` (id, name, order_index, description) VALUES (?, ?, ?, ?)',
        [stage.id, stage.name, stage.order_index, stage.description]
      );
    }
    console.log('✓ Created 3 stages');

    // Create topics
    const topics = [
      { id: '1', stage_id: '1', name: 'Variables & Data Types', order_index: 1 },
      { id: '2', stage_id: '1', name: 'Functions & Modules', order_index: 2 },
      { id: '3', stage_id: '1', name: 'OOP Basics', order_index: 3 },
      { id: '4', stage_id: '2', name: 'Linear Regression', order_index: 1 },
      { id: '5', stage_id: '2', name: 'Classification', order_index: 2 },
      { id: '6', stage_id: '2', name: 'Clustering', order_index: 3 },
      { id: '7', stage_id: '3', name: 'Neural Networks', order_index: 1 },
      { id: '8', stage_id: '3', name: 'CNNs', order_index: 2 },
      { id: '9', stage_id: '3', name: 'RNNs & Transformers', order_index: 3 },
    ];

    for (const topic of topics) {
      await connection.execute(
        'INSERT INTO `topic` (id, stage_id, name, order_index, resources) VALUES (?, ?, ?, ?, ?)',
        [topic.id, topic.stage_id, topic.name, topic.order_index, JSON.stringify({
          books: ['Python Crash Course'],
          courses: ['Udemy Python 101'],
          articles: ['Real Python Guides'],
          docs: ['Python Official Docs'],
        })]
      );
    }
    console.log('✓ Created 9 topics');

    // Create weekly tasks
    const now = new Date();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const pastDueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

    const tasks = [
      { id: '1', topic_id: '1', week_number: 1, assigned_date: now, due_date: dueDate, required_milestones: ['reading', 'video', 'notes', 'coding'] },
      { id: '2', topic_id: '2', week_number: 1, assigned_date: now, due_date: dueDate, required_milestones: ['reading', 'video', 'notes', 'mini_project'] },
      { id: '3', topic_id: '3', week_number: 1, assigned_date: now, due_date: dueDate, required_milestones: ['reading', 'video', 'coding', 'mini_project'] },
      { id: '4', topic_id: '4', week_number: 1, assigned_date: now, due_date: pastDueDate, required_milestones: ['reading', 'video', 'coding', 'quiz'] },
    ];

    for (const task of tasks) {
      await connection.execute(
        'INSERT INTO `weekly_task` (id, topic_id, week_number, assigned_date, due_date, required_milestones) VALUES (?, ?, ?, ?, ?, ?)',
        [task.id, task.topic_id, task.week_number, task.assigned_date, task.due_date, JSON.stringify(task.required_milestones)]
      );
    }
    console.log('✓ Created 4 weekly tasks');

    // Create some submissions (Alice has completed task 1, Bob has overdue task 4)
    const submissions = [
      { id: '1', user_id: '1', weekly_task_id: '1', milestone_type: 'reading', status: 'approved', submitted_at: now },
      { id: '2', user_id: '1', weekly_task_id: '1', milestone_type: 'video', status: 'approved', submitted_at: now },
      { id: '3', user_id: '1', weekly_task_id: '1', milestone_type: 'notes', status: 'approved', submitted_at: now },
      { id: '4', user_id: '1', weekly_task_id: '1', milestone_type: 'coding', status: 'in_review', submitted_at: now, github_url: 'https://github.com/alice/python-basics' },
      { id: '5', user_id: '2', weekly_task_id: '4', milestone_type: 'reading', status: 'pending', submitted_at: null },
      { id: '6', user_id: '2', weekly_task_id: '4', milestone_type: 'video', status: 'pending', submitted_at: null },
      { id: '7', user_id: '2', weekly_task_id: '4', milestone_type: 'coding', status: 'pending', submitted_at: null },
      { id: '8', user_id: '2', weekly_task_id: '4', milestone_type: 'quiz', status: 'pending', submitted_at: null },
    ];

    for (const sub of submissions) {
      await connection.execute(
        'INSERT INTO `submission` (id, user_id, weekly_task_id, milestone_type, status, submitted_at, github_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sub.id, sub.user_id, sub.weekly_task_id, sub.milestone_type, sub.status, sub.submitted_at, 'github_url' in sub ? sub.github_url : null]
      );
    }
    console.log('✓ Created 8 submissions');

    // Assign Alice's coding submission to Bob for review
    await connection.execute(
      'INSERT INTO `review` (id, submission_id, reviewer_id, feedback, decision, reviewed_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['1', '4', '2', null, null, null]
    );
    console.log('✓ Created 1 pending review assignment');

    // Mark Bob as blocked (has overdue submissions)
    await connection.execute(
      'UPDATE `user` SET is_blocked = TRUE WHERE id = ?',
      ['2']
    );
    console.log('✓ Marked Bob as blocked');

    // Auto-flip Bob's pending submissions to overdue
    await connection.execute(
      'UPDATE `submission` SET status = "overdue" WHERE user_id = ? AND status = "pending" AND id IN (?, ?, ?, ?)',
      ['2', '5', '6', '7', '8']
    );
    console.log('✓ Marked Bob\'s submissions as overdue');

    console.log('\n✅ Seed completed successfully!');
    console.log('\nDemo accounts:');
    console.log('  Alice (member): alice@example.com / password123');
    console.log('  Bob (member, blocked): bob@example.com / password123');
    console.log('  Carol (member): carol@example.com / password123');
    console.log('  Admin: admin@example.com / admin123');
  } catch (error) {
    console.error('✗ Seed failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
