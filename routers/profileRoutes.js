const express = require("express");
const {
  getProfileData,
  uploadProfilePicture,
} = require("../controllers/profileController");
const router = express.Router();
const { verifyToken } = require("../middlewares/verifyToken");

router.get("/", verifyToken, getProfileData);
router.post("/upload-profile-picture", verifyToken, uploadProfilePicture);

module.exports = router;
