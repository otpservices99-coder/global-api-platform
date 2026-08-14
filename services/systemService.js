const mongoose = require("mongoose");

async function ping({ projectId } = {}) {

    return {
        success: true,
        message: "pong",
        project: projectId || null,
        timestamp: new Date().toISOString()
    };

}

module.exports = {
    ping
};
