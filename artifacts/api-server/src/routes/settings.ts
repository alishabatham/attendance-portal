import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthenticatedRequest } from "../middlewares/authenticate.js";

const router: IRouter = Router();

const LOCATION_KEYS = ["lat", "lng", "radius_m", "enforcement"] as const;

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}

export async function getLocationSettings() {
  const [lat, lng, radius, enforcement] = await Promise.all([
    getSetting("allowed_lat"),
    getSetting("allowed_lng"),
    getSetting("allowed_radius_m"),
    getSetting("location_enforcement"),
  ]);
  return {
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    radiusM: radius ? parseInt(radius, 10) : 100,
    enforcement: enforcement === "on",
    configured: lat !== null && lng !== null,
  };
}

// Public: students need to know if location enforcement is on (but not the coords)
router.get("/location-check", authenticate, async (_req, res): Promise<void> => {
  const settings = await getLocationSettings();
  res.json({
    enforcementEnabled: settings.enforcement && settings.configured,
    radiusM: settings.radiusM,
  });
});

router.get(
  "/admin/location-settings",
  authenticate,
  requireAdmin,
  async (_req: AuthenticatedRequest, res): Promise<void> => {
    const settings = await getLocationSettings();
    res.json(settings);
  }
);

router.post(
  "/admin/location-settings",
  authenticate,
  requireAdmin,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const { lat, lng, radiusM, enforcement } = req.body as {
      lat?: number;
      lng?: number;
      radiusM?: number;
      enforcement?: boolean;
    };

    if (lat !== undefined) await setSetting("allowed_lat", String(lat));
    if (lng !== undefined) await setSetting("allowed_lng", String(lng));
    if (radiusM !== undefined) await setSetting("allowed_radius_m", String(radiusM));
    if (enforcement !== undefined) await setSetting("location_enforcement", enforcement ? "on" : "off");

    const updated = await getLocationSettings();
    res.json(updated);
  }
);

export default router;
