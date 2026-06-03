import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import almRouter from "./alm";
import portfolioRouter from "./portfolio";
import riskRouter from "./risk";
import esgRouter from "./esg";
import optimizationRouter from "./optimization";
import catastropheRouter from "./catastrophe";
import solvencyRouter from "./solvency";
import scenarioRouter from "./scenario";
import assistantRouter from "./assistant";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(almRouter);
router.use(portfolioRouter);
router.use(riskRouter);
router.use(esgRouter);
router.use(optimizationRouter);
router.use(catastropheRouter);
router.use(solvencyRouter);
router.use(scenarioRouter);
router.use(assistantRouter);

export default router;
