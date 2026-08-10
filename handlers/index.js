const fs = require("fs");
const path = require("path");

const Action = require("../models/Action");

const registry = {};



// Register handler

const register = (name, handler) => {

    registry[name] = handler;

};



// Recursively load handlers

const loadDirectory = (dir) => {

    const items = fs.readdirSync(dir);

    for (const item of items) {

        const fullPath = path.join(dir, item);

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {

            loadDirectory(fullPath);

            continue;

        }

        if (!item.endsWith(".js")) {

            continue;

        }

        if (item === "index.js") {

            continue;

        }

        const handler = require(fullPath);

        if (
            handler &&
            handler.name &&
            typeof handler.execute === "function"
        ) {

            register(
                handler.name,
                handler.execute
            );

            console.log(
                "✓ Loaded handler:",
                handler.name
            );

        }

    }

};



loadDirectory(__dirname);



// Execute Action

const execute = async (name, context) => {

    const projectId =
        context.projectId ||
        context.project ||
        context.event?.project;

    const action = await Action.findOne({

        project: projectId,

        name,

        enabled: true

    });

    if (!action) {

        return {

            success: false,

            message: "Action not found",

            action: name

        };

    }

    const handler = registry[name];

    if (!handler) {

        return {

            success: false,

            message: "Handler not registered",

            action: name

        };

    }

    return await handler({

        ...context,

        actionConfig: action.config

    });

};



const list = () => Object.keys(registry);



module.exports = {

    execute,

    register,

    list

};
