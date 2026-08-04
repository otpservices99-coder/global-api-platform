const File=require("../models/File");


const providers={};



exports.register=(name,handler)=>{

providers[name]=handler;

};




exports.upload=async({

project,

provider="local",

file

})=>{


const storage=providers[provider];


if(!storage){

throw new Error(
"Storage provider unavailable"
);

}



const result=
await storage.upload(file);



return await File.create({

project,

name:file.originalname,

provider,

path:result.path,

url:result.url,

size:file.size,

mime:file.mimetype

});


};





exports.delete=async(id)=>{


const file=
await File.findById(id);


if(!file){

throw new Error(
"File not found"
);

}



const storage=
providers[file.provider];


if(storage){

await storage.delete(
file.path
);

}



await file.deleteOne();


return true;

};
