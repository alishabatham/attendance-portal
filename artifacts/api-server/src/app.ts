import express, { type Application } from "express";
import cors from "cors";
import * as pinoHttpModule from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { connectDB } from "./lib/db.js";
import { User } from "./models/index.js";
import { hashPassword } from "./lib/auth.js";

const pinoHttp = (pinoHttpModule as unknown as { default: typeof pinoHttpModule.default }).default ?? pinoHttpModule.default;

const app: Application = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: { id: string; method: string; url?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: { statusCode: number }) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

async function seedDemoUsers() {
  const demoUsers = [
    { email: "admin@portal.com", name: "Admin", password: "Admin@123", role: "admin" as const, profileCompleted: true },
    { email: "alice@student.com", name: "Alice", password: "Pass@123", role: "student" as const, profileCompleted: false },
    { email: "bob@student.com", name: "Bob", password: "Pass@123", role: "student" as const, profileCompleted: false },
  ];

  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      const passwordHash = await hashPassword(u.password);
      await User.create({
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        profileCompleted: u.profileCompleted,
      });
      logger.info({ email: u.email }, "Demo user seeded");
    }
  }
}

let initPromise: Promise<void> | null = null;

export function initializeApp(): Promise<void> {
  if (!initPromise) {
    initPromise = connectDB()
      .then(() => seedDemoUsers())
      .then(() => {
        logger.info("App initialized");
      });
  }
  return initPromise;
}

export default app;
