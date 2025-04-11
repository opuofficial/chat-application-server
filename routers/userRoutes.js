const express = require("express");
const router = express.Router();
const {
  searchUser,
  getUserConversations,
  getUserProfileById,
  getMessagesByUserId,
} = require("../controllers/userController");
const { verifyToken } = require("../middlewares/verifyToken");

router.get("/search", verifyToken, searchUser);
router.get("/conversations", verifyToken, getUserConversations);
router.get("/profile/:userId", verifyToken, getUserProfileById);
router.get("/messages/:recipientId", verifyToken, getMessagesByUserId);

module.exports = router;
