const express = require("express");

const router = express.Router();

const protect = require("../middleware/auth");


/*
|--------------------------------------------------------------------------
| WITHDRAWAL ROUTES
|--------------------------------------------------------------------------
|
| Withdrawal requests are now handled by the Global Action Engine.
|
| Use:
|
| POST /api/v1/engine
|
| {
|     "action": "withdrawal.request",
|     "data": {
|         "user": "...",
|         "amount": 20,
|         "method": "bank",
|         "details": {
|             "bank": "Test Bank",
|             "accountNumber": "1234567890",
|             "accountName": "Test User"
|         }
|     }
| }
|
|--------------------------------------------------------------------------
|
| The old hardcoded:
|
| POST /api/v1/withdrawals/request
|
| endpoint has been removed.
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| No hardcoded withdrawal mutation routes
|--------------------------------------------------------------------------
|
| Future withdrawal operations should be registered as Actions and
| executed through /api/v1/engine.
|
|--------------------------------------------------------------------------
*/

module.exports = router;
