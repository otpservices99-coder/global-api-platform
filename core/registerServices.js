const platform = require("./platform");

platform.register(
    "platform",
    require("../services/platformService")
);

module.exports = platform;
