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

  // State for posts (infinite scroll)
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observer = useRef();

  // State for suggested followers
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // State for Follower Profile Modal
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [selectedFollowerProfile, setSelectedFollowerProfile] = useState(null);

  // State for Follower Share Modal
  const [showFollowerShareModal, setShowFollowerShareModal] = useState(false);

  // Utility: Shuffle an array (to randomize feed)
  const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  // Fetch feed posts and randomize them
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const newPosts = await api.getFeed(page, 10);
        if (newPosts.length === 0) {
          setHasMore(false);
        } else {
          const randomizedPosts = shuffle(newPosts);
          setPosts((prev) => [...prev, ...randomizedPosts]);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [page]);

  // Infinite scroll observer for posts
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  // Fetch all users for suggestions and exclude the current user.
  // We do not map extra isFollowing here—use global user.following in render.
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await api.getAllUsers();
        if (Array.isArray(allUsers)) {
          const suggestions = allUsers.filter((u) => u._id !== user._id);
          setUsers(suggestions);
        } else {
          console.error("Unexpected response from getAllUsers:", allUsers);
          setUsers([]);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error.message || error);
        setUsers([]);
        // Optional: Retry after a few seconds if ECONNRESET
        if (error.message && error.message.includes("ECONNRESET")) {
          setTimeout(fetchUsers, 3000); // retry after 3 seconds
        }
      }
    };
    fetchUsers();
  }, [user._id]);
  

  // Filter suggestions based on search query
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler for toggling like on a post
  const handleLike = async (postId) => {
    try {
      const updatedPost = await api.toggleLike(postId);
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p._id === postId
            ? { ...p, likes: updatedPost.likes, postedBy: p.postedBy }
            : p
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  // Handler for following a user from the feed
  const handleFollow = async (userIdToFollow) => {
    try {
      const resData = await api.followUser(userIdToFollow);
      const isNowFollowing = resData.message === "Followed successfully.";
      // Update global current user state and localStorage
      const updatedUser = { ...user };
      if (isNowFollowing) {
        if (!updatedUser.following.includes(userIdToFollow)) {
          updatedUser.following.push(userIdToFollow);
        }
      } else {
        updatedUser.following = updatedUser.following.filter((id) => id !== userIdToFollow);
      }
      setUser(updatedUser);
      localStorage.setItem("user-verse", JSON.stringify(updatedUser));
      // Update suggestions list so the button renders correctly
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userIdToFollow ? { ...u } : u
        )
      );
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  // Handler for clicking a follower card to open their profile modal
  const handleFollowerCardClick = async (followerId) => {
    try {
      const followerData = await api.getUserById(followerId);
      setSelectedFollowerProfile(followerData);
      setShowFollowerModal(true);
    } catch (error) {
      console.error("Error fetching follower profile:", error);
    }
  };

  return (
    <div className="feed-container">
      <section className="feed-section">
        {posts.map((post, index) => (
          <div
            key={`${post._id}-${index}`}
            className="post"
            ref={posts.length === index + 1 ? lastPostRef : null}
          >
            <div className="post-header">
              <div className="post-header1">
              <img
                src={post.postedBy?.profilePic || "/assets/noprofile.jpg"}
                alt="avatar"
                className="post-avatar"
              />
              <span className="post-username">{post.postedBy?.username}</span></div>
              {/* Follow button on post header if not current user */}
              <div>{post.postedBy &&
                post.postedBy._id !== user._id &&
                !user.following.includes(post.postedBy._id) && (
                  <button
                    className="follow-button"
                    onClick={() => handleFollow(post.postedBy._id)}
                  >
                    Follow
                  </button>
                )}</div>
            </div>
            <div className="post-media">
              {post.img && (
                <img src={post.img} alt="post" className="post-image" />
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
            > <div className="follower-card-info">
              <img
                src={u.profilePic || "/assets/noprofile.jpg"}
                alt="avatar"
                className="follower-avatar"
              />
              <span className="follower-username">{u.username}</span></div>
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
                    src={selectedFollowerProfile.profilePic || "/assets/noprofile.jpg"}
                    alt="Profile"
                    className="profile-image-modal"
                  />
                </div>
                <div className="profile-info-modal">
                  <h2 className="username">{selectedFollowerProfile.username}</h2>
                  <div className="stats">
                    <p>
                      <strong>{selectedFollowerProfile.posts?.length || 0}</strong> Posts
                    </p>
                    <p>
                      <strong>{selectedFollowerProfile.followers?.length || 0}</strong> Followers
                    </p>
                    <p>
                      <strong>{selectedFollowerProfile.following?.length || 0}</strong> Following
                    </p>
                  </div>
                </div>
              </div>
              <div className="bio-section-modal">
                <p>
                  <strong>Organization:</strong>{" "}
                  {selectedFollowerProfile.organization || "Not specified."}
                </p>
                <p>
                  <strong>Bio:</strong>{" "}
                  {selectedFollowerProfile.bio || "No bio added."}
                </p>
              </div>
              {/* Profile Actions (Message & Share) placed before posts */}
              <div className="profile-actions-modal">
                <button
                  className="edit-button-modal"
                  onClick={() => navigate(`/message/${selectedFollowerProfile._id}`)}
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
              {/* Follower's Posts Section */}
              <div className="follower-posts-modal">
                <h3>Posts</h3>
                {selectedFollowerProfile.posts && selectedFollowerProfile.posts.length > 0 ? (
                  <div className="posts-grid-modal">
                    {selectedFollowerProfile.posts.map((post, idx) => (
                      <div key={post._id || idx} className="post-minimized-modal">
                        {post.img ? (
                          <img src={post.img} alt="Post thumbnail" className="post-thumbnail-modal" />
                        ) : (
                          <div>{post.text ? post.text.slice(0, 20) + "..." : "No content"}</div>
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
            <button className="edit-button" onClick={() => setShowFollowerShareModal(false)}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Feed;
