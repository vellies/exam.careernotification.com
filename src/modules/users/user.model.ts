import { Schema, deleteModel, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    // Required at signup (see signupSchema) but not at the schema level, so
    // existing accounts and admin-created users without one still save.
    whatsapp: { type: String, trim: true },
    role: {
      type: String,
      enum: ["student", "admin", "super_admin"],
      default: "student",
      required: true,
    },
    // Per-resource CRUD grants for role "admin", e.g.
    // { questions: { read: true, create: true } }. Super admins ignore it
    // (they have full access); students never use it.
    permissions: { type: Schema.Types.Mixed, default: {} },
    emailVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    verificationTokenHash: { type: String, select: false },
    verificationExpires: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;

// In dev, hot reload keeps the model compiled from the previous schema, which
// silently drops newly added fields (like `permissions`) on save. Recompile so
// schema edits take effect without restarting the server.
if (process.env.NODE_ENV !== "production" && models.User) deleteModel("User");

export const User = models.User ?? model("User", userSchema);
