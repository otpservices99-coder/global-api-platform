const Wallet = require("../models/Wallet");

class WalletService {

    // ============================================================
    // ENSURE WALLET
    // ============================================================
    //
    // Creates the wallet if missing.
    //
    // Existing wallet:
    //     returns it unchanged.
    //
    // Missing wallet:
    //     creates it with zero balances.
    //
    // This is intentionally reusable by:
    //
    // - registration
    // - admin user creation
    // - OAuth
    // - seed scripts
    // - wallet.credit
    // - wallet.debit
    // - wallet.ensure
    // - migrations
    //
    // ============================================================
    async ensureWallet(
        projectId,
        userId,
        options = {}
    ) {

        if (!projectId) {
            throw new Error(
                "Project ID is required"
            );
        }

        if (!userId) {
            throw new Error(
                "User ID is required"
            );
        }

        const currency =
            options.currency || "NGN";

        const metadata =
            options.metadata &&
            typeof options.metadata === "object"
                ? options.metadata
                : {};

        // ------------------------------------------------------------
        // Check existing wallet
        // ------------------------------------------------------------

        let wallet =
            await Wallet.findOne({
                project: projectId,
                user: userId
            });

        if (wallet) {
            return wallet;
        }

        // ------------------------------------------------------------
        // Create wallet
        // ------------------------------------------------------------

        try {

            wallet =
                await Wallet.create({
                    project: projectId,
                    user: userId,

                    balance: 0,
                    pendingBalance: 0,
                    totalEarned: 0,
                    totalWithdrawn: 0,

                    currency,

                    metadata
                });

            return wallet;

        } catch (error) {

            // --------------------------------------------------------
            // Handle simultaneous creation
            // --------------------------------------------------------

            if (error?.code === 11000) {

                wallet =
                    await Wallet.findOne({
                        project: projectId,
                        user: userId
                    });

                if (wallet) {
                    return wallet;
                }
            }

            throw error;
        }
    }

    // ============================================================
    // GET WALLET
    // ============================================================
    //
    // Read-only.
    //
    // IMPORTANT:
    // This does NOT create a wallet.
    //
    // ============================================================
    async getWallet(
        projectId,
        userId
    ) {

        if (!projectId) {
            throw new Error(
                "Project ID is required"
            );
        }

        if (!userId) {
            throw new Error(
                "User ID is required"
            );
        }

        return Wallet.findOne({
            project: projectId,
            user: userId
        });
    }

    // ============================================================
    // ENSURE WALLET DATA
    // ============================================================
    async ensureWalletData(
        projectId,
        userId,
        options = {}
    ) {

        return this.ensureWallet(
            projectId,
            userId,
            options
        );
    }
}

module.exports = new WalletService();
