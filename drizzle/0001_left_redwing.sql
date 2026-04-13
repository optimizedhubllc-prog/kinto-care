CREATE TABLE `appointments` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`medical_contact_id` varchar(36),
	`doctor_name` text,
	`specialty` text,
	`date_time` datetime NOT NULL,
	`location` text,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `care_logistics` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`caregiver_id` int,
	`start_time` datetime NOT NULL,
	`end_time` datetime NOT NULL,
	`task_notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `care_logistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hub_members` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`hub_member_role` enum('family_admin','family_viewer','caregiver') NOT NULL DEFAULT 'family_viewer',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hub_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_hub_user` UNIQUE(`hub_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `medical_contacts` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`specialty` text,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`notes` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`dosage` text,
	`frequency` text,
	`instructions` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_hubs` (
	`id` varchar(36) NOT NULL,
	`patient_name` text NOT NULL,
	`patient_dob` date,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_hubs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_medical_contact_id_medical_contacts_id_fk` FOREIGN KEY (`medical_contact_id`) REFERENCES `medical_contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_logistics` ADD CONSTRAINT `care_logistics_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_logistics` ADD CONSTRAINT `care_logistics_caregiver_id_users_id_fk` FOREIGN KEY (`caregiver_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `care_logistics` ADD CONSTRAINT `care_logistics_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hub_members` ADD CONSTRAINT `hub_members_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hub_members` ADD CONSTRAINT `hub_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_contacts` ADD CONSTRAINT `medical_contacts_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_contacts` ADD CONSTRAINT `medical_contacts_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_hubs` ADD CONSTRAINT `patient_hubs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;