const User = require("../models/User");
const uploadProfilePictureFunc = require("../middlewares/uploadProfilePicture");

const getProfileData = async (req, res) => {
  try {
    const userId = req.user.userId; // userId is stored in req.user by verifyToken middleware

    const user = await User.findById(userId).select(
      "profilePicture fullname username email"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      profilePicture: user.profilePicture,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const uploadProfilePicture = async (req, res) => {
  const upload = uploadProfilePictureFunc("profilePicture", "images");

  // Call upload middleware
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer Error:", err);
      return res
        .status(400)
        .json({ error: "Failed to upload profile picture" });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const filePath = `/${req.file.filename}`;

    try {
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { profilePicture: filePath },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res.json({
        message: "Profile picture uploaded successfully.",
        filePath,
      });
    } catch (err) {
      console.error("Database Error:", err);
      res
        .status(500)
        .json({ message: "Error updating profile picture", error: err });
    }
  });
};
module.exports = { getProfileData, uploadProfilePicture };
