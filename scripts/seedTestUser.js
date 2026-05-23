const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const email = "test1@example.com";
  const password = "test1";

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "owner",
      business_name: "Test Gym",
      phone: "+911234567890",
    },
  });

  if (error) {
    console.error("Failed to create test owner:", error.message);
    process.exit(1);
  }

  console.log("Created test owner:", data.id, email);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
