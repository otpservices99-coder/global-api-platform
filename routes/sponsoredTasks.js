const express = require("express");

const router =
    express.Router();

const protect =
    require("../middleware/auth");

const project =
    require("../middleware/project");

const upload =
    require("../middleware/upload");

const {
    getTasks,
    getTask,
    submitTask,
    getHistory
} =
    require("../controllers/sponsoredTaskController");


// ============================================================
// GET AVAILABLE TASKS
// ============================================================

router.get(
    "/",
    protect,
    project,
    getTasks
);


// ============================================================
// GET HISTORY
// ============================================================

router.get(
    "/history",
    protect,
    project,
    getHistory
);


// ============================================================
// GET TASK
// ============================================================

router.get(
    "/:id",
    protect,
    project,
    getTask
);


// ============================================================
// SUBMIT PROOF
//
// Accepts:
//
// multipart/form-data:
//   proof=<file>
//
// Also accepts:
//   file=<file>
//   image=<file>
//   proofFile=<file>
//
// JSON URL submission remains supported.
//
// Multer keeps the file in memory, then the controller sends
// the buffer through the global fileUploadService.
// ============================================================

router.post(
    "/:id/submit",
    protect,
    project,

    upload.fields([
        {
            name: "proof",
            maxCount: 1
        },
        {
            name: "file",
            maxCount: 1
        },
        {
            name: "image",
            maxCount: 1
        },
        {
            name: "proofFile",
            maxCount: 1
        }
    ]),

    (req, res, next) => {
        try {
            const fields =
                req.files || {};

            const file =
                fields.proof?.[0] ||
                fields.file?.[0] ||
                fields.image?.[0] ||
                fields.proofFile?.[0] ||
                null;

            req.file = file;

            return next();

        } catch (error) {
            return next(error);
        }
    },

    submitTask
);


module.exports = router;
