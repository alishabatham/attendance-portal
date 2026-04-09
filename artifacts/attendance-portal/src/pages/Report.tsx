import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Calendar, TrendingUp, Download } from "lucide-react";
import {
  useGetProfile,
  useGetAttendanceReport,
  getGetProfileQueryKey,
  getGetAttendanceReportQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/auth";

export default function Report() {
  const [, setLocation] = useLocation();
  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), enabled: !!getToken() },
  });

  const userId = profile?.id;

  const { data: report, isLoading } = useGetAttendanceReport(userId ?? 0, { month, year }, {
    query: {
      queryKey: getGetAttendanceReportQueryKey(userId ?? 0, { month, year }),
      enabled: !!userId,
    },
  });

  useEffect(() => {
    if (!getToken()) {
      setLocation("/login");
    }
  }, [setLocation]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const years = [today.getFullYear() - 1, today.getFullYear()];

  const handleDownloadExcel = useCallback(async () => {
    if (!report) return;
    const { utils, writeFile } = await import("xlsx");

    const monthName = months[month - 1];
    const studentName = report.studentName ?? profile?.fullName ?? profile?.name ?? "Student";

    const summaryData = [
      ["Attendance Report"],
      ["Student", studentName],
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
      summaryData.push([
        rec.date,
        date.toLocaleDateString("en-US", { weekday: "long" }),
        rec.status,
        rec.time ?? "",
      ]);
    }

    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet(summaryData);

    ws["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];

    utils.book_append_sheet(wb, ws, "Attendance Report");
    writeFile(wb, `Attendance_${studentName.replace(/\s+/g, "_")}_${monthName}_${year}.xlsx`);
  }, [report, month, year, months, profile]);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Attendance Report</h2>
            <p className="text-muted-foreground mt-1">Monthly breakdown of your attendance</p>
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36" data-testid="select-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28" data-testid="select-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {report && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 shrink-0"
                data-testid="button-download-excel"
              >
                <Download className="w-4 h-4" />
                Download Excel
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="p-4 h-20 animate-pulse bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : report ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-card-border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Working Days</p>
                  <p className="text-2xl font-bold mt-1" data-testid="stat-total">{report.totalWorkingDays}</p>
                </CardContent>
              </Card>
              <Card className="border-card-border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Present</p>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400" data-testid="stat-present">{report.presentDays}</p>
                </CardContent>
              </Card>
              <Card className="border-card-border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Absent</p>
                  <p className="text-2xl font-bold mt-1 text-destructive" data-testid="stat-absent">{report.absentDays}</p>
                </CardContent>
              </Card>
              <Card className="border-card-border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Attendance</p>
                  <p className={`text-2xl font-bold mt-1 ${report.attendancePercentage >= 75 ? "text-green-600 dark:text-green-400" : "text-destructive"}`} data-testid="stat-percentage">
                    {report.attendancePercentage}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Progress bar */}
            <Card className="border-card-border shadow-sm mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span>Overall Attendance</span>
                  </div>
                  <span className="text-sm font-bold">{report.attendancePercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${report.attendancePercentage >= 75 ? "bg-green-500" : report.attendancePercentage >= 50 ? "bg-yellow-500" : "bg-destructive"}`}
                    style={{ width: `${Math.min(report.attendancePercentage, 100)}%` }}
                    data-testid="progress-bar"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="text-yellow-600 font-medium">75% required</span>
                  <span>100%</span>
                </div>
              </CardContent>
            </Card>

            {/* Day-by-day grid */}
            <Card className="border-card-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Day-by-Day Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.records.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No working days found for this period.
                  </p>
                ) : (
                  <div className="space-y-1">
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
                          data-testid={`day-${rec.date}`}
                        >
                          <div className="flex items-center gap-3">
                            {present ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive shrink-0" />
                            )}
                            <span className="text-sm text-foreground">{label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {present && rec.time && (
                              <span className="text-xs text-muted-foreground">{rec.time}</span>
                            )}
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                present
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              }`}
                            >
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
          </>
        ) : (
          <Card className="border-card-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              No report data available.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
