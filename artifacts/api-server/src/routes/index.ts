import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import charactersRouter from "./characters";
import homebrewRouter from "./homebrew";
import diceRouter from "./dice";
import rollsRouter from "./rolls";
import castsRouter from "./casts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/characters", charactersRouter);
router.use("/homebrew", homebrewRouter);
router.use(diceRouter);
router.use(rollsRouter);
router.use(castsRouter);

export default router;
