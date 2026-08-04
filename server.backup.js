require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/database");


// Routes
const homeRoute = require("./routes/home");
const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");

const adminRoute = require("./routes/admin");
const walletRoute = require("./routes/wallet");
const withdrawalRoute = require("./routes/withdrawal");

const dashboardRoute = require("./routes/dashboard");

const adminDashboardRoute = require("./routes/adminDashboard");
const adminWithdrawalRoute = require("./routes/adminWithdrawal");
const adminUsersRoute = require("./routes/adminUsers");
const adminImpersonationRoute = require("./routes/adminImpersonation");

const projectRoute = require("./routes/project");

const settingsRoute = require("./routes/settings");
const notificationRoute = require("./routes/notification");

const searchRoute = require("./routes/search");
const auditRoute = require("./routes/audit");
const statsRoute = require("./routes/stats");

const platformRoute = require("./routes/platform");


// Middleware
const project = require("./middleware/project");


// App
const app = express();


// Database
connectDB();


// Global middleware
app.use(cors());

app.use(
    helmet()
);

app.use(
    morgan("dev")
);

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended:true
    })
);



// Home
app.use(
    "/",
    homeRoute
);



// Authentication
app.use(
    "/api/auth",
    authRoute
);



// User APIs
app.use(
    "/api/user",
    userRoute
);



// Project based APIs
// Requires X-API-Key

app.use(
    "/api/v1/admin",
    project,
    adminRoute
);


app.use(
    "/api/v1/wallet",
    project,
    walletRoute
);


app.use(
    "/api/v1/dashboard",
    project,
    dashboardRoute
);


app.use(
    "/api/v1/withdrawals",
    project,
    withdrawalRoute
);


app.use(
    "/api/v1/admin/dashboard",
    project,
    adminDashboardRoute
);


app.use(
    "/api/v1/admin/withdrawals",
    project,
    adminWithdrawalRoute
);


app.use(
    "/api/v1/admin/users",
    adminUsersRoute
);


app.use(
    "/api/v1/admin/impersonate",
    adminImpersonationRoute
);



app.use(
    "/api/v1/admin/audit",
    auditRoute
);


app.use(
    "/api/v1/admin/stats",
    statsRoute
);



// Project management
app.use(
    "/api/v1/admin/projects",
    projectRoute
);



// Settings
app.use(
    "/api/v1/settings",
    settingsRoute
);



// Notifications
app.use(
    "/api/v1/notifications",
    notificationRoute
);



// Search
app.use(
    "/api/v1/search",
    searchRoute
);



// Global platform control
// No project middleware here
app.use(
    "/api/v1/platform",
    platformRoute
);




// 404 handler
app.use((req,res)=>{

    res.status(404).json({

        success:false,

        message:"Route not found"

    });

});




// Error handler
app.use((err,req,res,next)=>{

    console.error(err);


    res.status(500).json({

        success:false,

        message:"Internal server error"

    });

});




// Start server
const PORT = process.env.PORT || 3000;


app.listen(
    PORT,
    ()=>{
        console.log(
            `🚀 Global Platform API running on port ${PORT}`
        );
    }
);
