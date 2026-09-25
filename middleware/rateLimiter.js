const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const getClientIp = (req) => {
    const cloudflareIp = req.headers["cf-connecting-ip"];
    if (cloudflareIp) return cloudflareIp;

    const forwardedIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
    if (forwardedIp) return forwardedIp;

    const realIp = req.headers["x-real-ip"];
    if (realIp) return realIp;

    return ipKeyGenerator(req.ip || "unknown");
};

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIp,
    message: {
        success: false,
        message: "Too many requests, please try again later"
    }
});

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIp,
    message: {
        success: false,
        message: "Too many login attempts, try again later"
    }
});

module.exports = {
    apiLimiter,
    loginLimiter
};
