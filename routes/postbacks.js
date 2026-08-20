const express = require("express");

const router =
    express.Router();

const {
    processPostback
} = require("../services/earnService");


async function handlePostback(
    req,
    res
) {
    try {
        const provider =
            String(
                req.params.provider || ""
            )
                .trim()
                .toLowerCase();

        if (!provider) {
            return res.status(400).json({
                success: false,
                message:
                    "Provider is required"
            });
        }

        const result =
            await processPostback({
                providerKey:
                    provider,
                req
            });

        /*
         * Duplicate callbacks intentionally return 200.
         *
         * The provider already told us about this transaction.
         * We simply acknowledge it without crediting again.
         */
        if (result.duplicate) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                message:
                    "Postback already processed"
            });
        }

        return res.status(200).json({
            success: true,
            credited:
                result.credited === true,
            amount:
                result.amount || 0
        });

    } catch (error) {
        console.error(
            "EARN POSTBACK ERROR:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Postback rejected"
        });
    }
}


router.get(
    "/:provider",
    handlePostback
);


router.post(
    "/:provider",
    handlePostback
);


module.exports = router;
