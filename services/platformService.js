const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");

class PlatformService {

    async getWallet(projectId, userId) {

        let wallet = await Wallet.findOne({
            project: projectId,
            user: userId
        });

        if (!wallet) {

            wallet = await Wallet.create({
                project: projectId,
                user: userId
            });

        }

        return wallet;
    }


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

        wallet.balance += amount;
        wallet.totalEarned += amount;

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

        if (wallet.balance < amount) {
            throw new Error("Insufficient balance");
        }

        wallet.balance -= amount;

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

        if (wallet.balance < amount) {
            throw new Error("Insufficient balance");
        }

        wallet.balance -= amount;
        wallet.pendingBalance += amount;

        await wallet.save();

        return wallet;
    }


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

        if (wallet.pendingBalance < amount) {
            throw new Error(
                "Insufficient pending balance"
            );
        }

        wallet.pendingBalance -= amount;
        wallet.totalWithdrawn += amount;

        await wallet.save();

        return wallet;
    }


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

        if (wallet.pendingBalance < amount) {
            throw new Error(
                "Insufficient pending balance"
            );
        }

        wallet.pendingBalance -= amount;
        wallet.balance += amount;

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
