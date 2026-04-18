-- Test Data Seeding Script
-- Creates test workers, vehicles, routes, and customers

-- Insert test workers
INSERT INTO users (openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn) VALUES
('test-worker-1', 'Test Worker 1', 'worker1@test.com', 'pin', 'user', NOW(), NOW(), NOW()),
('test-worker-2', 'Test Worker 2', 'worker2@test.com', 'pin', 'user', NOW(), NOW(), NOW()),
('test-worker-3', 'Test Worker 3', 'worker3@test.com', 'pin', 'user', NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE updatedAt = NOW();

-- Insert test vehicles
INSERT INTO vehicles (plateNumber, capacity, status, startLatitude, startLongitude, createdAt, updatedAt) VALUES
('TEST-001', 500, 'available', '6.5244', '3.3792', NOW(), NOW()),
('TEST-002', 500, 'available', '6.5244', '3.3792', NOW(), NOW()),
('TEST-003', 500, 'available', '6.5244', '3.3792', NOW(), NOW())
ON DUPLICATE KEY UPDATE updatedAt = NOW();

-- Insert test routes (100 customers = 34 per route for 3 workers)
INSERT INTO routes (workerId, vehicleId, scheduledDate, status, totalDistance, estimatedDuration, createdAt, updatedAt) 
SELECT 
  (SELECT id FROM users WHERE openId = 'test-worker-1' LIMIT 1),
  (SELECT id FROM vehicles WHERE plateNumber = 'TEST-001' LIMIT 1),
  DATE_ADD(CURDATE(), INTERVAL 0 DAY),
  'pending',
  ROUND(RAND() * 100 + 20, 2),
  FLOOR(RAND() * 480 + 120),
  NOW(),
  NOW()
UNION ALL
SELECT 
  (SELECT id FROM users WHERE openId = 'test-worker-2' LIMIT 1),
  (SELECT id FROM vehicles WHERE plateNumber = 'TEST-002' LIMIT 1),
  DATE_ADD(CURDATE(), INTERVAL 1 DAY),
  'pending',
  ROUND(RAND() * 100 + 20, 2),
  FLOOR(RAND() * 480 + 120),
  NOW(),
  NOW()
UNION ALL
SELECT 
  (SELECT id FROM users WHERE openId = 'test-worker-3' LIMIT 1),
  (SELECT id FROM vehicles WHERE plateNumber = 'TEST-003' LIMIT 1),
  DATE_ADD(CURDATE(), INTERVAL 2 DAY),
  'pending',
  ROUND(RAND() * 100 + 20, 2),
  FLOOR(RAND() * 480 + 120),
  NOW(),
  NOW();

-- Get route IDs for customer insertion
SET @route1 = (SELECT id FROM routes WHERE workerId = (SELECT id FROM users WHERE openId = 'test-worker-1' LIMIT 1) ORDER BY id DESC LIMIT 1);
SET @route2 = (SELECT id FROM routes WHERE workerId = (SELECT id FROM users WHERE openId = 'test-worker-2' LIMIT 1) ORDER BY id DESC LIMIT 1);
SET @route3 = (SELECT id FROM routes WHERE workerId = (SELECT id FROM users WHERE openId = 'test-worker-3' LIMIT 1) ORDER BY id DESC LIMIT 1);

-- Verify routes were created
SELECT CONCAT('Routes created: ', COUNT(*)) as status FROM routes WHERE workerId IN (SELECT id FROM users WHERE openId LIKE 'test-worker-%');
