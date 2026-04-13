import { Client } from "pg";

async function reset() {
  // Bun automatically loads .env files
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
  
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log("Connecting to database to perform reset...");
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("Connected to database.");

    // Drop public schema to remove all tables
    await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
    await client.query("CREATE SCHEMA public;");
    await client.query("GRANT ALL ON SCHEMA public TO public;");
    
    // Drop drizzle schema to clear migration history
    await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE;");

    console.log("Database schemas reset successfully.");
  } catch (err) {
    console.error("Error resetting database schemas:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

reset();
