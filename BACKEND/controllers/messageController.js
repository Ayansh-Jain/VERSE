// controllers/messageController.js
import Message from "../Models/messageModel.js";
import User from "../Models/userModel.js";

/**
 * Send a new message.
 * If a file was uploaded (image/video), its Cloudinary URL is in req.file.path.
 */
export const sendMessage = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const { receiver, text } = req.body;
    // Use Cloudinary URL if file was uploaded
    const fileUrl = req.file ? req.file.path : null;

    const newMessage = new Message({
      sender:  req.user._id,
      receiver,
      text,
      file: fileUrl,
      read: false,
    });
    await newMessage.save();

    // Populate sender's username & profilePic
    await newMessage.populate("sender", "username profilePic");

    // Emit the message to both sender and receiver
    const io = req.app.get("socketio");
    io.to(receiver).emit("receiveMessage", newMessage);
    io.to(req.user._id.toString()).emit("receiveMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get the conversation between the current user and another user.
 * Marks any unread incoming messages as read.
 */
export const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = req.user._id.toString();

    const msgs = await Message.find({
      $or: [
        { sender:  me, receiver: userId },
        { sender:  userId, receiver: me },
      ],
    })
      .populate("sender",   "username profilePic")
      .populate("receiver", "username profilePic")
      .sort({ createdAt: 1 });

    // Mark unread incoming messages as read
    const unread = await Message.updateMany(
      { sender: userId, receiver: me, read: false },
      { $set: { read: true } }
    );

    if (unread.nModified > 0 || unread.modifiedCount > 0) {
      const io = req.app.get("socketio");
      io.to(userId).emit("messages_read", { by: me, from: userId });
    }

    res.status(200).json(msgs);
  } catch (error) {
    console.error("getConversation error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get list of conversation threads (one per partner),
 * including the latest message and unread count.
 */
export const getThreads = async (req, res) => {
  try {
    const me = req.user._id.toString();

    const allMsgs = await Message.find({
      $or: [{ sender: me }, { receiver: me }],
    })
      .populate("sender",   "username profilePic")
      .populate("receiver", "username profilePic")
      .sort({ updatedAt: -1 });

    // Build map of partnerId → thread info
    const threadsMap = new Map();
    allMsgs.forEach((msg) => {
      const partner =
        msg.sender._id.toString() === me ? msg.receiver : msg.sender;

      if (!threadsMap.has(partner._id.toString())) {
        let lastMessage = msg.text || "(attachment)";
        if (lastMessage.length > 25) {
          lastMessage = lastMessage.slice(0, 25) + "...";
        }
        threadsMap.set(partner._id.toString(), {
          _id:       partner._id,
          username:  partner.username,
          profilePic: partner.profilePic,
          lastMessage,
          updatedAt: msg.updatedAt,
        });
      }
    });

    // Add unread counts
    const threadEntries = await Promise.all(
      Array.from(threadsMap.values()).map(async (thread) => {
        const count = await Message.countDocuments({
          sender: thread._id,
          receiver: me,
          read: false,
        });
        return { ...thread, unreadCount: count };
      })
    );

    // Sort: unread first, then by most recent
    threadEntries.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.status(200).json(threadEntries);
  } catch (error) {
    console.error("getThreads error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mark all messages from a specific sender as read.
 */
export const markConversationRead = async (req, res) => {
  try {
    const me = req.user._id.toString();
    const { userId } = req.params;

    const result = await Message.updateMany(
      { sender: userId, receiver: me, read: false },
      { $set: { read: true } }
    );

    if (result.nModified > 0 || result.modifiedCount > 0) {
      const io = req.app.get("socketio");
      io.to(userId).emit("messages_read", { by: me, from: userId });
    }

    res.status(200).json({
      message: "Messages marked as read",
      modifiedCount: result.nModified || result.modifiedCount,
    });
  } catch (error) {
    console.error("markConversationRead error:", error);
    res.status(500).json({ message: error.message });
  }
};
