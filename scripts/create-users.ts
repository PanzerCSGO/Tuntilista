// One-time script: create users with username login
// Run: npx tsx scripts/create-users.ts

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const users = [
  { username: "aleksi",  name: "Aleksi Ruokonen", email: "aleksi@tuntilista.local" },
  { username: "niko",    name: "Niko Peippo",      email: "niko@tuntilista.local" },
  { username: "mikko",   name: "Mikko Numminen",   email: "mikko@tuntilista.local" },
  { username: "mika",    name: "Mika Numminen",    email: "mika@tuntilista.local" },
  { username: "riku",    name: "Riku Mäkinen",     email: "riku@tuntilista.local" },
  { username: "joona",   name: "Joona Tuomisto",   email: "joona@tuntilista.local" },
  { username: "santeri", name: "Santeri Polo",      email: "santeri@tuntilista.local" },
];

const PASSWORD = "1234";

async function main() {
  for (const u of users) {
    console.log(`Creating ${u.name} (${u.username})...`);

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true, // skip email verification
      user_metadata: { username: u.username, full_name: u.name },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log(`  ⚠ Already exists, skipping.`);
      } else {
        console.log(`  ✗ Error: ${error.message}`);
      }
      continue;
    }

    console.log(`  ✓ Created (id: ${data.user.id})`);
  }

  // Verify profiles were created by trigger
  const { data: profiles } = await supabase.from("profiles").select("username, email");
  console.log("\nProfiles in DB:");
  console.table(profiles);
}

main().catch(console.error);
