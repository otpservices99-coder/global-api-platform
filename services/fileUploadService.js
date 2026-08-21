const streamifier =
    require("streamifier");

const cloudinary =
    require("../config/cloudinary");


function uploadBuffer(
    buffer,
    options = {}
) {
    return new Promise(
        (resolve, reject) => {
            if (
                !buffer ||
                !Buffer.isBuffer(buffer)
            ) {
                return reject(
                    new Error(
                        "A valid file buffer is required"
                    )
                );
            }

            const {
                folder = "earnify",
                resourceType = "auto",
                publicId,
                transformation,
                tags,
                context,
                originalFilename
            } = options;

            const uploadOptions = {
                folder,
                resource_type:
                    resourceType,

                disable_promise:
                    true,

                ...(publicId
                    ? {
                        public_id:
                            publicId
                    }
                    : {}),

                ...(transformation
                    ? {
                        transformation
                    }
                    : {}),

                ...(tags
                    ? {
                        tags
                    }
                    : {}),

                ...(context
                    ? {
                        context
                    }
                    : {})
            };

            const uploadStream =
                cloudinary.uploader
                    .upload_stream(
                        uploadOptions,
                        (
                            error,
                            result
                        ) => {
                            if (error) {
                                return reject(
                                    error
                                );
                            }

                            if (!result) {
                                return reject(
                                    new Error(
                                        "Cloudinary returned no upload result"
                                    )
                                );
                            }

                            return resolve({
                                url:
                                    result.secure_url,

                                secureUrl:
                                    result.secure_url,

                                publicId:
                                    result.public_id,

                                resourceType:
                                    result.resource_type,

                                format:
                                    result.format ||
                                    null,

                                width:
                                    result.width ||
                                    null,

                                height:
                                    result.height ||
                                    null,

                                bytes:
                                    result.bytes ||
                                    null,

                                assetId:
                                    result.asset_id ||
                                    null,

                                version:
                                    result.version ||
                                    null,

                                originalFilename:
                                    originalFilename ||
                                    null
                            });
                        }
                    );

            streamifier
                .createReadStream(buffer)
                .on(
                    "error",
                    reject
                )
                .pipe(
                    uploadStream
                );
        }
    );
}


async function uploadFile(
    file,
    options = {}
) {
    if (!file) {
        throw new Error(
            "File is required"
        );
    }

    if (!file.buffer) {
        throw new Error(
            "File buffer is unavailable. Use memory storage with multer."
        );
    }

    return uploadBuffer(
        file.buffer,
        {
            ...options,

            originalFilename:
                file.originalname ||
                options.originalFilename ||
                null
        }
    );
}


async function deleteFile(
    publicId,
    resourceType = "image"
) {
    if (!publicId) {
        return null;
    }

    return cloudinary.uploader.destroy(
        publicId,
        {
            resource_type:
                resourceType
        }
    );
}


module.exports = {
    uploadBuffer,
    uploadFile,
    deleteFile
};
