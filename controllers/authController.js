const User = require("../models/User");
const Project = require("../models/Project");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// =========================
// REGISTER USER
// =========================

const registerUser = async (req, res) => {

try {

const projectKey = req.headers["x-api-key"];

const {
username,
email,
password
} = req.body;


// Validate API Key

if (!projectKey) {

return res.status(400).json({

success: false,
message: "Project API key is missing"

});

}


// Validate Input

if (!username || !email || !password) {

return res.status(400).json({

success: false,
message: "Username, email and password are required"

});

}


// Find Project

const project = await Project.findOne({

status: "active",

apiKeys: {
$elemMatch: {
key: projectKey,
status: "active"
}
}

});


if (!project) {

return res.status(401).json({

success: false,
message: "Invalid project API key"

});

}


// Check if user already exists INSIDE this project

const existingUser = await User.findOne({

project: project._id,

$or: [
{ email },
{ username }
]

});


if (existingUser) {

return res.status(400).json({

success: false,
message: "Username or email already exists"

});

}


// Hash Password

const hashedPassword = await bcrypt.hash(password, 10);


// Create User

const user = await User.create({

project: project._id,

username,

email,

password: hashedPassword

});


// Success

res.status(201).json({

success: true,

message: "Account created successfully",

user: {

id: user._id,

username: user.username,

email: user.email,

project: project.name

}

});

} catch (error) {

res.status(500).json({

success: false,

message: error.message

});

}

};




// =========================
// LOGIN USER
// =========================

const loginUser = async (req, res) => {

try {

const projectKey = req.headers["x-api-key"];

const {
email,
password
} = req.body;


// Validate API Key

if (!projectKey) {

return res.status(400).json({

success: false,
message: "Project API key is missing"

});

}


// Find Project

const project = await Project.findOne({

status: "active",

apiKeys: {
$elemMatch: {
key: projectKey,
status: "active"
}
}

});


if (!project) {

return res.status(401).json({

success: false,
message: "Invalid project API key"

});

}


// Find User ONLY inside this project

const user = await User.findOne({

email,

project: project._id

});


if (!user) {

return res.status(400).json({

success: false,

message: "Invalid email or password"

});

}


// Compare Password

const validPassword = await bcrypt.compare(

password,

user.password

);


if (!validPassword) {

return res.status(400).json({

success: false,

message: "Invalid email or password"

});

}


// Generate JWT

const token = jwt.sign(

{

id: user._id,

role: user.role,

platformRole: user.platformRole,

project: user.project

},

process.env.JWT_SECRET,

{

expiresIn: "7d"

}

);


// Update Login Time

user.lastLogin = new Date();

await user.save();


// Success

res.json({

success: true,

message: "Login successful",

token,

user: {

id: user._id,

username: user.username,

email: user.email,

role: user.role,

platformRole: user.platformRole,

project: user.project

}

});

} catch (error) {

res.status(500).json({

success: false,

message: error.message

});

}

};


module.exports = {

registerUser,

loginUser

};
