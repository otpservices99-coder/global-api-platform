const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const project = require("../middleware/project");

const {
    getNotifications,
    markRead,
    markAllRead
} = require("../controllers/notificationController");

router.get(
    "/",
    project,
    protect,
    getNotifications
);

router.put(
    "/:id/read",
    project,
    protect,
    markRead
);

router.patch(
    "/:id/read",
    project,
    protect,
    markRead
);

router.post(
    "/read-all",
    project,
    protect,
    markAllRead
);

module.exports = router;
