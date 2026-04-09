import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle, Calendar, Download } from "lucide-react";
import {
  useGetStudent,
  useGetAttendanceReport,
  getGetStudentQueryKey,
  getGetAttendanceReportQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getToken } from "@/lib/auth";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AdminStudentDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const years = [today.getFullYear() - 1, today.getFullYear()];

  const { data: student, isLoading } = useGetStudent(userId, {
    query: { queryKey: getGetStudentQueryKey(userId), enabled: !!getToken() && !!userId },
  });

  const { data: report, isLoading: reportLoading } = useGetAttendanceReport(userId, { month, year }, {
    query: {
      queryKey: getGetAttendanceReportQueryKey(userId, { month, year }),
      enabled: !!getToken() && !!userId,
    },
  });

  useEffect(() => {
    if (!getToken()) {
      setLocation("/login");
    }
  }, [setLocation]);

  const handleDownloadExcel = useCallback(async () => {
    if (!report || !student) return;
    const { utils, writeFile } = await import("xlsx");

    const studentName = student.fullName ?? student.name;
    const monthName = MONTHS[month - 1];

    const rows = [
      ["Attendance Report"],
      ["Student", studentName],
      ["Email", student.email],
      ["Branch", student.branch ?? ""],
      ["Year", student.year ?? ""],
      ["Month", `${monthName} ${year}`],
      [],
      ["Summary"],
      ["Total Working Days", report.totalWorkingDays],
      ["Present Days", report.presentDays],
      ["Absent Days", report.absentDays],
      ["Attendance %", `${report.attendancePercentage}%`],
      [],
      ["Day-by-Day Breakdown"],
      ["Date", "Day", "Status", "Time"],
    ];

    for (const rec of report.records) {
      const date = new Date(rec.date + "T00:00:00");
      rows.push([
        rec.date,
        date.toLocaleDateString("en-US", { weekday: "long" }),
        rec.status,
        rec.time ?? "",
      ]);
    }

    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    utils.book_append_sheet(wb, ws, "Attendance Report");
    writeFile(wb, `Attendance_${String(studentName).replace(/\s+/g, "_")}_${monthName}_${year}.xlsx`);
  }, [report, student, month, year]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!student) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">Student not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/admin/students")}>
            Back to Students
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setLocation("/admin/students")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {(student.fullName ?? student.name).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {student.fullName ?? student.name}
              </h2>
              <p className="text-muted-foreground">{student.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Profile */}
          <Card className="border-card-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "College", value: student.collegeName },
                  { label: "Branch", value: student.branch },
                  { label: "Section", value: student.section },
                  { label: "Year", value: student.year },
                  { label: "Semester", value: student.semester },
                  { label: "Subject", value: student.subject },
                  { label: "Interest", value: student.interestArea === "Other" ? student.interestAreaCustom : student.interestArea },
                  { label: "Joined", value: student.joiningDate },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</span>
                    <span className="text-sm font-medium">{item.value ?? "—"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance summary */}
          <Card className="border-card-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Monthly Summary</CardTitle>
                <div className="flex gap-2">
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="h-7 text-xs w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded" />
                </div>
              ) : report ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{report.presentDays}</p>
                      <p className="text-xs text-muted-foreground mt-1">Present</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{report.absentDays}</p>
                      <p className="text-xs text-muted-foreground mt-1">Absent</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Attendance</span>
                      <span className="font-bold text-primary">{report.attendancePercentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${report.attendancePercentage >= 75 ? "bg-green-500" : "bg-destructive"}`}
                        style={{ width: `${report.attendancePercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Working Days</span>
                    <Badge variant="outline">{report.totalWorkingDays}</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attendance data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Day-by-day breakdown — matches the summary box exactly */}
        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Day-by-Day Breakdown — {MONTHS[(month - 1)]} {year}
              </CardTitle>
              {report && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-1.5 text-xs h-8"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Excel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !report || report.records.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No working days found for this period.</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {report.records.map((rec) => {
                  const date = new Date(rec.date + "T00:00:00");
                  const label = date.toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                  const present = rec.status === "Present";
                  return (
                    <div
                      key={rec.date}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {present ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span className="text-sm">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {present && rec.time && (
                          <span className="text-xs text-muted-foreground font-mono">{rec.time}</span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${present
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                          {rec.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
