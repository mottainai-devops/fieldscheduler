#!/usr/bin/env python3

import os
import sys
import random
import mysql.connector
from datetime import datetime, timedelta

customer_count = int(sys.argv[1]) if len(sys.argv) > 1 else 100

db_url = os.environ.get('DATABASE_URL', '')
if not db_url:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

try:
    from urllib.parse import urlparse
    parsed = urlparse(db_url)
    config = {
        'host': parsed.hostname,
        'user': parsed.username,
        'password': parsed.password,
        'database': parsed.path.lstrip('/'),
        'port': parsed.port or 3306,
    }
except:
    print("❌ Invalid DATABASE_URL format")
    sys.exit(1)

def generate_coordinates():
    base_lat = 6.5244
    base_lng = 3.3792
    lat_offset = (random.random() - 0.5) * 0.5
    lng_offset = (random.random() - 0.5) * 0.5
    return round(base_lat + lat_offset, 6), round(base_lng + lng_offset, 6)

def seed_test_data(customer_count):
    print(f"\n🚀 Seeding test data for {customer_count} customers...")
    
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()
        
        print("📋 Creating workers...")
        workers_data = [
            ('Test Worker 1', 'worker1@test.com', '08012345678'),
            ('Test Worker 2', 'worker2@test.com', '08087654321'),
            ('Test Worker 3', 'worker3@test.com', '08098765432'),
        ]
        
        worker_ids = []
        for name, email, phone in workers_data:
            try:
                cursor.execute(
                    "INSERT INTO workers (name, email, phone, status, createdAt, updatedAt) "
                    "VALUES (%s, %s, %s, 'active', NOW(), NOW())",
                    (name, email, phone)
                )
                conn.commit()
                worker_id = cursor.lastrowid
                worker_ids.append(worker_id)
                print(f"  ✓ Worker {name} (ID: {worker_id})")
            except Exception as e:
                print(f"  ✗ Error creating worker {name}: {e}")
        
        print("🚗 Creating vehicles...")
        vehicles_data = [
            ('Test Vehicle 1', 'TEST-001', 500),
            ('Test Vehicle 2', 'TEST-002', 500),
            ('Test Vehicle 3', 'TEST-003', 500),
        ]
        
        vehicle_ids = []
        for name, plate, capacity in vehicles_data:
            try:
                cursor.execute(
                    "INSERT INTO vehicles (name, plateNumber, capacity, status, startLatitude, startLongitude, createdAt, updatedAt) "
                    "VALUES (%s, %s, %s, 'available', '6.5244', '3.3792', NOW(), NOW())",
                    (name, plate, capacity)
                )
                conn.commit()
                vehicle_id = cursor.lastrowid
                vehicle_ids.append(vehicle_id)
                print(f"  ✓ Vehicle {plate} (ID: {vehicle_id})")
            except Exception as e:
                print(f"  ✗ Error creating vehicle {plate}: {e}")
        
        if not vehicle_ids or not worker_ids:
            print("❌ Failed to create workers or vehicles")
            return
        
        print(f"📍 Creating {customer_count} customers in routes...")
        
        customers_per_route = (customer_count + len(worker_ids) - 1) // len(worker_ids)
        total_customers = 0
        total_routes = 0
        
        for w_idx, worker_id in enumerate(worker_ids):
            vehicle_id = vehicle_ids[w_idx % len(vehicle_ids)]
            route_customer_count = min(customers_per_route, customer_count - total_customers)
            
            if route_customer_count <= 0:
                break
            
            scheduled_date = (datetime.now() + timedelta(days=w_idx)).date()
            total_distance = str(round(random.random() * 100 + 20, 2))
            estimated_duration = str(random.randint(120, 600))
            
            try:
                cursor.execute(
                    "INSERT INTO routes (workerId, vehicleId, scheduledDate, status, totalDistance, estimatedDuration, createdAt, updatedAt) "
                    "VALUES (%s, %s, %s, 'pending', %s, %s, NOW(), NOW())",
                    (worker_id, vehicle_id, scheduled_date, total_distance, estimated_duration)
                )
                conn.commit()
                route_id = cursor.lastrowid
                total_routes += 1
                print(f"  ✓ Created route {total_routes} for worker {worker_id} with {route_customer_count} customers")
                
                customer_values = []
                for c in range(route_customer_count):
                    lat, lng = generate_coordinates()
                    service_types = ['Delivery', 'Installation', 'Maintenance', 'Inspection', 'Repair']
                    priorities = ['high', 'medium', 'low']
                    
                    customer_values.append((
                        f"Test Customer {total_customers + c + 1}",
                        f"Address {total_customers + c + 1}, Lagos",
                        str(lat),
                        str(lng),
                        f"080{random.randint(1000000000, 9999999999)}",
                        f"customer{total_customers + c + 1}@test.com",
                        random.choice(service_types),
                        random.choice(priorities),
                    ))
                
                if customer_values:
                    cursor.executemany(
                        "INSERT INTO customers (name, address, latitude, longitude, phone, email, serviceType, priority, createdAt, updatedAt) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())",
                        customer_values
                    )
                    conn.commit()
                    
                    cursor.execute("SELECT id FROM customers ORDER BY id DESC LIMIT %s", (route_customer_count,))
                    customer_ids = [row[0] for row in cursor.fetchall()]
                    customer_ids.reverse()
                    
                    route_customer_values = [(route_id, cid) for cid in customer_ids]
                    cursor.executemany(
                        "INSERT INTO routeCustomers (routeId, customerId) VALUES (%s, %s)",
                        route_customer_values
                    )
                    conn.commit()
                    
                    total_customers += len(customer_values)
                    
                    if total_customers % 50 == 0:
                        print(f"    ✓ Created {total_customers} customers...")
            
            except Exception as e:
                print(f"  ✗ Error creating route: {e}")
        
        print(f"\n✅ Test data seeding complete!")
        print(f"   - Workers: {len(worker_ids)}")
        print(f"   - Vehicles: {len(vehicle_ids)}")
        print(f"   - Routes: {total_routes}")
        print(f"   - Customers: {total_customers}")
        
        cursor.close()
        conn.close()
        
    except Exception as error:
        print(f"❌ Error: {error}")
        sys.exit(1)

if __name__ == '__main__':
    seed_test_data(customer_count)
