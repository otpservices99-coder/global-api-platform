const Notification =
    require("../models/Notification");


// ============================================================
// GET USER NOTIFICATIONS
// ============================================================

const getNotifications =
    async (req, res) => {

        try {

            const projectId =
                req.project?._id ||
                req.projectId;

            const userId =
                req.user?._id ||
                req.user?.id;


            if (
                !projectId ||
                !userId
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Project and user are required"

                });

            }


            const notifications =
                await Notification.find({

                    project:
                        projectId,

                    user:
                        userId

                })
                .sort({
                    createdAt: -1
                });


            return res.json({

                success: true,

                data:
                    notifications

            });


        } catch (error) {

            console.error(
                "GET NOTIFICATIONS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

const markRead =
    async (req, res) => {

        try {

            const projectId =
                req.project?._id ||
                req.projectId;

            const userId =
                req.user?._id ||
                req.user?.id;


            if (
                !projectId ||
                !userId
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Project and user are required"

                });

            }


            const notification =
                await Notification.findOneAndUpdate(

                    {

                        _id:
                            req.params.id,

                        project:
                            projectId,

                        user:
                            userId

                    },

                    {

                        $set: {
                            read: true
                        }

                    },

                    {

                        new: true

                    }

                );


            if (!notification) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Notification not found"

                });

            }


            return res.json({

                success: true,

                data:
                    notification

            });


        } catch (error) {

            console.error(
                "MARK NOTIFICATION READ ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ============================================================
// MARK ALL USER NOTIFICATIONS AS READ
// ============================================================

const markAllRead =
    async (req, res) => {

        try {

            const projectId =
                req.project?._id ||
                req.projectId;

            const userId =
                req.user?._id ||
                req.user?.id;


            if (
                !projectId ||
                !userId
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Project and user are required"

                });

            }


            const result =
                await Notification.updateMany(

                    {

                        project:
                            projectId,

                        user:
                            userId,

                        read:
                            false

                    },

                    {

                        $set: {
                            read: true
                        }

                    }

                );


            return res.json({

                success: true,

                modifiedCount:
                    result.modifiedCount || 0

            });


        } catch (error) {

            console.error(
                "MARK ALL NOTIFICATIONS READ ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


module.exports = {

    getNotifications,

    markRead,

    markAllRead

};
