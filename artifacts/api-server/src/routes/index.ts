import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import charactersRouter from "./characters";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/characters", charactersRouter);

export default router;
