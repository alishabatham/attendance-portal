import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { CheckCircle2, Clock, Calendar, BookOpen, TrendingUp, AlertCircle, MapPin } from "lucide-react";
import {
  useGetProfile,
  useGetTodayAttendance,
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

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [locationEnforced, setLocationEnforced] = useState(false);
  const [locationRadius, setLocationRadius] = useState(100);
  const [markingAttendance, setMarkingAttendance] = useState(false);

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

  useEffect(() => {
    if (!getToken()) {
      setLocation("/login");
      return;
    }
    // Check location enforcement status
    fetch(`${BASE}/api/location-check`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { enforcementEnabled: boolean; radiusM: number } | null) => {
        if (data) {
          setLocationEnforced(data.enforcementEnabled);
          setLocationRadius(data.radiusM);
        }
      })
      .catch(() => { /* silently fail, enforcement defaults to off */ });
  }, [setLocation]);

  useEffect(() => {
    if (profile && !profile.profileCompleted) setLocation("/onboarding");
    if (profile && profile.role === "admin") setLocation("/admin");
  }, [profile, setLocation]);

  const getGeolocation = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(new Error("Location permission denied. Please allow location access in your browser settings."));
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            reject(new Error("Location unavailable. Please check your device's location settings."));
          } else {
            reject(new Error("Could not get your location. Please try again."));
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const handleMarkAttendance = useCallback(async () => {
    setMarkingAttendance(true);
    try {
      let coords: { latitude: number; longitude: number } | undefined;

      if (locationEnforced) {
        toast.info("Getting your location...", { duration: 2000 });
        try {
          coords = await getGeolocation();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Location error");
          setMarkingAttendance(false);
          return;
        }
      }

      const body = coords ?? {};
      const res = await fetch(`${BASE}/api/attendance/mark`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json() as {
        error?: string;
        code?: string;
        message?: string;
        distanceM?: number;
        allowedRadiusM?: number;
      };

      if (!res.ok) {
        if (res.status === 409) {
          toast.info("Attendance already marked for today");
        } else if (data.code === "OUT_OF_RANGE") {
          toast.error(data.message ?? `You are too far from campus (${data.distanceM}m away, limit: ${data.allowedRadiusM}m)`);
        } else if (data.code === "LOCATION_REQUIRED") {
          toast.error("Location is required to mark attendance. Please allow location access.");
        } else {
          toast.error(data.error ?? data.message ?? "Failed to mark attendance");
        }
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAttendanceReportQueryKey(userId ?? 0, { month, year }) }),
      ]);
      toast.success("Attendance marked! Have a great day.");
    } catch {
      toast.error("Failed to mark attendance. Please try again.");
    } finally {
      setMarkingAttendance(false);
    }
  }, [locationEnforced, getGeolocation, queryClient, userId, month, year]);

  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = today.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const alreadyMarked = todayData?.marked ?? false;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
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
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{timeStr}</span>
                </div>

                {alreadyMarked && todayData?.record && (
                  <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Attendance marked at {todayData.record.time}
                    </span>
                  </div>
                )}

                {!alreadyMarked && !todayLoading && (
                  <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">Attendance not yet marked for today</span>
                  </div>
                )}

                {locationEnforced && !alreadyMarked && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-primary/70">
                    <MapPin className="w-3 h-3" />
                    <span>Location verification required (within {locationRadius}m of campus)</span>
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="min-w-[200px]"
                disabled={alreadyMarked || todayLoading || markingAttendance || profileLoading}
                onClick={handleMarkAttendance}
                data-testid="button-mark-attendance"
              >
                {markingAttendance ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {locationEnforced ? "Verifying location..." : "Marking..."}
                  </span>
                ) : alreadyMarked ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Attendance Marked
                  </span>
                ) : locationEnforced ? (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Mark Attendance
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
              <p className="text-2xl font-bold mt-1">{report?.totalWorkingDays ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Present</p>
              <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{report?.presentDays ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Absent</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{report?.absentDays ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Attendance %</p>
              <p className="text-2xl font-bold mt-1 text-primary">
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
                  <p className="font-medium">{item.value ?? "—"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly progress */}
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
                />
              </div>
              {report.attendancePercentage < 75 && (
                <p className="text-xs text-destructive mt-1.5">
                  Below 75% — need {Math.max(0, Math.ceil(0.75 * report.totalWorkingDays - report.presentDays))} more present days
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
