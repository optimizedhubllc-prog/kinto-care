CREATE TABLE `contacts` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`phone` text NOT NULL,
	`country_code` varchar(2) NOT NULL DEFAULT 'US',
	`language_preference` varchar(5) NOT NULL DEFAULT 'en',
	`notes` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;