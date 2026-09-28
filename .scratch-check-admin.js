const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: __dirname + "/.env.local" });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: "careernotification" });
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
  const user = await User.findOne({ email: "qa-admin@careernotification.com" });
  console.log("found:", !!user);
  if (user) {
    console.log("role:", user.role, "verified:", user.emailVerified);
    console.log("hash starts with:", user.passwordHash?.slice(0, 10));
    const match = await bcrypt.compare("AdminPass123!", user.passwordHash);
    console.log("password matches:", match);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
