const express=require("express");

const router=express.Router();

const protect=require("../middleware/auth");
const admin=require("../middleware/admin");


const {

createApiKey,
getApiKeys,
revokeApiKey

}=require("../controllers/apiKeyController");



router.post(
"/create",
protect,
admin,
createApiKey
);



router.get(
"/",
protect,
admin,
getApiKeys
);



router.post(
"/:id/revoke",
protect,
admin,
revokeApiKey
);



module.exports=router;
