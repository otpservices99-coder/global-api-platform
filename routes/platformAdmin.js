const express = require("express");

const router = express.Router();


const protect =
require("../middleware/auth");


const platformAdmin =
require("../middleware/platformAdmin");


const controller =
require("../controllers/platformController");




// All routes here require platform super admin

router.use(
protect,
platformAdmin
);





// Platform statistics

router.get(
"/overview",
controller.overview
);





// All projects

router.get(
"/projects",
controller.getAllProjects
);





// Single project

router.get(
"/projects/:id",
controller.getProject
);





// Disable project

router.patch(
"/projects/:id/disable",
controller.disableProject
);





// Enable project

router.patch(
"/projects/:id/enable",
controller.enableProject
);





// Update project

router.put(
"/projects/:id",
controller.updateProject
);





// Rotate API key

router.post(
"/projects/:id/rotate-key",
controller.rotateApiKey
);





module.exports = router;
