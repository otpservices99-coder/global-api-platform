const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");
const admin = require("../middleware/admin");


const {
    getUsers,
    getUserById,
    creditUser,
    debitUser,
    updateUserStatus,
    updateUserRole
} = require("../controllers/adminController");


const {
    getUserWallet
} = require("../controllers/adminWalletController");



// Get all users
router.get(
    "/users",
    protect,
    admin,
    getUsers
);



// Get single user
router.get(
    "/users/:id",
    protect,
    admin,
    getUserById
);



// Get user wallet
router.get(
    "/users/:userId/wallet",
    protect,
    admin,
    getUserWallet
);



// Credit wallet
router.post(
    "/users/:id/credit",
    protect,
    admin,
    creditUser
);



// Debit wallet
router.post(
    "/users/:id/debit",
    protect,
    admin,
    debitUser
);



// Update user status
router.patch(
    "/users/:id/status",
    protect,
    admin,
    updateUserStatus
);



// Update user role
router.patch(
    "/users/:id/role",
    protect,
    admin,
    updateUserRole
);



module.exports = router;
