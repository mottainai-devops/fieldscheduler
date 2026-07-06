-- T38: Rename customers.customermaf → customers.maf
-- Preserves all data, NULL values, and VARCHAR(100) type
-- No index exists on this column (confirmed in T38 investigation)
ALTER TABLE customers CHANGE COLUMN customermaf maf VARCHAR(100) NULL;
