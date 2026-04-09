import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, attendanceTable, usersTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate.js";
import { GetAttendanceReportParams, GetAttendanceReportQueryParams, GetAttendanceHistoryParams } from "@workspace/api-zod";
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

  // Location check
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

  const existing = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.userId, userId), eq(attendanceTable.date, today)));

  if (existing.length > 0) {
    res.status(409).json({ error: "Attendance already marked for today" });
    return;
  }

  const { localTime } = req.body as { localTime?: string };
  const timeToStore = localTime ?? getCurrentTime();

  const [record] = await db
    .insert(attendanceTable)
    .values({
      userId,
      date: today,
      time: timeToStore,
      status: "Present",
    })
    .returning();

  res.status(201).json({
    id: record!.id,
    userId: record!.userId,
    date: record!.date,
    time: record!.time,
    status: record!.status,
  });
});

router.get("/attendance/today", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.userId;
  const today = getTodayDate();

  const [record] = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.userId, userId), eq(attendanceTable.date, today)));

  if (!record) {
    res.json({ marked: false, record: null });
    return;
  }

  res.json({
    marked: true,
    record: {
      id: record.id,
      userId: record.userId,
      date: record.date,
      time: record.time,
      status: record.status,
    },
  });
});

router.get("/attendance/report/:userId", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const paramsParsed = GetAttendanceReportParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: paramsParsed.error.message });
    return;
  }

  const queryParsed = GetAttendanceReportQueryParams.safeParse(req.query);
  const targetUserId = paramsParsed.data.userId;

  const requestingUserId = req.user!.userId;
  const requestingRole = req.user!.role;

  if (requestingRole !== "admin" && requestingUserId !== targetUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [student] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, targetUserId));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const now = new Date();
  const month = queryParsed.success && queryParsed.data.month ? queryParsed.data.month : now.getMonth() + 1;
  const year = queryParsed.success && queryParsed.data.year ? queryParsed.data.year : now.getFullYear();

  // Use account creation date as the baseline — joiningDate is academic metadata,
  // not when the student started using the portal.
  const portalJoinDate = new Date(student.createdAt);

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  // Start counting attendance from whichever is later: start of month or portal join date
  const startDate = portalJoinDate > startOfMonth ? portalJoinDate : startOfMonth;
  const endDate = endOfMonth > now ? now : endOfMonth;

  const allRecords = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.userId, targetUserId));

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
  const paramsParsed = GetAttendanceHistoryParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: paramsParsed.error.message });
    return;
  }

  const targetUserId = paramsParsed.data.userId;
  const requestingUserId = req.user!.userId;
  const requestingRole = req.user!.role;

  if (requestingRole !== "admin" && requestingUserId !== targetUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const records = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.userId, targetUserId))
    .orderBy(attendanceTable.date);

  res.json(
    records.map((r) => ({
      id: r.id,
      userId: r.userId,
      date: r.date,
      time: r.time,
      status: r.status,
    }))
  );
});

export default router;
