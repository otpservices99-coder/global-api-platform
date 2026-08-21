const express = require("express");

const router = express.Router();

const protect =
    require("../middleware/auth");

const project =
    require("../middleware/project");

const {
    getTasks,
    getTask,
    submitTask,
    getHistory
} =
    require("../controllers/sponsoredTaskController");

router.get(
    "/",
    protect,
    project,
    getTasks
);

router.get(
    "/history",
    protect,
    project,
    getHistory
);

router.get(
    "/:id",
    protect,
    project,
    getTask
);

router.post(
    "/:id/submit",
    protect,
    project,
    submitTask
);

module.exports = router;
