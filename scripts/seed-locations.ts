import { drizzle } from "drizzle-orm/mysql2";
import { workerLocations } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seedLocations() {
  console.log("Adding worker location data...");

  await db.insert(workerLocations).values([
    {
      workerId: 1,
      latitude: "6.4541",
      longitude: "3.4316",
      batteryLevel: 85,
      signalStrength: "excellent",
      status: "active",
    },
    {
      workerId: 2,
      latitude: "6.4474",
      longitude: "3.4706",
      batteryLevel: 62,
      signalStrength: "good",
      status: "active",
    },
    {
      workerId: 3,
      latitude: "6.6018",
      longitude: "3.3515",
      batteryLevel: 45,
      signalStrength: "fair",
      status: "active",
    },
  ]);

  console.log("Worker locations added successfully!");
}

seedLocations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error adding locations:", error);
    process.exit(1);
  });

