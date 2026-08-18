const express = require("express");

const router = express.Router();

const controller = require("../controllers/resourceController");

// ============================================================
// RESOURCE COLLECTION
// ============================================================

// List all resources belonging to the current project
router.get(
    "/",
    controller.listResources
);

// Get the schema for a resource
// IMPORTANT: this must come BEFORE /:resource/:id
router.get(
    "/:resource/schema",
    controller.getSchema
);

// Create a record
router.post(
    "/:resource",
    controller.create
);

// List records
router.get(
    "/:resource",
    controller.find
);

// Get one record
router.get(
    "/:resource/:id",
    controller.findOne
);

// Update one record
router.patch(
    "/:resource/:id",
    controller.update
);

// Delete one record
router.delete(
    "/:resource/:id",
    controller.remove
);

module.exports = router;
