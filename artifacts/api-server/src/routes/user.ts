import { Router, type IRouter } from "express";
import { User } from "../models/index.js";
import { SaveProfileBody } from "@workspace/api-zod";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate.js";
import type { IUser } from "../models/index.js";

const router: IRouter = Router();

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

router.get("/user/profile", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.userId;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

router.post("/user/profile", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.userId;

  const parsed = SaveProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    fullName,
    joiningDate,
    collegeName,
    branch,
    section,
    year,
    semester,
    subject,
    interestArea,
    interestAreaCustom,
  } = parsed.data;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      fullName,
      joiningDate,
      collegeName,
      branch,
      section,
      year,
      semester,
      subject,
      interestArea,
      interestAreaCustom: interestAreaCustom ?? null,
      profileCompleted: true,
    },
    { new: true }
  );

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

export default router;
