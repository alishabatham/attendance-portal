import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { User, Attendance } from "../models/index.js";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate.js";
import { getLocationSettings } from "./settings.js";

function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const router: IRouter = Router();

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0] as string;
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

router.post("/attendance/mark", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.userId;
  const today = getTodayDate();

  const locSettings = await getLocationSettings();
  if (locSettings.enforcement && locSettings.configured) {
    const { latitude, longitude } = req.body as { latitude?: number; longitude?: number };
    if (latitude === undefined || longitude === undefined) {
      res.status(403).json({
        error: "Location required",
        code: "LOCATION_REQUIRED",
        message: "Please allow location access to mark attendance.",
      });
      return;
    }
    const distM = haversineDistanceM(locSettings.lat!, locSettings.lng!, latitude, longitude);
    if (distM > locSettings.radiusM) {
      res.status(403).json({
        error: "Out of range",
        code: "OUT_OF_RANGE",
        message: `You are ${Math.round(distM)}m away from the allowed location (limit: ${locSettings.radiusM}m). Please be on campus to mark attendance.`,
        distanceM: Math.round(distM),
        allowedRadiusM: locSettings.radiusM,
      });
      return;
    }
  }

  const existing = await Attendance.findOne({ userId: new mongoose.Types.ObjectId(userId), date: today });

  if (existing) {
    res.status(409).json({ error: "Attendance already marked for today" });
    return;
  }

  const { localTime } = req.body as { localTime?: string };
  const timeToStore = localTime ?? getCurrentTime();

  const record = await Attendance.create({
    userId: new mongoose.Types.ObjectId(userId),
    date: today,
    time: timeToStore,
    status: "Present",
  });

  res.status(201).json({
    id: record._id.toString(),
    userId: record.userId.toString(),
    date: record.date,
    time: record.time,
    status: record.status,
  });
});

router.get("/attendance/today", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.userId;
  const today = getTodayDate();

  const record = await Attendance.findOne({ userId: new mongoose.Types.ObjectId(userId), date: today });

  if (!record) {
    res.json({ marked: false, record: null });
    return;
  }

  res.json({
    marked: true,
    record: {
      id: record._id.toString(),
      userId: record.userId.toString(),
      date: record.date,
      time: record.time,
      status: record.status,
    },
  });
});

router.get("/attendance/report/:userId", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const targetUserId = String(req.params["userId"] ?? "");
  if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const requestingUserId = req.user!.userId;
  const requestingRole = req.user!.role;

  if (requestingRole !== "admin" && requestingUserId !== targetUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const student = await User.findById(targetUserId);
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const now = new Date();
  const month = req.query["month"] ? Number(req.query["month"]) : now.getMonth() + 1;
  const year = req.query["year"] ? Number(req.query["year"]) : now.getFullYear();

  const portalJoinDate = new Date(student.createdAt);

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  const startDate = portalJoinDate > startOfMonth ? portalJoinDate : startOfMonth;
  const endDate = endOfMonth > now ? now : endOfMonth;

  const allRecords = await Attendance.find({ userId: new mongoose.Types.ObjectId(targetUserId) });

  const recordMap = new Map<string, typeof allRecords[0]>();
  for (const r of allRecords) {
    recordMap.set(r.date, r);
  }

  const dailyRecords: { date: string; status: string; time: string | null }[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    const dayStr = cursor.toISOString().split("T")[0] as string;
    const dayOfWeek = cursor.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const rec = recordMap.get(dayStr);
      dailyRecords.push({
        date: dayStr,
        status: rec ? "Present" : "Absent",
        time: rec ? rec.time : null,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const totalWorkingDays = dailyRecords.length;
  const presentDays = dailyRecords.filter((d) => d.status === "Present").length;
  const absentDays = totalWorkingDays - presentDays;
  const attendancePercentage =
    totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100 * 10) / 10 : 0;

  res.json({
    userId: targetUserId,
    studentName: student.fullName ?? student.name,
    joiningDate: student.joiningDate ?? null,
    totalWorkingDays,
    presentDays,
    absentDays,
    attendancePercentage,
    records: dailyRecords,
  });
});

router.get("/attendance/history/:userId", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const targetUserId = String(req.params["userId"] ?? "");
  if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const requestingUserId = req.user!.userId;
  const requestingRole = req.user!.role;

  if (requestingRole !== "admin" && requestingUserId !== targetUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const records = await Attendance.find({ userId: new mongoose.Types.ObjectId(targetUserId) })
    .sort({ date: 1 });

  res.json(
    records.map((r) => ({
      id: r._id.toString(),
      userId: r.userId.toString(),
      date: r.date,
      time: r.time,
      status: r.status,
    }))
  );
});

export default router;
