import { useEffect } from "react";
import { useLocation } from "wouter";
import { Users, UserCheck, UserX, BarChart2, BookOpen } from "lucide-react";
import {
  useGetProfile,
  useGetAdminStats,
  getGetProfileQueryKey,
  getGetAdminStatsQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getToken } from "@/lib/auth";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), enabled: !!getToken() },
  });

  const { data: stats, isLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey(), enabled: !!getToken() },
  });

  useEffect(() => {
    if (!getToken()) {
      setLocation("/login");
      return;
    }
    if (profile && profile.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [profile, setLocation]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Admin Overview</h2>
          <p className="text-muted-foreground mt-1">{today}</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-3" />
                  <div className="h-8 bg-muted rounded w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Main stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="border-card-border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Students</p>
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-3xl font-bold" data-testid="stat-total-students">{stats.totalStudents}</p>
                </CardContent>
              </Card>
              <Card className="border-card-border shadow-sm border-t-4 border-t-green-500">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Present Today</p>
                    <UserCheck className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="stat-present-today">{stats.presentToday}</p>
                </CardContent>
              </Card>
              <Card className="border-card-border shadow-sm border-t-4 border-t-destructive">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Absent Today</p>
                    <UserX className="w-4 h-4 text-destructive" />
                  </div>
                  <p className="text-3xl font-bold text-destructive" data-testid="stat-absent-today">{stats.absentToday}</p>
                </CardContent>
              </Card>
            </div>

            {/* Today's attendance rate */}
            {stats.totalStudents > 0 && (
              <Card className="border-card-border shadow-sm mb-6">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Today's Attendance Rate</p>
                    <p className="text-sm font-bold text-primary">
                      {Math.round((stats.presentToday / stats.totalStudents) * 100)}%
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-primary transition-all"
                      style={{ width: `${(stats.presentToday / stats.totalStudents) * 100}%` }}
                      data-testid="progress-attendance-rate"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Breakdown grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Branch */}
              <Card className="border-card-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    By Branch
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.branchBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.branchBreakdown.map((b) => (
                        <div key={b.branch} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{b.branch}</span>
                          <span className="text-sm text-muted-foreground font-mono">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Year */}
              <Card className="border-card-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    By Year
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.yearBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.yearBreakdown.map((y) => (
                        <div key={y.year} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{y.year} Year</span>
                          <span className="text-sm text-muted-foreground font-mono">{y.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Interest */}
              <Card className="border-card-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    By Interest Area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.interestBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.interestBreakdown.map((item) => (
                        <div key={item.interestArea} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.interestArea}</span>
                          <span className="text-sm text-muted-foreground font-mono">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="border-card-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              Failed to load stats.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
