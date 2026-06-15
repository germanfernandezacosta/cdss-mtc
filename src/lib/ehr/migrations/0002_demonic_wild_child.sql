CREATE TABLE `consultation_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_hash` text(64) NOT NULL,
	`consultation_date` text(30) NOT NULL,
	`summary_section_a` text,
	`summary_section_b` text,
	`summary_section_c` text,
	`syndrome` text,
	`points` text,
	`herbs` text,
	`evolution_notes` text,
	`created_at` text(30) DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `idx_history_patient_hash` ON `consultation_history` (`patient_hash`);--> statement-breakpoint
CREATE INDEX `idx_history_date` ON `consultation_history` (`consultation_date`);--> statement-breakpoint
CREATE INDEX `idx_history_patient_date` ON `consultation_history` (`patient_hash`,`consultation_date`);