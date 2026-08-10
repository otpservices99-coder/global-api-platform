const express = require("express");

const router = express.Router();


const protect =
require("../middleware/auth");

const admin =
require("../middleware/admin");


const {
    getHandlers
} = require("../controllers/actionController");



router.get(
"/",
protect,
admin,
getHandlers
);



module.exports = router;
