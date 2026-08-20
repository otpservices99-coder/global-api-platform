
const express = require("express");

const router =
    express.Router();

const {
    processPostback
} = require("../services/earnService");


// ============================================================
// PUBLIC PROVIDER POSTBACK
// ============================================================
//
// GET /api/v1/postbacks/:provider
// POST /api/v1/postbacks/:provider
//
// NO X-API-KEY.
// NO USER JWT.
//
// Authentication is handled by:
//   ?secret=...
//   X-Postback-Secret: ...
//
// Accepted transaction IDs:
//   transaction_id
//   tx
//   externalTxId
//   transactionId
//
// Accepted session IDs:
//   sessionId
//   sub1
//
// Accepted completion statuses:
//   1
//   ok
//   success
//   successful
//   completed
//   complete
//   approved
//   done
//   paid
//
// ============================================================

async function handlePostback(req, res) {
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
                credited: false,
                message:
                    "Provider is required"
            });
        }

        const result =
            await processPostback({
                providerKey: provider,
                req
            });

        return res.status(200).json(
            result
        );
    } catch (error) {
        console.error(
            "EARN POSTBACK ERROR:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            credited: false,
            message:
                error.message ||
                "Postback processing failed"
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
