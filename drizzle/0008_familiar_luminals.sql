ALTER TABLE `medications` ADD `prescriber` text;--> statement-breakpoint
ALTER TABLE `medications` ADD `refill_date` timestamp;--> statement-breakpoint
ALTER TABLE `medications` ADD `quantity` text;--> statement-breakpoint
ALTER TABLE `medications` ADD `pharmacy_name` text;--> statement-breakpoint
ALTER TABLE `medications` ADD `pharmacy_phone` text;--> statement-breakpoint
ALTER TABLE `medications` ADD `confidence` varchar(20) DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE `medications` ADD `raw_label_image_url` text;--> statement-breakpoint
ALTER TABLE `medications` ADD `reviewed` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `medications` ADD `review_notes` text;--> statement-breakpoint
ALTER TABLE `medications` ADD `extracted_at` timestamp;