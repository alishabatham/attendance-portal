import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { MapPin, Navigation, Save, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getToken } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LocationSettings {
  lat: number | null;
  lng: number | null;
  radiusM: number;
  enforcement: boolean;
  configured: boolean;
}

export default function AdminSettings() {
  const [, setLocation] = useLocation();

  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusM, setRadiusM] = useState("100");
  const [enforcement, setEnforcement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setLocation("/login");
      return;
    }
    fetch(`${BASE}/api/admin/location-settings`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data: LocationSettings) => {
        setSettings(data);
        if (data.lat !== null) setLat(String(data.lat));
        if (data.lng !== null) setLng(String(data.lng));
        setRadiusM(String(data.radiusM));
        setEnforcement(data.enforcement);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [setLocation]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        toast.success("Current location captured");
        setLocating(false);
      },
      (err) => {
        toast.error(`Location error: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSave = useCallback(async () => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseInt(radiusM, 10);

    if (enforcement) {
      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        toast.error("Please enter valid latitude and longitude before enabling enforcement");
        return;
      }
    }
    if (isNaN(parsedRadius) || parsedRadius < 10) {
      toast.error("Radius must be at least 10 meters");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = { radiusM: parsedRadius, enforcement };
      if (!isNaN(parsedLat)) body.lat = parsedLat;
      if (!isNaN(parsedLng)) body.lng = parsedLng;

      const res = await fetch(`${BASE}/api/admin/location-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json() as LocationSettings;
      if (!res.ok) throw new Error((data as unknown as { error: string }).error ?? "Save failed");
      setSettings(data);
      toast.success("Location settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [lat, lng, radiusM, enforcement]);

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground mt-1">Configure attendance rules and location enforcement</p>
        </div>

        {/* Status banner */}
        {settings && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-6 text-sm ${
            settings.enforcement && settings.configured
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            {settings.enforcement && settings.configured ? (
              <><CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Location enforcement is <strong>active</strong> — students must be within {settings.radiusM}m to mark attendance.</span></>
            ) : (
              <><AlertCircle className="w-4 h-4 shrink-0" />
                <span>Location enforcement is <strong>off</strong> — students can mark attendance from anywhere.</span></>
            )}
          </div>
        )}

        <Card className="border-card-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Location-Based Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
              </div>
            ) : (
              <>
                {/* Coordinates */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Allowed Location (College / Campus)</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUseMyLocation}
                      disabled={locating}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {locating ? (
                        <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <Navigation className="w-3 h-3" />
                      )}
                      {locating ? "Detecting..." : "Use My Location"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="lat" className="text-xs">Latitude</Label>
                      <Input
                        id="lat"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        placeholder="e.g. 28.6139"
                        data-testid="input-lat"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lng" className="text-xs">Longitude</Label>
                      <Input
                        id="lng"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        placeholder="e.g. 77.2090"
                        data-testid="input-lng"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click "Use My Location" while you're on campus to auto-fill coordinates, or enter them manually from Google Maps.
                  </p>
                </div>

                {/* Radius */}
                <div className="space-y-1.5">
                  <Label htmlFor="radius" className="text-sm font-medium">Allowed Radius (meters)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="radius"
                      type="number"
                      min="10"
                      max="5000"
                      value={radiusM}
                      onChange={(e) => setRadiusM(e.target.value)}
                      className="w-36"
                      data-testid="input-radius"
                    />
                    <p className="text-sm text-muted-foreground">
                      Students within <strong>{radiusM}m</strong> of the campus can mark attendance
                    </p>
                  </div>
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <div>
                    <p className="text-sm font-medium">Enable Location Enforcement</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When on, attendance can only be marked from the allowed location
                    </p>
                  </div>
                  <button
                    onClick={() => setEnforcement(!enforcement)}
                    className="flex items-center gap-2"
                    data-testid="toggle-enforcement"
                  >
                    {enforcement ? (
                      <ToggleRight className="w-10 h-10 text-primary" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-muted-foreground" />
                    )}
                  </button>
                </div>

                {enforcement && !lat && !lng && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Set a location above before enabling enforcement
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center gap-2"
                  data-testid="button-save-settings"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
