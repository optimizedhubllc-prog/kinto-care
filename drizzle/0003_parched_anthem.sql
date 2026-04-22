CREATE TABLE `medication_audit_trail` (
	`id` varchar(36) NOT NULL,
	`medication_id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`changed_by` int NOT NULL,
	`change_type` enum('created','updated','archived','restored') NOT NULL,
	`previous_values` text,
	`new_values` text,
	`reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medication_audit_trail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `medication_audit_trail` ADD CONSTRAINT `medication_audit_trail_medication_id_medications_id_fk` FOREIGN KEY (`medication_id`) REFERENCES `medications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medication_audit_trail` ADD CONSTRAINT `medication_audit_trail_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medication_audit_trail` ADD CONSTRAINT `medication_audit_trail_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;