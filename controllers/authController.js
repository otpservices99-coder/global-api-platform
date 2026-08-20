const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const walletService = require("../services/walletService");

// ============================================================
// REGISTER USER
// ============================================================

const registerUser = async (req, res) => {
    try {
        /*
         * Project authentication has already been performed
         * by middleware/project.js.
         *
         * Do NOT look inside Project.apiKeys here.
         *
         * The middleware supports:
         * - global API keys
         * - project API keys
         * - legacy project keys
         */
        const project = req.project || null;

        const projectId =
            req.projectId ||
            project?._id ||
            null;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Target project is required"
            });
        }

        const {
            username,
            email,
            password
        } = req.body;

        // ====================================================
        // VALIDATE INPUT
        // ====================================================

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required"
            });
        }

        // ====================================================
        // CHECK EXISTING USER
        // ====================================================

        const existingUser = await User.findOne({
            project: projectId,
            $or: [
                { email },
                { username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        // ====================================================
        // HASH PASSWORD
        // ====================================================

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // ====================================================
        // CREATE USER
        // ====================================================

        const user = await User.create({
            project: projectId,
            username,
            email,
            password: hashedPassword
        });

        // ====================================================
        // ENSURE USER WALLET
        // ====================================================

        await walletService.ensureWallet(
            projectId,
            user._id
        );

        // ====================================================
        // SUCCESS
        // ====================================================

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                project: project?.name || projectId
            }
        });

    } catch (error) {
        console.error(
            "REGISTER USER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// LOGIN USER
// ============================================================

const loginUser = async (req, res) => {
    try {
        /*
         * API-key authentication has already happened in:
         *
         *     middleware/project.js
         *
         * This means req.projectId is the authoritative
         * project selected by the API key.
         *
         * This works with both:
         *
         *     global API key + X-Project-ID
         *
         * and:
         *
         *     normal project API key
         */

        const project = req.project || null;

        const projectId =
            req.projectId ||
            project?._id ||
            null;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Target project is required"
            });
        }

        const {
            email,
            password
        } = req.body;

        // ====================================================
        // VALIDATE INPUT
        // ====================================================

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // ====================================================
        // FIND USER INSIDE TARGET PROJECT
        // ====================================================

        const user = await User.findOne({
            email,
            project: projectId
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // ====================================================
        // COMPARE PASSWORD
        // ====================================================

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // ====================================================
        // GENERATE JWT
        // ====================================================

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                platformRole: user.platformRole,
                project: user.project
            },
            process.env.JWT_SECRET
        );

        // ====================================================
        // UPDATE LOGIN TIME
        // ====================================================

        user.lastLogin = new Date();

        await user.save();

        // ====================================================
        // SUCCESS
        // ====================================================

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                platformRole: user.platformRole,
                project: user.project
            }
        });

    } catch (error) {
        console.error(
            "LOGIN USER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    registerUser,
    loginUser
};
