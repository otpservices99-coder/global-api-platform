process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const connectDB = require("./config/database");


// ============================================================
// BACKGROUND ENGINES
// ============================================================

require("./services/schedulerEngine");

require("./handlers");


// ============================================================
// MIDDLEWARE
// ============================================================

const project =
    require("./middleware/project");

const apiUsage =
    require("./middleware/apiUsage");


// ============================================================
// ROUTES
// ============================================================

const homeRoute =
    require("./routes/home");

const authRoute =
    require("./routes/auth");

const userRoute =
    require("./routes/user");

const adminRoute =
    require("./routes/admin");

const dashboardRoute =
    require("./routes/dashboard");

const adminDashboardRoute =
    require("./routes/adminDashboard");

const adminWithdrawalRoute =
    require("./routes/adminWithdrawal");

const referralRoutes =
    require("./routes/referral");

const adminUsersRoute =
    require("./routes/adminUsers");

const adminImpersonationRoute =
    require("./routes/adminImpersonation");

const adminWalletRoute =
    require("./routes/adminWallet");

const earnRoutes =
    require("./routes/earn");

const postbackRoutes =
    require("./routes/postbacks");

const adminTransactionRoute =
    require("./routes/adminTransaction");

const projectRoute =
    require("./routes/project");

const settingsRoute =
    require("./routes/settings");

const notificationRoute =
    require("./routes/notifications");

const auditRoute =
    require("./routes/audit");

const statsRoute =
    require("./routes/stats");

const platformRoute =
    require("./routes/platform");


// ============================================================
// GLOBAL RESOURCE SYSTEM
// ============================================================

const resourceRoute =
    require("./routes/resources");

const resourceManagerRoute =
    require("./routes/resourceManager");

const schemaManagerRoute =
    require("./routes/schemaManager");


// ============================================================
// PLATFORM / ENGINE ROUTES
// ============================================================

const platformAdminRoute =
    require("./routes/platformAdmin");

const controlCenterRoute =
    require("./routes/controlCenter");

const actionsRoute =
    require("./routes/actions");

const engineRoute =
    require("./routes/engine");

const handlersRoute =
    require("./routes/handlers");

const searchRoute =
    require("./routes/search");


// ============================================================
// ADMIN ROUTES
// ============================================================

const adminNotificationsRoute =
    require("./routes/adminNotifications");

const apiKeyRoute =
    require("./routes/apiKeys");


// ============================================================
// ROLE TEST
// ============================================================

const roleTestRoute =
    require("./routes/roleTest");


// ============================================================
// APP
// ============================================================

const app = express();


// ============================================================
// DATABASE
// ============================================================

connectDB();


// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================

app.use(
    cors()
);

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(
    morgan("dev")
);

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);


// ============================================================
// SWAGGER
// ============================================================

app.get(
    "/api-docs/swagger.json",
    (req, res) => {
        res.json(swaggerSpec);
    }
);

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);


// ============================================================
// HOME
// ============================================================

app.use(
    "/",
    homeRoute
);


// ============================================================
// AUTHENTICATION
// ============================================================

app.use(
    "/api/auth",
    authRoute
);


// ============================================================
// EARN
// ============================================================

app.use(
    "/api/v1/earn",
    earnRoutes
);


// ============================================================
// REFERRALS
// ============================================================

app.use(
    "/api/v1/referrals",
    referralRoutes
);


// ============================================================
// POSTBACKS
// ============================================================

app.use(
    "/api/v1/postbacks",
    postbackRoutes
);


// ============================================================
// USER
// ============================================================

app.use(
    "/api/user",
    userRoute
);


// ============================================================
// USER NOTIFICATIONS
// ============================================================
//
// User-facing notification API.
//
// GET   /api/v1/notifications
// PUT   /api/v1/notifications/:id/read
// PATCH /api/v1/notifications/:id/read
// POST  /api/v1/notifications/read-all
//
// The route itself applies project + JWT protection.
//

app.use(
    "/api/v1/notifications",
    notificationRoute
);


// ============================================================
// ADMIN NOTIFICATIONS
// ============================================================

app.use(
    "/api/v1/admin/notifications",
    project,
    apiUsage,
    adminNotificationsRoute
);


// ============================================================
// ADMIN ROOT
// ============================================================

app.use(
    "/api/v1/admin",
    project,
    apiUsage,
    adminRoute
);


// ============================================================
// USER DASHBOARD
// ============================================================

app.use(
    "/api/v1/dashboard",
    project,
    apiUsage,
    dashboardRoute
);


// ============================================================
// ADMIN DASHBOARD
// ============================================================

app.use(
    "/api/v1/admin/dashboard",
    project,
    apiUsage,
    adminDashboardRoute
);


// ============================================================
// ADMIN WITHDRAWALS
// ============================================================

