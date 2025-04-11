const multer = require("multer");
const path = require("path");

const uploadProfilePictureFunc = (fieldName, destinationPath) => {
  // Set up multer storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./public/" + destinationPath); // Set the destination folder for uploaded files
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = req.user.userId + "-" + Date.now() + ext; // Set the filename for uploaded files
      cb(null, filename);
    },
  });

  // Set up multer upload
  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png/; // Set the allowed filetypes for uploaded files
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb("Error: Only JPEG, JPG, and PNG files are allowed");
      }
    },
    limits: {
      fileSize: 1024 * 1024 * 2, // Set the maximum filesize for uploaded files (2MB)
    },
  }).single(fieldName); // Set the field name for the uploaded file

  return upload;
};

module.exports = uploadProfilePictureFunc;
