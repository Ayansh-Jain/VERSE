// src/pages/Message.jsx
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { connectSocket, getSocket } from "../socket";
import Modal from "../components/Modal";
import "../styles/Message.css";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const Message = () => {
  const { user, setUser } = useAuth();

  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState(routeUserId || "");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [error, setError] = useState("");
  const [typingIndicator, setTypingIndicator] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState(null);

  const [isMobileView, setIsMobileView] = useState(
    window.innerWidth <= 768
  );
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Sync follow/unfollow
  const handleFollow = async (userIdToFollow) => {
    try {
      const resData = await api.followUser(userIdToFollow);
      const isNowFollowing =
        resData.message === "Followed successfully.";
      const updatedUser = { ...user };
      if (isNowFollowing) {
        if (!updatedUser.following.includes(userIdToFollow)) {
          updatedUser.following.push(userIdToFollow);
        }
      } else {
        updatedUser.following = updatedUser.following.filter(
          (id) => id !== userIdToFollow
        );
      }
      setUser(updatedUser);
      localStorage.setItem(
        "verse_user",
        JSON.stringify(updatedUser)
      );
      setAllUsers((prev) =>
        prev.map((u) =>
          u._id === userIdToFollow ? { ...u } : u
        )
      );
    } catch (e) {
      console.error("Error toggling follow:", e);
    }
  };

  // ─── SOCKET.IO SETUP ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id) return;

    connectSocket();
    const socket = getSocket();
    if (!socket) return;

    socket.emit("joinRoom", user._id);
    socket.emit("getOnlineUsers");

    socket.on("onlineUsers", (list) => setOnlineUsers(list));
    socket.on("user_online", (id) =>
      setOnlineUsers((prev) =>
        prev.includes(id) ? prev : [...prev, id]
      )
    );
    socket.on("user_offline", (id) =>
      setOnlineUsers((prev) => prev.filter((u) => u !== id))
    );

    return () => {
      socket.off("onlineUsers");
      socket.off("user_online");
      socket.off("user_offline");
    };
  }, [user?._id]);

  // ─── LOAD ALL USERS ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const users = await api.getAllUsers();
        setAllUsers(Array.isArray(users) ? users : []);
      } catch (e) {
        console.error("Error loading users:", e);
      }
    })();
  }, []);

  // ─── FILTER & SORT ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allUsers
      .filter(
        (u) =>
          u.username
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) &&
          u._id !== user._id
      )
      .sort((a, b) => {
        const aF = user.following.includes(a._id) ? 0 : 1;
        const bF = user.following.includes(b._id) ? 0 : 1;
        if (aF !== bF) return aF - bF;
        return a.username.localeCompare(b.username);
      });
  }, [allUsers, searchQuery, user.following, user._id]);

  const followedUsers = filtered.filter((u) =>
    user.following.includes(u._id)
  );
  const otherUsers = filtered.filter(
    (u) => !user.following.includes(u._id)
  );

  // ─── SELECT CHAT ─────────────────────────────────────────────────────────────
  const openChat = (uid) => {
    if (uid === user._id) return;
    setSelectedUserId(uid);
    navigate(`/message/${uid}`);
    if (isMobileView) setShowSidebar(false);
  };
  const backToList = () => setShowSidebar(true);

  // ─── FETCH MESSAGES ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      const data = await api.getConversation(selectedUserId);
      setMessages(Array.isArray(data) ? data : []);
      scrollToBottom();
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ─── SOCKET LISTENERS ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceive = (msg) => {
      const sid = msg.sender?._id || msg.sender;
      if (
        sid === selectedUserId ||
        msg.receiver === selectedUserId
      ) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id)
            ? prev
            : [...prev, msg]
        );
        scrollToBottom();
        if (msg.receiver === user._id && !msg.read) {
          socket.emit("markConversationRead", selectedUserId);
        }
      }
    };

    const handleTyping = ({ from }) => {
      if (from === selectedUserId)
        setTypingIndicator("Typing...");
    };
    const handleStop = ({ from }) => {
      if (from === selectedUserId) setTypingIndicator("");
    };

    socket.on("receiveMessage", handleReceive);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStop);

    return () => {
      socket.off("receiveMessage", handleReceive);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStop);
    };
  }, [selectedUserId, user._id]);

  // ─── INPUT HANDLERS ─────────────────────────────────────────────────────────
  const onInput = (e) => {
    setNewMessage(e.target.value);
    const socket = getSocket();
    if (!socket) return;
    socket.emit("typing", { to: selectedUserId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { to: selectedUserId });
    }, 800);
  };

  const onAttach = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Max 5MB");
      return;
    }
    setAttachment(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };
  const cancelAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
  };

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  const onSend = async (e) => {
    e.preventDefault();
    if (!selectedUserId || (!newMessage && !attachment)) return;

    const fd = new FormData();
    fd.append("receiver", selectedUserId);
    fd.append("text", newMessage);
    if (attachment) fd.append("file", attachment);

    try {
      await api.sendMessage(fd);
      setNewMessage("");
      cancelAttachment();
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  // ─── RESIZE HANDLER ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileView(mobile);
      if (!mobile) setShowSidebar(true);
    };
    window.addEventListener("resize", onResize);
    return () =>
      window.removeEventListener("resize", onResize);
  }, []);

  // ─── PROFILE MODAL ──────────────────────────────────────────────────────────
  const openProfileModal = async () => {
    try {
      const u = await api.getUserById(selectedUserId);
      setProfileModalUser(u);
      setShowProfileModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const chatPartner =
    allUsers.find((u) => u._id === selectedUserId) || {};

  return (
    <div className="messages-container">
      {/* Sidebar */}
      <div
        className={
          "threads-sidebar " +
          (isMobileView
            ? showSidebar
              ? "visible"
              : "hidden"
            : "")
        }
      >
        <div className="threads-header">
          <h2>Contacts</h2>
        </div>
        <div className="threads-body">
          <div className="search-bar">
            <input
              className="thread-search"
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {followedUsers.map((u) => (
            <div
              key={u._id}
              className={`thread-item ${
                u._id === selectedUserId ? "active" : ""
              }`}
              onClick={() => openChat(u._id)}
            >
              <div className="thread-info">
                <img
                  src={u.profilePic || "/assets/noprofile.jpg"}
                  alt={u.username}
                  className="thread-avatar"
                />
                <div>
                  <span>{u.username}</span>
                  {onlineUsers.includes(u._id) && (
                    <span className="online-indicator">●</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {otherUsers.length > 0 && (
            <hr className="user-divider" />
          )}

          {otherUsers.map((u) => (
            <div
              key={u._id}
              className={`thread-item ${
                u._id === selectedUserId ? "active" : ""
              }`}
              onClick={() => openChat(u._id)}
            >
              <div className="follower-card-info">
                <img
                  src={u.profilePic || "/assets/noprofile.jpg"}
                  alt={u.username}
                  className="thread-avatar"
                />
                <div className="thread-info">
                  <span>{u.username}</span>
                </div>
              </div>
              <button
                className={`follow-button ${
                  user.following.includes(u._id)
                    ? "following"
                    : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFollow(u._id);
                }}
              >
                {user.following.includes(u._id)
                  ? "Following"
                  : "Follow"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div
        className={
          "conversation-panel " +
          (isMobileView
            ? !showSidebar
              ? "visible"
              : "hidden"
            : "")
        }
      >
        {!selectedUserId ? (
          <div className="no-conversation-selected">
            <h3>Start messaging</h3>
            <p>Select a contact to begin.</p>
          </div>
        ) : (
          <>
            <div className="conversation-header">
              {isMobileView && (
                <button
                  className="back-button"
                  onClick={backToList}
                >
                  ←
                </button>
              )}
              <div
                className="conversation-header-info"
                onClick={openProfileModal}
              >
                <img
                  src={
                    chatPartner.profilePic ||
                    "/assets/noprofile.jpg"
                  }
                  alt={chatPartner.username}
                  className="header-avatar"
                />
                <span className="header-username">
                  {chatPartner.username}
                </span>
              </div>
            </div>

            <div className="messages-list">
              {messages.map((msg) => {
                const me = msg.sender?._id === user._id;
                return (
                  <div
                    key={msg._id}
                    className={`message-item ${
                      me ? "sent" : "received"
                    }`}
                  >
                    {msg.text && <p>{msg.text}</p>}
                    {msg.file && (
                      <img
                        src={msg.file}
                        alt="attachment"
                        className="message-attachment"
                      />
                    )}
                    <div className="message-meta">
                      <span>
                        {new Date(
                          msg.createdAt
                        ).toLocaleTimeString()}
                      </span>
                      {me && (
                        <span className="read-status">
                          {msg.read ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {typingIndicator && (
                <div className="typing-indicator">
                  {typingIndicator}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-form" onSubmit={onSend}>
              <div className="message-input-container">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={onInput}
                />
                <label
                  htmlFor="file-input"
                  className="attachment-button"
                >
                  📎
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={onAttach}
                  style={{ display: "none" }}
                />
              </div>
              {attachmentPreview && (
                <div className="attachment-preview">
                  <img
                    src={attachmentPreview}
                    alt="preview"
                  />
                  <button
                    type="button"
                    className="cancel-attachment"
                    onClick={cancelAttachment}
                  >
                    ✖
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={!newMessage && !attachment}
              >
                Send
              </button>
              {error && <p className="error">{error}</p>}
            </form>
          </>
        )}
      </div>

      {showProfileModal && profileModalUser && (
        <Modal onClose={() => setShowProfileModal(false)}>
          <div className="profile-section-modal">
            {/* ...same modal content as before... */}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Message;
