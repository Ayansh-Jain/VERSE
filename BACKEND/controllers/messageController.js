import Message from "../Models/messageModel.js";
import User from "../Models/userModel.js";

/**
 * Send a message. We lean the result and only select required fields.
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiver, text } = req.body;
    const fileUrl = req.file?.path || null;

    // Create & lean the saved doc in one step (no double‐fetch)
    const saved = await Message.create([{
      sender:   senderId,
      receiver,
      text,
      file:     fileUrl,
      read:     false
    }], { lean: true });
    const msg = saved[0];

    // Build payload
    const payload = {
      _id:       msg._id,
      sender: {
        _id:        senderId,
        username:   req.user.username,
        profilePic: req.user.profilePic,
      },
      receiver,
      text,
      file:      fileUrl,
      read:      false,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    };

    // 1) HTTP response
    res.status(201).json(payload);

    // 2) Notify sockets
    const io = req.app.get("socketio");
    // deliver message
    io.to(receiver).emit("receiveMessage", payload);
    io.to(senderId.toString()).emit("receiveMessage", payload);
    // play a sound on the receiver’s client
    io.to(receiver).emit("playNotification");

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
    const me    = req.user._id.toString();
    const other = req.params.userId;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const skip  = (page - 1) * limit;

    // Lean + project only needed fields
    const msgs = await Message.find({
      $or: [
        { sender: me,    receiver: other },
        { sender: other, receiver: me }
      ]
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .select("_id sender receiver text file read createdAt")
      .lean();

    // Mark incoming as read *in background*—don’t await
    Message.updateMany(
      { sender: other, receiver: me, read: false },
      { $set: { read: true } }
    )
    .then(result => {
      if (result.modifiedCount > 0) {
        const io = req.app.get("socketio");
        io.to(other).emit("messages_read", { by: me, from: other });
      }
    })
    .catch(err => console.error("Auto‐read update failed:", err));

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
    const meId = mongoose.Types.ObjectId(req.user._id);

    const threads = await Message.aggregate([
      // only messages involving me
      { $match: { $or: [{ sender: meId }, { receiver: meId }] } },

      // define the “partner” field
      {
        $project: {
          partner: {
            $cond: [
              { $eq: ["$sender", meId] },
              "$receiver",
              "$sender"
            ]
          },
          text:      1,
          createdAt: 1,
          read:      1,
          sender:    1
        }
      },

      // sort by latest first
      { $sort: { createdAt: -1 } },

      // group by partner
      {
        $group: {
          _id:         "$partner",
          lastMessage: { $first: "$text" },
          lastDate:    { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                    { $eq: ["$sender", "$partner"] }, 
                    { $eq: ["$read", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },

      // lookup user info
      {
        $lookup: {
          from:         "users",
          localField:   "_id",
          foreignField: "_id",
          as:           "partnerInfo"
        }
      },
      { $unwind: "$partnerInfo" },

      // final projection
      {
        $project: {
          _id:         "$partnerInfo._id",
          username:    "$partnerInfo.username",
          profilePic:  "$partnerInfo.profilePic",
          lastMessage: 1,
          lastDate:    1,
          unreadCount: 1
        }
      },

      // sort threads: unread first, then newest
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
    const me    = req.user._id;
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
      message:       "Messages marked read",
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("markConversationRead error:", error);
    res.status(500).json({ message: error.message });
  }
}

