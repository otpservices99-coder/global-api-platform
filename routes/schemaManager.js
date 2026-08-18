const express = require("express");

const router = express.Router();

const project = require("../middleware/project");
const controller = require("../controllers/schemaManagerController");

router.use(project);

// Create
router.post("/", controller.create);

// List
router.get("/", controller.list);

// Get one
router.get("/:id", controller.getOne);

// Update
router.put("/:id", controller.update);
router.patch("/:id", controller.update);

// Delete
router.delete("/:id", controller.remove);

module.exports = router;
