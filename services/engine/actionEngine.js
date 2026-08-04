const Wallet = require("../../models/Wallet");


const executeAction = async(action)=>{


switch(action.type){


case "wallet.credit":


await Wallet.findOneAndUpdate(

{
project:action.project,
user:action.user
},

{

$inc:{

balance:action.data.amount,

totalEarned:action.data.amount

}

}

);


break;



default:


console.log(
"Unknown action:",
action.type
);


}


};


module.exports = executeAction;
