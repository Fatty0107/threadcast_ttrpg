import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import charactersRouter from "./characters";
import homebrewRouter from "./homebrew";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/characters", charactersRouter);
router.use("/homebrew", homebrewRouter);

export default router;
