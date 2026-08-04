const AuditLog = require("../models/AuditLog");

class AuditService {

    async log({
        project,
        actor,
        user = null,
        action,
        resource = "",
        metadata = {},
        req = null
    }) {

        return await AuditLog.create({

            project,

            actor,

            user,

            action,

            resource,

            metadata,

            ip: req?.ip || "",

            userAgent: req?.headers["user-agent"] || ""

        });

    }

}

module.exports = new AuditService();
