const express = require("express");
const config = require("../config/app.config");

const router = express.Router();

router.get("/", (req, res) => {
    res.send(`Welcome to ${config.siteName}!`);
});

module.exports = router;
