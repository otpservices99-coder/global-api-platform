module.exports = function(schema,data){


const errors=[];



for(const field of schema.fields){


let value = data[field.name];



// Required check

if(field.required){

if(
value===undefined ||
value===null ||
value===""
){

errors.push({

field:field.name,

message:"Required"

});

continue;

}

}



// Skip optional missing fields

if(value===undefined) continue;



switch(String(field.type).toLowerCase()){



case "string":

case "text":


if(typeof value !== "string"){

errors.push({

field:field.name,

message:"Must be string"

});

}

break;



case "number":


if(typeof value !== "number"){

errors.push({

field:field.name,

message:"Must be number"

});

}

break;



case "boolean":


if(typeof value !== "boolean"){

errors.push({

field:field.name,

message:"Must be boolean"

});

}

break;



case "array":


if(!Array.isArray(value)){

errors.push({

field:field.name,

message:"Must be array"

});

}

break;



case "object":


if(
typeof value !== "object" ||
Array.isArray(value) ||
value===null
){

errors.push({

field:field.name,

message:"Must be object"

});

}

break;



case "date":


if(isNaN(Date.parse(value))){

errors.push({

field:field.name,

message:"Invalid date"

});

}

break;



case "enum":


if(
field.options &&
!field.options.includes(value)
){

errors.push({

field:field.name,

message:"Invalid option"

});

}

break;



default:


errors.push({

field:field.name,

message:`Unsupported type ${field.type}`

});


}



}



return {

valid:errors.length===0,

errors

};


};