app.use(
    "/api/v1/admin/withdrawals",
    project,
    apiUsage,
    adminWithdrawalRoute
);


// ============================================================
// ADMIN USERS
// ============================================================

app.use(
    "/api/v1/admin/users",
    project,
    apiUsage,
    adminUsersRoute
);


// ============================================================
// ADMIN WALLET
// ============================================================

app.use(
    "/api/v1/admin/wallet",
    project,
    apiUsage,
    adminWalletRoute
);


// ============================================================
// ADMIN TRANSACTIONS
// ============================================================

app.use(
    "/api/v1/admin/transactions",
    project,
    apiUsage,
    adminTransactionRoute
);


// ============================================================
// ADMIN IMPERSONATION
// ============================================================

app.use(
    "/api/v1/admin/impersonate",
    adminImpersonationRoute
);


// ============================================================
// ADMIN AUDIT
// ============================================================

app.use(
    "/api/v1/admin/audit",
    project,
    apiUsage,
    auditRoute
);


// ============================================================
// ADMIN STATS
// ============================================================

app.use(
    "/api/v1/admin/stats",
    project,
    apiUsage,
    statsRoute
);


// ============================================================
// ADMIN PROJECTS
// ============================================================

app.use(
    "/api/v1/admin/projects",
    projectRoute
);


// ============================================================
// ADMIN API KEYS
// ============================================================

app.use(
    "/api/v1/admin/api-keys",
    project,
    apiUsage,
    apiKeyRoute
);


// ============================================================
// ADMIN RESOURCE MANAGER
// ============================================================

app.use(
    "/api/v1/admin/resources",
    project,
    apiUsage,
    resourceManagerRoute
);


// ============================================================
// SETTINGS
// ============================================================

app.use(
    "/api/v1/settings",
    project,
    apiUsage,
    settingsRoute
);


// ============================================================
// SEARCH
// ============================================================

app.use(
    "/api/v1/search",
    project,
    apiUsage,
    searchRoute
);


// ============================================================
// PLATFORM
// ============================================================

app.use(
    "/api/v1/platform",
    platformRoute
);


// ============================================================
// GLOBAL RESOURCE API
// ============================================================

app.use(
    "/api/v1/resources",
    project,
    apiUsage,
    resourceRoute
);


// ============================================================
// RESOURCE MANAGER
// ============================================================

app.use(
    "/api/v1/resource-manager",
    project,
    apiUsage,
    resourceManagerRoute
);


// ============================================================
// SCHEMA MANAGER
// ============================================================

app.use(
    "/api/v1/schema-manager",
    project,
    apiUsage,
    schemaManagerRoute
);


// ============================================================
// ADMIN SCHEMA MANAGER
// ============================================================

app.use(
    "/api/v1/admin/schemas",
    project,
    apiUsage,
    schemaManagerRoute
);


// ============================================================
// SUPER ADMIN PLATFORM
// ============================================================

app.use(
    "/api/v1/platform/admin",
    platformAdminRoute
);


// ============================================================
// ADMIN CONTROL CENTER
// ============================================================

app.use(
    "/api/v1/admin/control-center",
    controlCenterRoute
);


// ============================================================
// DYNAMIC ACTIONS
// ============================================================

app.use(
    "/api/v1/actions",
    project,
    apiUsage,
    actionsRoute
);


// ============================================================
// GLOBAL ACTION ENGINE
// ============================================================
//
// Action
//   ↓
// Resource
//   ↓
// Operation
//   ↓
// ResourceService
//
// No Earnify-specific action implementation here.
//

app.use(
    "/api/v1/engine",
    project,
    apiUsage,
    engineRoute
);


// ============================================================
// ROLE TEST
// ============================================================

app.use(
    "/api/v1/role-test",
    roleTestRoute
);


// ============================================================
// HANDLERS
// ============================================================

app.use(
    "/api/v1/handlers",
    handlersRoute
);


// ============================================================
// 404
// ============================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "Route not found",

            path:
                req.originalUrl,

            method:
                req.method

        });

    }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "GLOBAL ERROR:",
            err
        );

        if (res.headersSent) {
            return next(err);
        }

        res.status(
            err.status || 500
        ).json({

            success: false,

            message:
                err.message ||
                "Internal server error"

        });

    }
);


// ============================================================
// SERVER
// ============================================================

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `🚀 Global Platform API running on port ${PORT}`
        );

        console.log(
            `📚 Swagger: /api-docs`
        );

        console.log(
            `🌐 Resources: /api/v1/resources`
        );

        console.log(
            `⚙️ Resource Manager: /api/v1/resource-manager`
        );

        console.log(
            `🛡️ Admin Resources: /api/v1/admin/resources`
        );

        console.log(
            `🔔 User Notifications: /api/v1/notifications`
        );

        console.log(
            `⚡ Action Engine: /api/v1/engine`
        );

    }
);
