-- Tranche 9: Worker depot system + dynamic route starting point
-- Workers: home depot coordinates (starting location for route optimization)
ALTER TABLE `workers` ADD COLUMN `homeDepotLat` DECIMAL(10,7);
ALTER TABLE `workers` ADD COLUMN `homeDepotLng` DECIMAL(10,7);
ALTER TABLE `workers` ADD COLUMN `homeDepotLabel` VARCHAR(255);

-- Routes: actual starting point used for optimization (persisted at route creation)
ALTER TABLE `routes` ADD COLUMN `startingPointLat` DECIMAL(10,7);
ALTER TABLE `routes` ADD COLUMN `startingPointLng` DECIMAL(10,7);
ALTER TABLE `routes` ADD COLUMN `startingPointLabel` VARCHAR(255);
