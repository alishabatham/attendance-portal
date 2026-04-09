import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userRouter from "./user";
import attendanceRouter from "./attendance";
import adminRouter from "./admin";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userRouter);
router.use(attendanceRouter);
router.use(adminRouter);
router.use(settingsRouter);

export default router;
