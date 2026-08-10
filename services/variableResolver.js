const resolveValue = (value, context) => {

    if (typeof value !== "string") {

        return value;

    }


    const regex = /\{\{(.*?)\}\}/g;


    return value.replace(
        regex,
        (_, path) => {

            const result =
                path
                .trim()
                .split(".")
                .reduce(
                    (obj,key)=>obj?.[key],
                    context
                );


            return result !== undefined
                ? result
                : "";

        }
    );

};





const resolveObject = (obj, context) => {


    if (Array.isArray(obj)) {

        return obj.map(
            item =>
            resolveObject(
                item,
                context
            )
        );

    }



    if (
        obj &&
        typeof obj === "object"
    ) {


        const output = {};


        for (const key of Object.keys(obj)) {


            output[key] =
                resolveObject(
                    obj[key],
                    context
                );


        }


        return output;

    }



    return resolveValue(
        obj,
        context
    );

};



module.exports = {

    resolveValue,

    resolveObject

};
