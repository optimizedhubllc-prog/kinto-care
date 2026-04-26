-- Create api_keys table for n8n API key management
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `hub_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `key_hash` varchar(64) NOT NULL UNIQUE,
  `permissions` varchar(255) NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` boolean DEFAULT true NOT NULL,
  FOREIGN KEY (`hub_id`) REFERENCES `patient_hubs` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);

-- Create index on hub_id for faster lookups
CREATE INDEX IF NOT EXISTS `idx_api_keys_hub_id` ON `api_keys` (`hub_id`);

-- Create index on key_hash for lookups during authentication
CREATE INDEX IF NOT EXISTS `idx_api_keys_key_hash` ON `api_keys` (`key_hash`);
