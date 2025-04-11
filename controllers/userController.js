const User = require("../models/User");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const searchUser = async (req, res) => {
  try {
    const { keyword } = req.query;
    const currentUserId = req.user.userId;

    if (!keyword) {
      return res.status(400).json({ message: "Search keyword is required." });
    }

    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: keyword, $options: "i" } },
            { fullname: { $regex: keyword, $options: "i" } },
          ],
        },
        { _id: { $ne: currentUserId } },
      ],
    }).select("username fullname profilePicture");

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    res.json({ message: "Users found.", users });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Error searching users.", error });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "fullname profilePicture isOnline")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    const formattedConversations = conversations.map((conversation) => {
      const opponent = conversation.participants.find(
        (p) => p._id.toString() !== userId
      );

      return {
        _id: conversation._id,
        recipient: opponent,
        lastMessage: conversation.lastMessage,
        updatedAt: conversation.updatedAt,
        createdAt: conversation.createdAt,
      };
    });

    res.status(200).json(formattedConversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserProfileById = async (req, res) => {
  const { userId } = req.params;

  try {
    // Retrieve the user's fullname and profile picture
    const user = await User.findById(userId).select("fullname isOnline");

    // Check if user exists
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        fullname: user.fullname,
        isOnline: user.isOnline,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getMessagesByUserId = async (req, res) => {
  const { recipientId } = req.params;
  const currentUserId = req.user.userId;

  try {
    // Check if a conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, recipientId] },
    });

    // If conversation not found, create a new one
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, recipientId],
        createdAt: new Date(),
      });
    }

    // Retrieve messages if conversation exists
    const messages = await Message.find({
      conversationId: conversation._id,
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  searchUser,
  getUserConversations,
  getUserProfileById,
  getMessagesByUserId,
};
