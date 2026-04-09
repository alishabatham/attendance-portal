import { Router, type IRouter } from "express";
import { User } from "../models/index.js";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { hashPassword, comparePassword, signToken } from "../lib/auth.js";
import { OAuth2Client } from "google-auth-library";
import type { IUser } from "../models/index.js";

const router: IRouter = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function formatUser(user: IUser) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    profileCompleted: user.profileCompleted,
    fullName: user.fullName,
    joiningDate: user.joiningDate,
    collegeName: user.collegeName,
    branch: user.branch,
    section: user.section,
    year: user.year,
    semester: user.semester,
    subject: user.subject,
    interestArea: user.interestArea,
    interestAreaCustom: user.interestAreaCustom,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    email: email.toLowerCase(),
    name,
    passwordHash,
    role: "student",
    profileCompleted: false,
  });

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  res.json({ token, user: formatUser(user) });
});

router.post("/auth/google-signin", async (req, res): Promise<void> => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google sign-in is not configured on this server" });
    return;
  }

  const { credential } = req.body as { credential?: string };
  if (!credential) {
    res.status(400).json({ error: "Missing Google credential" });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }

    const email = payload.email.toLowerCase();
    const name = payload.name ?? email.split("@")[0] ?? "Student";

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name,
        passwordHash: "",
        role: "student",
        profileCompleted: false,
      });
    }

    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
    res.json({ token, user: formatUser(user) });
  } catch {
    res.status(401).json({ error: "Google authentication failed. Please try again." });
  }
});

export default router;
