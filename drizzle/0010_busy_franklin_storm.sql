ALTER TABLE `users` ADD `hub_member_role` varchar(32) DEFAULT 'family_member';--> statement-breakpoint
ALTER TABLE `users` ADD `hub_id` varchar(36);--> statement-breakpoint
ALTER TABLE `users` ADD `language_preference` varchar(5) DEFAULT 'en' NOT NULL;