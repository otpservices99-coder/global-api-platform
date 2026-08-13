const express = require("express");

const router =
    express.Router();


const project =
    require("../middleware/project");


const controller =
    require("../controllers/resourceManagerController");


// ============================================================
// PROJECT API KEY REQUIRED
// ============================================================

router.use(project);


// ============================================================
// CREATE RESOURCE
// POST /api/v1/resource-manager
// ============================================================

router.post(
    "/",
    controller.create
);


// ============================================================
// LIST RESOURCES
// GET /api/v1/resource-manager
// ============================================================

router.get(
    "/",
    controller.list
);


// ============================================================
// GET SINGLE RESOURCE
// GET /api/v1/resource-manager/:id
// ============================================================

router.get(
    "/:id",
    controller.getOne
);


// ============================================================
// UPDATE RESOURCE
// PUT /api/v1/resource-manager/:id
// ============================================================

router.put(
    "/:id",
    controller.update
);


// ============================================================
// DELETE RESOURCE
// DELETE /api/v1/resource-manager/:id
// ============================================================

router.delete(
    "/:id",
    controller.remove
);


module.exports =
    router;
