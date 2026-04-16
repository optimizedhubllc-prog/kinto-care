CREATE TABLE `webhook_events` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`message` text NOT NULL,
	`payload` text,
	`status` enum('pending','delivered','failed') NOT NULL DEFAULT 'pending',
	`delivered_at` timestamp,
	`failure_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` varchar(36) NOT NULL,
	`webhook_event_id` varchar(36) NOT NULL,
	`status_code` int NOT NULL,
	`response_message` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_hub_id_patient_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_logs` ADD CONSTRAINT `webhook_logs_webhook_event_id_webhook_events_id_fk` FOREIGN KEY (`webhook_event_id`) REFERENCES `webhook_events`(`id`) ON DELETE cascade ON UPDATE no action;