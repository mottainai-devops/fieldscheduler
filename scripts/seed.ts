import { drizzle } from "drizzle-orm/mysql2";
import { workers, vehicles, customers } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("Seeding database...");

  // Seed workers
  await db.insert(workers).values([
    {
      name: "John Smith",
      email: "john@example.com",
      phone: "+234 801 234 5678",
      skills: JSON.stringify(["maintenance", "inspection"]),
      status: "active",
      shiftStart: "08:00",
      shiftEnd: "17:00",
    },
    {
      name: "Mary Johnson",
      email: "mary@example.com",
      phone: "+234 802 345 6789",
      skills: JSON.stringify(["repair", "maintenance"]),
      status: "active",
      shiftStart: "08:00",
      shiftEnd: "17:00",
    },
    {
      name: "David Williams",
      email: "david@example.com",
      phone: "+234 803 456 7890",
      skills: JSON.stringify(["inspection", "compliance"]),
      status: "active",
      shiftStart: "09:00",
      shiftEnd: "18:00",
    },
  ]);

  // Seed vehicles
  await db.insert(vehicles).values([
    {
      name: "Van 1",
      plateNumber: "LAG-123-AB",
      capacity: 10,
      status: "available",
      startLatitude: "6.5244",
      startLongitude: "3.3792",
      maxDistance: 200,
    },
    {
      name: "Truck 2",
      plateNumber: "LAG-456-CD",
      capacity: 15,
      status: "available",
      startLatitude: "6.5244",
      startLongitude: "3.3792",
      maxDistance: 250,
    },
    {
      name: "Van 3",
      plateNumber: "LAG-789-EF",
      capacity: 8,
      status: "available",
      startLatitude: "6.5244",
      startLongitude: "3.3792",
      maxDistance: 180,
    },
  ]);

  // Seed customers (Lagos area coordinates)
  await db.insert(customers).values([
    {
      name: "Victoria Island Plaza",
      address: "123 Ahmadu Bello Way, Victoria Island, Lagos",
      latitude: "6.4281",
      longitude: "3.4219",
      serviceType: "maintenance",
      priority: "high",
      buildingId: "VI-001",
      coordinateSource: "manual",
    },
    {
      name: "Ikoyi Heights",
      address: "45 Kingsway Road, Ikoyi, Lagos",
      latitude: "6.4541",
      longitude: "3.4316",
      serviceType: "inspection",
      priority: "medium",
      buildingId: "IK-002",
      coordinateSource: "manual",
    },
    {
      name: "Lekki Gardens",
      address: "78 Admiralty Way, Lekki Phase 1, Lagos",
      latitude: "6.4474",
      longitude: "3.4706",
      serviceType: "maintenance",
      priority: "medium",
      buildingId: "LK-003",
      coordinateSource: "manual",
    },
    {
      name: "Ikeja City Mall",
      address: "12 Obafemi Awolowo Way, Ikeja, Lagos",
      latitude: "6.6018",
      longitude: "3.3515",
      serviceType: "repair",
      priority: "high",
      buildingId: "IJ-004",
      coordinateSource: "manual",
    },
    {
      name: "Surulere Shopping Complex",
      address: "34 Adeniran Ogunsanya Street, Surulere, Lagos",
      latitude: "6.4969",
      longitude: "3.3606",
      serviceType: "maintenance",
      priority: "low",
      buildingId: "SR-005",
      coordinateSource: "manual",
    },
    {
      name: "Maryland Business Center",
      address: "56 Ikorodu Road, Maryland, Lagos",
      latitude: "6.5795",
      longitude: "3.3675",
      serviceType: "inspection",
      priority: "medium",
      buildingId: "MD-006",
      coordinateSource: "manual",
    },
    {
      name: "Yaba Tech Hub",
      address: "89 Herbert Macaulay Way, Yaba, Lagos",
      latitude: "6.5156",
      longitude: "3.3784",
      serviceType: "maintenance",
      priority: "high",
      buildingId: "YB-007",
      coordinateSource: "manual",
    },
    {
      name: "Apapa Port Complex",
      address: "23 Wharf Road, Apapa, Lagos",
      latitude: "6.4474",
      longitude: "3.3595",
      serviceType: "compliance",
      priority: "high",
      buildingId: "AP-008",
      coordinateSource: "manual",
    },
    {
      name: "Ajah Residential Estate",
      address: "67 Lekki-Epe Expressway, Ajah, Lagos",
      latitude: "6.4667",
      longitude: "3.5667",
      serviceType: "maintenance",
      priority: "medium",
      buildingId: "AJ-009",
      coordinateSource: "manual",
    },
    {
      name: "Festac Town Plaza",
      address: "12 23rd Avenue, Festac Town, Lagos",
      latitude: "6.4667",
      longitude: "3.2833",
      serviceType: "inspection",
      priority: "low",
      buildingId: "FT-010",
      coordinateSource: "manual",
    },
    {
      name: "Banana Island Towers",
      address: "5 Ocean Parade, Banana Island, Lagos",
      latitude: "6.4167",
      longitude: "3.4333",
      serviceType: "maintenance",
      priority: "high",
      buildingId: "BI-011",
      coordinateSource: "manual",
    },
    {
      name: "Gbagada Industrial Park",
      address: "34 Gbagada Expressway, Gbagada, Lagos",
      latitude: "6.5500",
      longitude: "3.3833",
      serviceType: "repair",
      priority: "medium",
      buildingId: "GB-012",
      coordinateSource: "manual",
    },
  ]);

  console.log("Database seeded successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });

