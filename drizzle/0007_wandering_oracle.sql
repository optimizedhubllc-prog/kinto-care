CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_date` timestamp,
	`assigned_to` int,
	`created_by` int NOT NULL,
	`task_priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`task_status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;