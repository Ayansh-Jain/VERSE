// src/pages/Feed.jsx
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import Modal from "../components/Modal";
import { QRCodeCanvas } from "qrcode.react";
import "../styles/Feed.css";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const Feed = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  // Posts state for infinite scroll
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observer = useRef();

  // Suggestions state
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Follower Modals
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [selectedFollowerProfile, setSelectedFollowerProfile] = useState(null);
  const [showFollowerShareModal, setShowFollowerShareModal] = useState(false);

  // Shuffle utility
  const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Detect video by extension
  const isVideo = (url) => /\.(mp4|webm|ogg)$/i.test(url);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const newPosts = await api.getFeed(page, 10);
        if (newPosts.length === 0) {
          setHasMore(false);
        } else {
          setPosts((prev) => [
            ...prev,
            ...shuffle(newPosts),
          ]);
        }
      } catch (err) {
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [page]);

  // Infinite scroll
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  // Fetch suggested users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const all = await api.getAllUsers();
        setUsers(Array.isArray(all) ? all.filter((u) => u._id !== user._id) : []);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setUsers([]);
      }
    };
    fetchUsers();
  }, [user._id]);

  // Filter suggestions
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Like handler
  const handleLike = async (postId) => {
    try {
      const updated = await api.toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId ? { ...p, likes: updated.likes } : p
        )
      );
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  // Follow handler
  const handleFollow = async (uid) => {
    try {
      const res = await api.followUser(uid);
      const nowFollowing = res.message === "Followed successfully.";
      const updatedUser = { ...user };
      if (nowFollowing) {
        updatedUser.following.push(uid);
      } else {
        updatedUser.following = updatedUser.following.filter((id) => id !== uid);
      }
      setUser(updatedUser);
      localStorage.setItem("user-verse", JSON.stringify(updatedUser));
      setUsers((prev) =>
        prev.map((u) =>
          u._id === uid ? u : u
        )
      );
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  // Open follower profile modal
  const handleFollowerCardClick = async (fid) => {
    try {
      const data = await api.getUserById(fid);
      setSelectedFollowerProfile(data);
      setShowFollowerModal(true);
    } catch (err) {
      console.error("Error fetching follower profile:", err);
    }
  };

  return (
    <div className="feed-container">
      <section className="feed-section">
        {posts.map((post, idx) => (
          <div
            key={`${post._id}-${idx}`}
            className="post"
            ref={idx === posts.length - 1 ? lastPostRef : null}
          >
            <div className="post-header">
              <div className="post-header1">
                <img
                  src={post.postedBy?.profilePic || "/assets/noprofile.jpg"}
                  alt="avatar"
                  className="post-avatar"
                />
                <span className="post-username">
                  {post.postedBy?.username}
                </span>
              </div>
              {post.postedBy?._id !== user._id &&
                !user.following.includes(post.postedBy._id) && (
                  <button
                    className="follow-button"
                    onClick={() => handleFollow(post.postedBy._id)}
                  >
                    Follow
                  </button>
                )}
            </div>
            <div className="post-media">
              {post.img && (
                isVideo(post.img) ? (
                  <video src={post.img} controls className="post-video" />
                ) : (
                  <img
                    src={post.img}
                    alt="post"
                    className="post-image"
                  />
                )
              )}
            </div>
            <div className="post-actions">
              <button
                className={`like-button ${
                  post.likes.includes(user._id) ? "liked" : ""
                }`}
                onClick={() => handleLike(post._id)}
              >
                ❤️ {post.likes.length}
              </button>
            </div>
            <div className="post-caption">{post.text}</div>
          </div>
        ))}
        {loading && <p>Loading...</p>}
      </section>

      <section className="suggested-followers">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="suggested-list">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className="follower-card"
              onClick={() => handleFollowerCardClick(u._id)}
            >
              <div className="follower-card-info">
                <img
                  src={u.profilePic || "/assets/noprofile.jpg"}
                  alt="avatar"
                  className="follower-avatar"
                />
                <span className="follower-username">{u.username}</span>
              </div>
              <button
                className={`follow-button ${
                  user.following.includes(u._id) ? "following" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFollow(u._id);
                }}
              >
                {user.following.includes(u._id) ? "Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Follower Profile Modal */}
      {showFollowerModal && selectedFollowerProfile && (
        <Modal onClose={() => setShowFollowerModal(false)}>
          <div className="profile-section-modal">
            <div className="scrollable-content-modal">
              <div className="profile-header-modal">
                <div className="profile-pic-modal">
                  <img
                    src={
                      selectedFollowerProfile.profilePic ||
                      "/assets/noprofile.jpg"
                    }
                    alt="Profile"
                    className="profile-image-modal"
                  />
                </div>
                <div className="profile-info-modal">
                  <h2 className="username">
                    {selectedFollowerProfile.username}
                  </h2>
                  <div className="stats">
                    <p>
                      <strong>
                        {selectedFollowerProfile.posts?.length || 0}
                      </strong>{" "}
                      Posts
                    </p>
                    <p>
                      <strong>
                        {selectedFollowerProfile.followers?.length || 0}
                      </strong>{" "}
                      Followers
                    </p>
                    <p>
                      <strong>
                        {selectedFollowerProfile.following?.length || 0}
                      </strong>{" "}
                      Following
                    </p>
                  </div>
                </div>
              </div>
              <div className="bio-section-modal">
                <p>
                  <strong>Organization:</strong>{" "}
                  {selectedFollowerProfile.organization ||
                    "Not specified."}
                </p>
                <p>
                  <strong>Bio:</strong>{" "}
                  {selectedFollowerProfile.bio || "No bio added."}
                </p>
              </div>
              <div className="profile-actions-modal">
                <button
                  className="edit-button-modal"
                  onClick={() =>
                    navigate(`/message/${selectedFollowerProfile._id}`)
                  }
                >
                  Message
                </button>
                <button
                  className="edit-button-modal"
                  onClick={() => setShowFollowerShareModal(true)}
                >
                  Share Profile
                </button>
              </div>
              <div className="follower-posts-modal">
                <h3>Posts</h3>
                {selectedFollowerProfile.posts &&
                selectedFollowerProfile.posts.length > 0 ? (
                  <div className="posts-grid-modal">
                    {selectedFollowerProfile.posts.map((post, idx) => (
                      <div
                        key={post._id || idx}
                        className="post-minimized-modal"
                      >
                        {post.img ? (
                          isVideo(post.img) ? (
                            <video
                              src={post.img}
                              controls
                              className="post-thumbnail-modal"
                            />
                          ) : (
                            <img
                              src={post.img}
                              alt="Post thumbnail"
                              className="post-thumbnail-modal"
                            />
                          )
                        ) : (
                          <div>
                            {post.text
                              ? post.text.slice(0, 20) + "..."
                              : "No content"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No posts available</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Follower Share Modal */}
      {showFollowerShareModal && selectedFollowerProfile && (
        <Modal onClose={() => setShowFollowerShareModal(false)}>
          <h3>Share {selectedFollowerProfile.username}&apos;s Profile</h3>
          <p>Scan the QR code to view this profile:</p>
          <QRCodeCanvas
            value={`${window.location.origin}/profile/${selectedFollowerProfile._id}`}
            size={200}
          />
          <div className="modal-actions">
            <button
              className="edit-button"
              onClick={() => setShowFollowerShareModal(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Feed;
