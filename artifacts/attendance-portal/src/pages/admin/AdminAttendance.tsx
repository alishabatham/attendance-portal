import { useState } from "react";
import { useLocation } from "wouter";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import {
  useGetAdminAttendanceByDate,
  getGetAdminAttendanceByDateQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/auth";

export default function AdminAttendance() {
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().split("T")[0] as string;
  const [date, setDate] = useState(today);

  const params = { date };

  const { data: records, isLoading } = useGetAdminAttendanceByDate(params, {
    query: { queryKey: getGetAdminAttendanceByDateQueryKey(params), enabled: !!getToken() },
  });

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Attendance by Date</h2>
          <p className="text-muted-foreground mt-1">View who was present on any day</p>
        </div>

        {/* Date picker */}
        <Card className="border-card-border shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="date-picker" className="text-sm font-medium mb-1 block">Select Date</Label>
                <Input
                  id="date-picker"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={today}
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

        {/* Records */}
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
                    data-testid={`attendance-row-${rec.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-student-name-${rec.id}`}>
                          {rec.studentName ?? "—"}
                        </p>
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
