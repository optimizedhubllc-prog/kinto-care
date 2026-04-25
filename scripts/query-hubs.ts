import { drizzle } from "drizzle-orm/mysql2";
import { patientHubs } from "../drizzle/schema";

async function main() {
  const db = drizzle(process.env.DATABASE_URL);

  try {
    const hubs = await db.select({
      id: patientHubs.id,
      patientName: patientHubs.patientName,
    }).from(patientHubs).limit(5);

    console.log("Hubs in database:");
    console.log("================");
    hubs.forEach(hub => {
      console.log(`ID: ${hub.id}`);
      console.log(`Patient Name: ${hub.patientName}`);
      console.log("---");
    });

    if (hubs.length === 0) {
      console.log("No hubs found in database");
    }
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

main();
