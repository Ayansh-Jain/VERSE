import Message from "../Models/messageModel.js";
import User from "../Models/userModel.js";

/**
 * Send a message. We lean the result and only select required fields.
 */
export const sendMessage = async (req, res) => {
  try {
    // 1) Extract data
    const senderId = req.user._id;
    const { receiver, text } = req.body;
    const fileUrl = req.file ? req.file.path : null;

    // 2) Create message in one call
    const saved = await Message.create({
      sender: senderId,
      receiver,
      text,
      file: fileUrl,
      read: false,
    });

    // 3) Build the payload with sender info (no DB lookup)
    const payload = {
      _id:       saved._id,
      sender: {
        _id:        senderId,
        username:   req.user.username,
        profilePic: req.user.profilePic,
      },
      receiver,
      text,
      file:      fileUrl,
      read:      false,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };

    // 4) Send HTTP response immediately
    res.status(201).json(payload);

    // 5) Emit over Socket.IO (fire-and-forget)
    const io = req.app.get("socketio");
    io.to(receiver).emit("receiveMessage", payload);
    io.to(senderId.toString()).emit("receiveMessage", payload);

  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: error.message });
  }
};
/**
 * Paginated conversation between me and userId.
 * lean + select for speed.
 */
export const getConversation = async (req, res) => {
  try {
    const me = req.user._id.toString();
    const other = req.params.userId;
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const skip  = (page - 1) * limit;

    const msgs = await Message.find({
      $or: [
        { sender: me,    receiver: other },
        { sender: other, receiver: me }
      ]
    })
      .select("sender receiver text file read createdAt")
      .populate("sender",   "username profilePic")
      .populate("receiver", "username profilePic")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // mark unread incoming as read
    const result = await Message.updateMany(
      { sender: other, receiver: me, read: false },
      { $set: { read: true } }
    );

    if (result.modifiedCount > 0) {
      const io = req.app.get("socketio");
      io.to(other).emit("messages_read", { by: me, from: other });
    }

    res.status(200).json(msgs);
  } catch (error) {
    console.error("getConversation error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * List of threads: one thread per partner.
 * We aggregate to pick the latest message + unread count.
 */
export const getThreads = async (req, res) => {
  try {
    const me = req.user._id.toString();

    // aggregate latest by partner
    const threads = await Message.aggregate([
      { $match: { $or: [{ sender: me }, { receiver: me }] } },
      {
        $project: {
          partner: {
            $cond: [
              { $eq: ["$sender", mongoose.Types.ObjectId(me)] },
              "$receiver",
              "$sender"
            ]
          },
          text:      1,
          createdAt: 1,
          read:      1,
          sender:    1,
          receiver:  1
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$partner",
          lastMessage: { $first: "$text" },
          lastDate:    { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [ { $eq: ["$sender", mongoose.Types.ObjectId(_idAsc = me)] }, { $eq: ["$read", false] } ] },
                1,
                0
              ]
            }
          }
        }
      },
      { $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "partnerInfo"
        }
      },
      { $unwind: "$partnerInfo" },
      { $project: {
          _id:       "$partnerInfo._id",
          username:  "$partnerInfo.username",
          profilePic:"$partnerInfo.profilePic",
          lastMessage: 1,
          lastDate:    1,
          unreadCount: 1
        }
      },
      { $sort: { unreadCount: -1, lastDate: -1 } }
    ]);

    res.status(200).json(threads);
  } catch (error) {
    console.error("getThreads error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mark all messages from a sender as read.
 */
export const markConversationRead = async (req, res) => {
  try {
    const me = req.user._id.toString();
    const other = req.params.userId;

    const result = await Message.updateMany(
      { sender: other, receiver: me, read: false },
      { $set: { read: true } }
    );

    if (result.modifiedCount > 0) {
      const io = req.app.get("socketio");
      io.to(other).emit("messages_read", { by: me, from: other });
    }

    res.status(200).json({
      message: "Messages marked read",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("markConversationRead error:", error);
    res.status(500).json({ message: error.message });
  }
};
