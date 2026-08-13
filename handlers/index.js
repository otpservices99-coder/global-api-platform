const fs = require("fs");
const path = require("path");

const registry = new Map();


// ============================================================
// REGISTER
// ============================================================

function register(name, handler) {

    if (
        !name ||
        typeof handler !== "function"
    ) {
        throw new Error(
            "Handler name and function are required"
        );
    }

    registry.set(name, handler);
}


// ============================================================
// LOAD HANDLER FILES DYNAMICALLY
// ============================================================

function loadHandlers(directory = __dirname) {

    const entries =
        fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {

        const fullPath =
            path.join(
                directory,
                entry.name
            );

        if (entry.name === "index.js") {
            continue;
        }

        if (entry.isDirectory()) {

            loadHandlers(fullPath);

            continue;
        }

        if (
            !entry.isFile() ||
            !entry.name.endsWith(".js")
        ) {
            continue;
        }

        const handler =
            require(fullPath);

        if (
            !handler ||
            !handler.name ||
            typeof handler.execute !== "function"
        ) {
            continue;
        }

        register(
            handler.name,
            handler.execute
        );
    }
}


// ============================================================
// EXECUTE
// ============================================================

async function execute(
    name,
    context = {}
) {

    if (!name) {

        throw new Error(
            "Handler name is required"
        );
    }

    if (!registry.size) {
        loadHandlers();
    }

    const handler =
        registry.get(name);

    if (!handler) {

        throw new Error(
            `Handler '${name}' is not registered`
        );
    }

    return handler(context);
}


// ============================================================
// INITIAL LOAD
// ============================================================

loadHandlers();


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    register,

    execute,

    loadHandlers,

    registry

};
