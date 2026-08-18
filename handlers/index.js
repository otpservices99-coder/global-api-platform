// ============================================================
// GLOBAL HANDLER REGISTRY
// ============================================================
//
// Dynamically discovers handlers from the handlers directory.
//
// A handler must export:
//
// {
//     name: "some.action",
//     execute: async (context) => { ... }
// }
//
// No project-specific handler mappings are hard-coded here.
// ============================================================

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

    registry.set(
        String(name),
        handler
    );
}

// ============================================================
// LOAD HANDLER FILES DYNAMICALLY
// ============================================================

function loadHandlers(directory = __dirname) {
    const entries = fs.readdirSync(
        directory,
        {
            withFileTypes: true
        }
    );

    for (const entry of entries) {
        const fullPath = path.join(
            directory,
            entry.name
        );

        // Never load this registry file again.
        if (entry.name === "index.js") {
            continue;
        }

        // Recursively scan handler directories.
        if (entry.isDirectory()) {
            loadHandlers(fullPath);
            continue;
        }

        // Only JavaScript files are handlers.
        if (
            !entry.isFile() ||
            !entry.name.endsWith(".js")
        ) {
            continue;
        }

        let handler;

        try {
            handler = require(fullPath);
        } catch (error) {
            console.error(
                `Failed to load handler '${fullPath}':`,
                error
            );
            continue;
        }

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
// HAS
// ============================================================

function has(name) {
    if (!name) {
        return false;
    }

    if (!registry.size) {
        loadHandlers();
    }

    return registry.has(
        String(name)
    );
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
        registry.get(
            String(name)
        );

    if (!handler) {
        throw new Error(
            `Handler '${name}' is not registered`
        );
    }

    return handler(context);
}

// ============================================================
// LIST
// ============================================================

function list() {
    if (!registry.size) {
        loadHandlers();
    }

    return Array.from(
        registry.keys()
    );
}

// ============================================================
// INITIAL LOAD
// ============================================================

loadHandlers();

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    register,
    execute,
    has,
    list,
    loadHandlers,
    registry
};
