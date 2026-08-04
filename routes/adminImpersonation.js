const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const project = require("../middleware/project");

const {
    loginAsUser
} = require("../controllers/adminImpersonationController");

router.post(
    "/:id",
    project,
    protect,
    admin,
    loginAsUser
);

module.exports = router;
