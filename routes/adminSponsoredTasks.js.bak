const express = require("express");

const router = express.Router();

const protect =
    require("../middleware/auth");

const admin =
    require("../middleware/admin");

const project =
    require("../middleware/project");

const {
    createTask,
    adminListTasks,
    updateTask,
    adminSubmissions,
    approveSubmission,
    rejectSubmission
} =
    require(
        "../controllers/sponsoredTaskController"
    );

router.get(
    "/",
    protect,
    project,
    admin,
    adminListTasks
);

router.post(
    "/",
    protect,
    project,
    admin,
    createTask
);

router.patch(
    "/:id",
    protect,
    project,
    admin,
    updateTask
);

router.get(
    "/submissions/list",
    protect,
    project,
    admin,
    adminSubmissions
);

router.post(
    "/submissions/:id/approve",
    protect,
    project,
    admin,
    approveSubmission
);

router.post(
    "/submissions/:id/reject",
    protect,
    project,
    admin,
    rejectSubmission
);

module.exports = router;
