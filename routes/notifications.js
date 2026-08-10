const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");

const project = require("../middleware/project");


const {
getNotifications,
markRead
}=require("../controllers/notificationController");



router.get(
"/",
project,
protect,
getNotifications
);



router.put(
"/:id/read",
project,
protect,
markRead
);



module.exports = router;
