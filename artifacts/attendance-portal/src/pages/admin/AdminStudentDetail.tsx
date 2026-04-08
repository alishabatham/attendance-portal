import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle, Calendar } from "lucide-react";
import {
  useGetStudent,
  useGetAttendanceHistory,
  useGetAttendanceReport,
  getGetStudentQueryKey,
  getGetAttendanceHistoryQueryKey,
  getGetAttendanceReportQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/auth";

export default function AdminStudentDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);

  const { data: student, isLoading } = useGetStudent(userId, {
    query: { queryKey: getGetStudentQueryKey(userId), enabled: !!getToken() && !!userId },
  });

  const { data: history } = useGetAttendanceHistory(userId, {
    query: { queryKey: getGetAttendanceHistoryQueryKey(userId), enabled: !!getToken() && !!userId },
  });

  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const { data: report } = useGetAttendanceReport(userId, { month, year }, {
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
          data-testid="button-back"
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
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-student-name">
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
              <CardTitle className="text-base font-semibold">
                Attendance — {today.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report ? (
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

        {/* Full history */}
        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Full Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No attendance records yet.</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {[...history].reverse().map((rec) => {
                  const date = new Date(rec.date + "T00:00:00");
                  const label = date.toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`attendance-${rec.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-sm">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{rec.time}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
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
