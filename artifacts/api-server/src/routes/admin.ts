import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, usersTable, attendanceTable } from "@workspace/db";
import { authenticate, requireAdmin, type AuthenticatedRequest } from "../middlewares/authenticate.js";
import {
  ListStudentsQueryParams,
  GetStudentParams,
  GetAdminAttendanceByDateQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
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

router.get(
  "/admin/students",
  authenticate,
  requireAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const queryParsed = ListStudentsQueryParams.safeParse(req.query);
    const params = queryParsed.success ? queryParsed.data : {};

    const conditions = [eq(usersTable.role, "student")];

    if (params.branch) {
      conditions.push(ilike(usersTable.branch, `%${params.branch}%`));
    }
    if (params.year) {
      conditions.push(ilike(usersTable.year, `%${params.year}%`));
    }
    if (params.interestArea) {
      conditions.push(ilike(usersTable.interestArea, `%${params.interestArea}%`));
    }
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      const allStudents = await db
        .select()
        .from(usersTable)
        .where(and(...conditions));

      const filtered = allStudents.filter(
        (s) =>
          s.name.toLowerCase().includes(params.search!.toLowerCase()) ||
          s.email.toLowerCase().includes(params.search!.toLowerCase()) ||
          (s.fullName?.toLowerCase().includes(params.search!.toLowerCase()) ?? false)
      );

      res.json(filtered.map(formatUser));
      return;
    }

    const students = await db
      .select()
      .from(usersTable)
      .where(and(...conditions));

    res.json(students.map(formatUser));
  }
);

router.get(
  "/admin/students/:userId",
  authenticate,
  requireAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const paramsParsed = GetStudentParams.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ error: paramsParsed.error.message });
      return;
    }

    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, paramsParsed.data.userId));

    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    res.json(formatUser(student));
  }
);

router.get(
  "/admin/attendance",
  authenticate,
  requireAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const queryParsed = GetAdminAttendanceByDateQueryParams.safeParse(req.query);
    const date =
      queryParsed.success && queryParsed.data.date
        ? queryParsed.data.date
        : new Date().toISOString().split("T")[0];

    const records = await db
      .select({
        id: attendanceTable.id,
        userId: attendanceTable.userId,
        date: attendanceTable.date,
        time: attendanceTable.time,
        status: attendanceTable.status,
        studentName: usersTable.fullName,
        branch: usersTable.branch,
        year: usersTable.year,
        email: usersTable.email,
      })
      .from(attendanceTable)
      .leftJoin(usersTable, eq(attendanceTable.userId, usersTable.id))
      .where(eq(attendanceTable.date, date as string));

    res.json(
      records.map((r) => ({
        id: r.id,
        userId: r.userId,
        date: r.date,
        time: r.time,
        status: r.status,
        studentName: r.studentName,
        branch: r.branch,
        year: r.year,
        email: r.email ?? "",
      }))
    );
  }
);

router.get(
  "/admin/monthly-report",
  authenticate,
  requireAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
      res.status(400).json({ error: "Invalid month or year" });
      return;
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const endDate = endOfMonth > now ? now : endOfMonth;

    // Collect all working days in the month
    const workingDays: string[] = [];
    const cursor = new Date(startOfMonth);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= endDate) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) {
        workingDays.push(cursor.toISOString().split("T")[0] as string);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Fetch all students
    const students = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "student"));

    // Fetch all attendance records and filter for the month in-memory
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;

    const allMonthRecords = await db
      .select()
      .from(attendanceTable);

    // Build a map: userId -> Set<date>
    const presentMap = new Map<number, Set<string>>();
    for (const rec of allMonthRecords) {
      if (rec.date >= monthStart && rec.date <= monthEnd) {
        if (!presentMap.has(rec.userId)) {
          presentMap.set(rec.userId, new Set());
        }
        presentMap.get(rec.userId)!.add(rec.date);
      }
    }

    const result = students.map((student) => {
      const portalJoinDate = new Date(student.createdAt);
      portalJoinDate.setHours(0, 0, 0, 0);
      const presentSet = presentMap.get(student.id) ?? new Set<string>();

      // Only count working days from when student joined the portal
      const studentWorkingDays = workingDays.filter((d) => new Date(d) >= portalJoinDate);
      const presentDays = studentWorkingDays.filter((d) => presentSet.has(d)).length;
      const absentDays = studentWorkingDays.length - presentDays;
      const percentage = studentWorkingDays.length > 0
        ? Math.round((presentDays / studentWorkingDays.length) * 1000) / 10
        : 0;

      // Per-day status for all working days
      const dayStatus: Record<string, string> = {};
      for (const d of workingDays) {
        const joinedByThen = new Date(d) >= portalJoinDate;
        if (!joinedByThen) {
          dayStatus[d] = "—";
        } else if (presentSet.has(d)) {
          dayStatus[d] = "P";
        } else {
          dayStatus[d] = "A";
        }
      }

      return {
        id: student.id,
        name: student.fullName ?? student.name,
        email: student.email,
        branch: student.branch ?? "",
        year: student.year ?? "",
        section: student.section ?? "",
        portalJoinDate: student.createdAt.toISOString().split("T")[0],
        joiningDate: student.joiningDate ?? null,
        totalWorkingDays: studentWorkingDays.length,
        presentDays,
        absentDays,
        percentage,
        dayStatus,
      };
    });

    res.json({
      month,
      year,
      workingDays,
      students: result,
    });
  }
);

router.get(
  "/admin/stats",
  authenticate,
  requireAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const today = new Date().toISOString().split("T")[0] as string;

    const allStudents = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "student"));

    const todayAttendance = await db
      .select()
      .from(attendanceTable)
      .where(eq(attendanceTable.date, today));

    const totalStudents = allStudents.length;
    const presentToday = todayAttendance.length;
    const absentToday = totalStudents - presentToday;

    const branchMap = new Map<string, number>();
    const yearMap = new Map<string, number>();
    const interestMap = new Map<string, number>();

    for (const s of allStudents) {
      if (s.branch) branchMap.set(s.branch, (branchMap.get(s.branch) ?? 0) + 1);
      if (s.year) yearMap.set(s.year, (yearMap.get(s.year) ?? 0) + 1);
      if (s.interestArea)
        interestMap.set(s.interestArea, (interestMap.get(s.interestArea) ?? 0) + 1);
    }

    res.json({
      totalStudents,
      presentToday,
      absentToday,
      branchBreakdown: Array.from(branchMap.entries()).map(([branch, count]) => ({
        branch,
        count,
      })),
      yearBreakdown: Array.from(yearMap.entries()).map(([year, count]) => ({
        year,
        count,
      })),
      interestBreakdown: Array.from(interestMap.entries()).map(
        ([interestArea, count]) => ({ interestArea, count })
      ),
    });
  }
);

export default router;
