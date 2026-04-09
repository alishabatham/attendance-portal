import { useCallback, useState } from "react";
import { CalendarCheck, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import {
  useGetAdminAttendanceByDate,
  getGetAdminAttendanceByDateQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getToken } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AdminAttendance() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0] as string;

  const [date, setDate] = useState(todayStr);
  const [reportMonth, setReportMonth] = useState(today.getMonth() + 1);
  const [reportYear, setReportYear] = useState(today.getFullYear());
  const [downloading, setDownloading] = useState(false);

  const years = [today.getFullYear() - 1, today.getFullYear()];

  const params = { date };
  const { data: records, isLoading } = useGetAdminAttendanceByDate(params, {
    query: { queryKey: getGetAdminAttendanceByDateQueryKey(params), enabled: !!getToken() },
  });

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const handleDownloadMonthlyReport = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `${BASE}/api/admin/monthly-report?month=${reportMonth}&year=${reportYear}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch monthly report");

      const data = await res.json() as {
        month: number;
        year: number;
        workingDays: string[];
        students: {
          name: string;
          email: string;
          branch: string;
          year: string;
          section: string;
          portalJoinDate: string;
          joiningDate: string | null;
          totalWorkingDays: number;
          presentDays: number;
          absentDays: number;
          percentage: number;
          dayStatus: Record<string, string>;
        }[];
      };

      const { utils, writeFile } = await import("xlsx");
      const wb = utils.book_new();

      const monthName = MONTHS[data.month - 1] ?? "";

      // Build header row
      // Fixed columns
      const fixedHeaders = ["Student Name", "Email", "Branch", "Year", "Section", "Portal Joined", "Academic Join Date"];
      // Date columns: format as "01-Apr\nTue"
      const dayHeaders = data.workingDays.map((d) => {
        const dt = new Date(d + "T00:00:00");
        const day = String(dt.getDate()).padStart(2, "0");
        const mon = dt.toLocaleDateString("en-US", { month: "short" });
        const wd = dt.toLocaleDateString("en-US", { weekday: "short" });
        return `${day}-${mon}\n${wd}`;
      });
      // Summary columns
      const summaryHeaders = ["Working Days", "Present", "Absent", "Attendance %"];

      const headerRow = [...fixedHeaders, ...dayHeaders, ...summaryHeaders];

      // Build data rows
      const dataRows = data.students.map((s) => {
        const fixed = [
          s.name,
          s.email,
          s.branch || "—",
          s.year || "—",
          s.section || "—",
          s.portalJoinDate,
          s.joiningDate ?? "—",
        ];
        const days = data.workingDays.map((d) => s.dayStatus[d] ?? "—");
        const summary = [s.totalWorkingDays, s.presentDays, s.absentDays, `${s.percentage}%`];
        return [...fixed, ...days, ...summary];
      });

      const sheetData = [headerRow, ...dataRows];
      const ws = utils.aoa_to_sheet(sheetData);

      // Column widths
      const cols = [
        { wch: 22 }, // Name
        { wch: 26 }, // Email
        { wch: 8 },  // Branch
        { wch: 6 },  // Year
        { wch: 8 },  // Section
        { wch: 13 }, // Portal Joined
        { wch: 14 }, // Academic Join
        ...data.workingDays.map(() => ({ wch: 7 })),
        { wch: 13 }, // Working Days
        { wch: 9 },  // Present
        { wch: 9 },  // Absent
        { wch: 13 }, // Attendance %
      ];
      ws["!cols"] = cols;

      // Style the header row (freeze top row)
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };

      utils.book_append_sheet(wb, ws, `${monthName} ${data.year}`);
      writeFile(wb, `Monthly_Attendance_${monthName}_${data.year}.xlsx`);
      toast.success(`Downloaded attendance report for ${monthName} ${data.year}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [reportMonth, reportYear]);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
          <p className="text-muted-foreground mt-1">View daily attendance or download the full monthly report</p>
        </div>

        {/* Monthly Report Download */}
        <Card className="border-card-border shadow-sm mb-6 bg-primary/[0.03]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              Monthly Attendance Report — All Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download an Excel file with all students as rows and each working day as a column (P = Present, A = Absent, — = Not joined yet).
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs mb-1 block">Month</Label>
                <Select value={String(reportMonth)} onValueChange={(v) => setReportMonth(Number(v))}>
                  <SelectTrigger className="w-36" data-testid="select-report-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Year</Label>
                <Select value={String(reportYear)} onValueChange={(v) => setReportYear(Number(v))}>
                  <SelectTrigger className="w-24" data-testid="select-report-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleDownloadMonthlyReport}
                disabled={downloading}
                className="flex items-center gap-2"
                data-testid="button-download-monthly"
              >
                {downloading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Preparing...
                  </span>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Excel
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daily attendance view */}
        <Card className="border-card-border shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="date-picker" className="text-sm font-medium mb-1 block">View by Date</Label>
                <Input
                  id="date-picker"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayStr}
                  className="w-48"
                  data-testid="input-date"
                />
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-foreground">{dateLabel}</p>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : `${records?.length ?? 0} student${records?.length !== 1 ? "s" : ""} present`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              Present Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : records && records.length > 0 ? (
              <div className="space-y-1">
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{rec.studentName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{rec.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rec.branch && <Badge variant="secondary" className="text-xs">{rec.branch}</Badge>}
                      {rec.year && <Badge variant="outline" className="text-xs">{rec.year}</Badge>}
                      <span className="text-xs text-muted-foreground font-mono">{rec.time}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        {rec.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No attendance records for this date.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
