// Usage: npm run promote-super-admin -- --email=admin@careernotification.com
// Makes an existing account a super admin without touching its password.
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const prefix = "--email=";
const email = process.argv
  .find((arg) => arg.startsWith(prefix))
  ?.slice(prefix.length)
  .toLowerCase()
  .trim();

if (!email) {
  console.error("Usage: npm run promote-super-admin -- --email=admin@example.com");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME || "careernotification",
});

const result = await mongoose.connection
  .collection("users")
  .updateOne({ email }, { $set: { role: "super_admin", permissions: {} } });

console.log(
  result.matchedCount
    ? `${email} is now a super admin.`
    : `No user found with email ${email}.`,
);

await mongoose.disconnect();
