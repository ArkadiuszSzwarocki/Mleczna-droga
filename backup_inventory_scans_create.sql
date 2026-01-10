CREATE TABLE `inventory_scans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pallet_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `counted_quantity` decimal(10,3) DEFAULT NULL,
  `scanned_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scanned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_scan` (`session_id`,`location_id`,`pallet_id`),
  CONSTRAINT `inventory_scans_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `inventory_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
