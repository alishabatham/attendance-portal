import { Router, type IRouter } from "express";
import { Setting } from "../models/index.js";
import { authenticate, requireAdmin, type AuthenticatedRequest } from "../middlewares/authenticate.js";

const router: IRouter = Router();

async function getSetting(key: string): Promise<string | null> {
  const row = await Setting.findOne({ key });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await Setting.findOneAndUpdate({ key }, { value }, { upsert: true });
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
