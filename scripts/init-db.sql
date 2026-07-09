-- AI Fight Club Database Schema
-- 10 tables for accountability platform

CREATE TABLE IF NOT EXISTS `user` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('member', 'admin') NOT NULL DEFAULT 'member',
  `joined_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `current_stage_id` VARCHAR(36),
  `timezone` VARCHAR(50) DEFAULT 'UTC',
  `is_blocked` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_is_blocked` (`is_blocked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stage` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `order_index` INT NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_order` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `topic` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `stage_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `order_index` INT NOT NULL,
  `resources` JSON,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`stage_id`) REFERENCES `stage`(`id`) ON DELETE CASCADE,
  INDEX `idx_stage_id` (`stage_id`),
  UNIQUE KEY `unique_topic_order` (`stage_id`, `order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `weekly_task` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `topic_id` VARCHAR(36) NOT NULL,
  `week_number` INT NOT NULL,
  `assigned_date` TIMESTAMP NOT NULL,
  `due_date` TIMESTAMP NOT NULL,
  `required_milestones` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`topic_id`) REFERENCES `topic`(`id`) ON DELETE CASCADE,
  INDEX `idx_topic_id` (`topic_id`),
  INDEX `idx_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `submission` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `user_id` VARCHAR(36) NOT NULL,
  `weekly_task_id` VARCHAR(36) NOT NULL,
  `milestone_type` ENUM('reading', 'video', 'notes', 'coding', 'mini_project', 'quiz', 'discussion') NOT NULL,
  `status` ENUM('pending', 'submitted', 'in_review', 'approved', 'rejected', 'overdue', 'excused') NOT NULL DEFAULT 'pending',
  `submitted_at` TIMESTAMP NULL,
  `github_url` VARCHAR(500),
  `notes_content` LONGTEXT,
  `quiz_score` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`weekly_task_id`) REFERENCES `weekly_task`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_weekly_task_id` (`weekly_task_id`),
  INDEX `idx_status` (`status`),
  UNIQUE KEY `unique_submission` (`user_id`, `weekly_task_id`, `milestone_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `review` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `submission_id` VARCHAR(36) NOT NULL,
  `reviewer_id` VARCHAR(36) NOT NULL,
  `feedback` LONGTEXT NULL,
  `decision` ENUM('approve', 'changes_requested', 'reject') NULL,
  `reviewed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  INDEX `idx_submission_id` (`submission_id`),
  INDEX `idx_reviewer_id` (`reviewer_id`),
  UNIQUE KEY `unique_review` (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `streak` (
  `user_id` VARCHAR(36) PRIMARY KEY,
  `current_streak_weeks` INT NOT NULL DEFAULT 0,
  `longest_streak_weeks` INT NOT NULL DEFAULT 0,
  `last_complete_week` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `achievement` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('streak_4', 'streak_12', 'stage_complete', 'capstone_complete', 'first_review_given', 'first_submission', 'perfect_week') NOT NULL,
  `earned_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_type` (`type`),
  UNIQUE KEY `unique_achievement` (`user_id`, `type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `discussion_session` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `topic_id` VARCHAR(36) NOT NULL,
  `scheduled_at` TIMESTAMP NOT NULL,
  `host_id` VARCHAR(36) NOT NULL,
  `attendee_ids` JSON,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`topic_id`) REFERENCES `topic`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`host_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  INDEX `idx_topic_id` (`topic_id`),
  INDEX `idx_scheduled_at` (`scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `excuse` (
  `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `submission_id` VARCHAR(36) NOT NULL,
  `granted_by_admin_id` VARCHAR(36) NOT NULL,
  `reason` TEXT NOT NULL,
  `granted_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`submission_id`) REFERENCES `submission`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`granted_by_admin_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  INDEX `idx_submission_id` (`submission_id`),
  INDEX `idx_admin_id` (`granted_by_admin_id`),
  UNIQUE KEY `unique_excuse` (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
