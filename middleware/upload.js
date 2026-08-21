const multer = require("multer");

const MAX_FILE_SIZE =
    Number(process.env.MAX_UPLOAD_SIZE_MB || 10) *
    1024 *
    1024;

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "application/pdf"
]);

const fileFilter = (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(
            new Error(
                `Unsupported file type: ${file.mimetype}`
            )
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },
    fileFilter
});

module.exports = upload;
