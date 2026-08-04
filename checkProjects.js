require("dotenv").config();

const connectDB = require("./config/database");
const Project = require("./models/Project");

connectDB();

setTimeout(async()=>{

try{

const projects = await Project.find({});

console.log(
JSON.stringify(projects,null,2)
);

process.exit();

}catch(error){

console.log(error.message);

process.exit();

}

},2000);
