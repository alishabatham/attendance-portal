import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"),
  profileCompleted: boolean("profile_completed").notNull().default(false),
  fullName: text("full_name"),
  joiningDate: text("joining_date"),
  collegeName: text("college_name"),
  branch: text("branch"),
  section: text("section"),
  year: text("year"),
  semester: text("semester"),
  subject: text("subject"),
  interestArea: text("interest_area"),
  interestAreaCustom: text("interest_area_custom"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
