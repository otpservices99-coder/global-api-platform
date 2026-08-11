const express = require("express");

const router = express.Router();

const Notification = require("../models/Notification");
const protect = require("../middleware/auth");
const admin = require("../middleware/admin");


// ============================================================
// GET ALL ADMIN NOTIFICATIONS
// GET /api/v1/admin/notifications
// ============================================================

router.get(
    "/",
    protect,
    admin,
    async (req, res) => {

        try {

            const {
                page = 1,
                limit = 20,
                read,
                type,
                user
            } = req.query;


            const pageNumber = Math.max(
                Number(page) || 1,
                1
            );


            const limitNumber = Math.min(
                Math.max(Number(limit) || 20, 1),
                100
            );


            const query = {
                project: req.project._id
            };


            if (read !== undefined) {

                if (read === "true") {
                    query.read = true;
                }

                if (read === "false") {
                    query.read = false;
                }

            }


            if (type) {
                query.type = type;
            }


            if (user) {
                query.user = user;
            }


            const total =
                await Notification.countDocuments(query);


            const notifications =
                await Notification.find(query)
                    .populate(
                        "user",
                        "username email"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .skip(
                        (pageNumber - 1) * limitNumber
                    )
                    .limit(limitNumber);


            const unread =
                await Notification.countDocuments({
                    project: req.project._id,
                    read: false
                });


            return res.json({

                success: true,

                total,

                unread,

                page: pageNumber,

                limit: limitNumber,

                pages: Math.ceil(
                    total / limitNumber
                ),

                data: notifications

            });


        } catch (error) {

            console.error(
                "Admin notifications error:",
                error
            );


            return res.status(500).json({

                success: false,

                message: error.message

            });

        }

    }
);


// ============================================================
// GET NOTIFICATIONS FOR ONE USER
// GET /api/v1/admin/notifications/users/:userId
// ============================================================

router.get(
    "/users/:userId",
    protect,
    admin,
    async (req, res) => {

        try {

            const {
                page = 1,
                limit = 20
            } = req.query;


            const pageNumber = Math.max(
                Number(page) || 1,
                1
            );


            const limitNumber = Math.min(
                Math.max(Number(limit) || 20, 1),
                100
            );


            const query = {

                project: req.project._id,

                user: req.params.userId

            };


            const total =
                await Notification.countDocuments(query);


            const notifications =
                await Notification.find(query)
                    .populate(
                        "user",
                        "username email"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .skip(
                        (pageNumber - 1) * limitNumber
                    )
                    .limit(limitNumber);


            return res.json({

                success: true,

                total,

                page: pageNumber,

                limit: limitNumber,

                pages: Math.ceil(
                    total / limitNumber
                ),

                data: notifications

            });


        } catch (error) {

            console.error(
                "Admin user notifications error:",
                error
            );


            return res.status(500).json({

                success: false,

                message: error.message

            });

        }

    }
);


// ============================================================
// GET UNREAD NOTIFICATION COUNT
// GET /api/v1/admin/notifications/unread/count
// ============================================================

router.get(
    "/unread/count",
    protect,
    admin,
    async (req, res) => {

        try {

            const count =
                await Notification.countDocuments({

                    project: req.project._id,

                    read: false

                });


            return res.json({

                success: true,

                count

            });


        } catch (error) {

            console.error(
                "Unread notification count error:",
                error
            );


            return res.status(500).json({

                success: false,

                message: error.message

            });

        }

    }
);


module.exports = router;
