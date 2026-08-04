const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");


const {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    createApiKey,
    revokeApiKey,
    deleteProject
} = require("../controllers/projectController");



/*
CREATE PROJECT
*/
router.post(
    "/",
    protect,
    admin,
    createProject
);



/*
GET ALL PROJECTS
*/
router.get(
    "/",
    protect,
    admin,
    getProjects
);



/*
GET PROJECT BY ID
*/
router.get(
    "/:id",
    protect,
    admin,
    validateObjectId("id"),
    getProjectById
);



/*
UPDATE PROJECT
*/
router.put(
    "/:id",
    protect,
    admin,
    validateObjectId("id"),
    updateProject
);



/*
CREATE API KEY
*/
router.post(
    "/:id/api-key",
    protect,
    admin,
    validateObjectId("id"),
    createApiKey
);



/*
REVOKE API KEY
*/
router.patch(
    "/:id/api-key/:keyId/revoke",
    protect,
    admin,
    validateObjectId("id"),
    revokeApiKey
);



/*
DELETE PROJECT
*/
router.delete(
    "/:id",
    protect,
    admin,
    validateObjectId("id"),
    deleteProject
);



module.exports = router;
