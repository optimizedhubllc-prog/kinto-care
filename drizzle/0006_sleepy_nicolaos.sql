CREATE TABLE `api_keys` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`key_hash` varchar(64) NOT NULL,
	`permissions` varchar(255) NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_used_at` timestamp,
	`expires_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_key_hash_unique` UNIQUE(`key_hash`)
);
