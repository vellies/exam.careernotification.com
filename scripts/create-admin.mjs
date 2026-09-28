// Usage: npm run create-admin -- --name="Admin Name" --email=admin@careernotification.com --password="StrongPass123!" [--role=super_admin|admin]
// Defaults to super_admin (full access). A plain admin starts with no
// permissions; a super admin grants them from Admin > Users.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

function getArg(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function main() {
  const name = getArg("name");
  const email = getArg("email")?.toLowerCase().trim();
  const password = getArg("password");
  const role = getArg("role") ?? "super_admin";

  if (!["super_admin", "admin"].includes(role)) {
    console.error("--role must be super_admin or admin.");
    process.exit(1);
  }

  if (!name || !email || !password) {
    console.error(
      'Usage: npm run create-admin -- --name="Admin Name" --email=admin@example.com --password="StrongPass123!"',
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || "careernotification",
  });

  const User = mongoose.model(
    "User",
    new mongoose.Schema({}, { strict: false }),
    "users",
  );

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.set({
      name,
      passwordHash,
      role,
      emailVerified: true,
    });
    await existing.save();
    console.log(`Updated existing user ${email} to ${role}.`);
  } else {
    await User.create({
      name,
      email,
      passwordHash,
      role,
      emailVerified: true,
    });
    console.log(`Created ${role} user ${email}.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
