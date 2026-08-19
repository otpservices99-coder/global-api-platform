const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const walletService = require("./walletService");

class PlatformService {

    // ============================================================
    // GET / ENSURE WALLET
    // ============================================================
    async getWallet(projectId, userId) {
        if (!projectId) {
            throw new Error("Project ID is required");
        }

        if (!userId) {
            throw new Error("User ID is required");
        }

        return walletService.ensureWallet(
            projectId,
            userId
        );
    }

    // ============================================================
    // CREDIT
    // ============================================================
    async addBalance(
        projectId,
        userId,
        amount,
        description = "Credit"
    ) {
        amount = Number(amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Invalid credit amount");
        }

        const wallet = await this.getWallet(
            projectId,
            userId
        );

        wallet.balance =
            Number(wallet.balance || 0) + amount;

        wallet.totalEarned =
            Number(wallet.totalEarned || 0) + amount;

        await wallet.save();

        await Transaction.create({
            project: projectId,
            user: userId,
            type: "earning",
            amount,
            description,
            status: "completed"
        });

        return wallet;
    }

    // ============================================================
    // DEBIT
    // ============================================================
    async removeBalance(
        projectId,
        userId,
        amount,
        description = "Debit"
    ) {
        amount = Number(amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Invalid debit amount");
        }

        const wallet = await this.getWallet(
            projectId,
            userId
        );

        if (Number(wallet.balance || 0) < amount) {
            throw new Error("Insufficient balance");
        }

        wallet.balance =
            Number(wallet.balance || 0) - amount;

        await wallet.save();

        await Transaction.create({
            project: projectId,
            user: userId,
            type: "penalty",
            amount,
            description,
            status: "completed"
        });

        return wallet;
    }

    // ============================================================
    // MOVE BALANCE TO PENDING
    // ============================================================
    async moveToPending(
        projectId,
        userId,
        amount
    ) {
        amount = Number(amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Invalid pending amount");
        }

        const wallet = await this.getWallet(
            projectId,
            userId
        );

        if (Number(wallet.balance || 0) < amount) {
            throw new Error("Insufficient balance");
        }

        wallet.balance =
            Number(wallet.balance || 0) - amount;

        wallet.pendingBalance =
            Number(wallet.pendingBalance || 0) + amount;

        await wallet.save();

        return wallet;
    }

    // ============================================================
    // COMPLETE PENDING WITHDRAWAL
    // ============================================================
    async completePendingWithdrawal(
        projectId,
        userId,
        amount
    ) {
        amount = Number(amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Invalid withdrawal amount");
        }

        const wallet = await this.getWallet(
            projectId,
            userId
        );

        if (
            Number(wallet.pendingBalance || 0) <
            amount
        ) {
            throw new Error(
                "Insufficient pending balance"
            );
        }

        wallet.pendingBalance =
            Number(wallet.pendingBalance || 0) - amount;

        wallet.totalWithdrawn =
            Number(wallet.totalWithdrawn || 0) + amount;

        await wallet.save();

        return wallet;
    }

    // ============================================================
    // REFUND PENDING WITHDRAWAL
    // ============================================================
    async refundPendingWithdrawal(
        projectId,
        userId,
        amount,
        description = "Withdrawal Rejected"
    ) {
        amount = Number(amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Invalid refund amount");
        }

        const wallet = await this.getWallet(
            projectId,
            userId
        );

        if (
            Number(wallet.pendingBalance || 0) <
            amount
        ) {
            throw new Error(
                "Insufficient pending balance"
            );
        }

        wallet.pendingBalance =
            Number(wallet.pendingBalance || 0) - amount;

        wallet.balance =
            Number(wallet.balance || 0) + amount;

        await wallet.save();

        await Transaction.create({
            project: projectId,
            user: userId,
            type: "refund",
            amount,
            description,
            status: "completed"
        });

        return wallet;
    }

    // ============================================================
    // REFUND ALIAS
    // ============================================================
    async refund(
        projectId,
        userId,
        amount,
        description = "Withdrawal Rejected"
    ) {
        return this.refundPendingWithdrawal(
            projectId,
            userId,
            amount,
            description
        );
    }

    // ============================================================
    // TRANSACTIONS
    // ============================================================
    async getTransactions(
        projectId,
        userId
    ) {
        return Transaction.find({
            project: projectId,
            user: userId
        })
            .populate(
                "withdrawal",
                "amount method status createdAt processedAt"
            )
            .sort({
                createdAt: -1
            });
    }

    // ============================================================
    // NOTIFICATION
    // ============================================================
    async notify(
        projectId,
        userId,
        title,
        message
    ) {
        return Notification.create({
            project: projectId,
            user: userId,
            title,
            message
        });
    }
}

module.exports = new PlatformService();
