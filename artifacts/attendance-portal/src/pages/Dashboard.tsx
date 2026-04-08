import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { CheckCircle2, Clock, Calendar, BookOpen, TrendingUp, AlertCircle } from "lucide-react";
import {
  useGetProfile,
  useGetTodayAttendance,
  useMarkAttendance,
  useGetAttendanceReport,
  getGetProfileQueryKey,
  getGetTodayAttendanceQueryKey,
  getGetAttendanceReportQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getToken } from "@/lib/auth";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), enabled: !!getToken() },
  });

  const { data: todayData, isLoading: todayLoading } = useGetTodayAttendance({
    query: { queryKey: getGetTodayAttendanceQueryKey(), enabled: !!getToken() },
  });

  const userId = profile?.id;
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const { data: report } = useGetAttendanceReport(userId ?? 0, { month, year }, {
    query: {
      queryKey: getGetAttendanceReportQueryKey(userId ?? 0, { month, year }),
      enabled: !!userId,
    },
  });

  const markAttendance = useMarkAttendance();

  useEffect(() => {
    if (!getToken()) {
      setLocation("/login");
    }
  }, [setLocation]);

  useEffect(() => {
    if (profile && !profile.profileCompleted) {
      setLocation("/onboarding");
    }
    if (profile && profile.role === "admin") {
      setLocation("/admin");
    }
  }, [profile, setLocation]);

  function handleMarkAttendance() {
    markAttendance.mutate(
      {},
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAttendanceReportQueryKey(userId ?? 0, { month, year }) });
          toast.success("Attendance marked! Have a great day.");
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string }; message?: string; status?: number };
          if (e?.status === 409) {
            toast.info("Attendance already marked for today");
          } else {
            toast.error(e?.data?.error ?? e?.message ?? "Failed to mark attendance");
          }
        },
      }
    );
  }

  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = today.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const alreadyMarked = todayData?.marked ?? false;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.fullName ?? profile?.name ?? "Student"}
          </h2>
          <p className="text-muted-foreground mt-1">{profile?.collegeName} &bull; {profile?.branch} &bull; {profile?.year} Year</p>
        </div>

        {/* Attendance card */}
        <Card className="mb-6 border-card-border shadow-sm overflow-hidden">
          <div className={`h-1 w-full ${alreadyMarked ? "bg-green-500" : "bg-primary"}`} />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="text-date">{dateStr}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="w-4 h-4" />
                  <span data-testid="text-time">{timeStr}</span>
                </div>

                {alreadyMarked && todayData?.record && (
                  <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium" data-testid="text-attendance-status">
                      Attendance marked at {todayData.record.time}
                    </span>
                  </div>
                )}

                {!alreadyMarked && !todayLoading && (
                  <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm" data-testid="text-attendance-status">
                      Attendance not yet marked for today
                    </span>
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="min-w-[180px]"
                disabled={alreadyMarked || todayLoading || markAttendance.isPending || profileLoading}
                onClick={handleMarkAttendance}
                data-testid="button-mark-attendance"
              >
                {markAttendance.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Marking...
                  </span>
                ) : alreadyMarked ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Attendance Marked
                  </span>
                ) : (
                  "Mark Today's Attendance"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Working Days</p>
              <p className="text-2xl font-bold mt-1" data-testid="stat-working-days">{report?.totalWorkingDays ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Present</p>
              <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400" data-testid="stat-present">{report?.presentDays ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Absent</p>
              <p className="text-2xl font-bold mt-1 text-destructive" data-testid="stat-absent">{report?.absentDays ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Attendance %</p>
              <p className="text-2xl font-bold mt-1 text-primary" data-testid="stat-percentage">
                {report ? `${report.attendancePercentage}%` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profile summary */}
        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Academic Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: "Branch", value: profile?.branch },
                { label: "Section", value: profile?.section },
                { label: "Year", value: profile?.year },
                { label: "Semester", value: profile?.semester },
                { label: "Subject", value: profile?.subject },
                { label: "Interest", value: profile?.interestArea === "Other" ? profile?.interestAreaCustom : profile?.interestArea },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{item.label}</p>
                  <p className="font-medium" data-testid={`profile-${item.label.toLowerCase()}`}>{item.value ?? "—"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly progress bar */}
        {report && (
          <Card className="border-card-border shadow-sm mt-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Monthly Attendance — {today.toLocaleString("en-US", { month: "long", year: "numeric" })}</span>
                </div>
                <span className="text-sm font-bold text-primary">{report.attendancePercentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${report.attendancePercentage >= 75 ? "bg-green-500" : report.attendancePercentage >= 50 ? "bg-yellow-500" : "bg-destructive"}`}
                  style={{ width: `${report.attendancePercentage}%` }}
                  data-testid="progress-attendance"
                />
              </div>
              {report.attendancePercentage < 75 && (
                <p className="text-xs text-destructive mt-1.5">
                  Attendance below 75% — {75 - report.attendancePercentage > 0 ? `Need ${Math.ceil(((0.75 * report.totalWorkingDays) - report.presentDays))} more present days` : ""}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
