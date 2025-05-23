// src/pages/Profile.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Modal from "../components/Modal";
import "../styles/Profile.css";
import { api} from "../api";
import { useAuth } from "../context/AuthContext"; // Import global auth context

const availableSkills = [
  "Photography",
  "Singing",
  "Dancing",
  "Cooking",
  "Shayari",
  "Painting",
  "Rap"
];

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  // Modal states for own profile actions
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [postModalData, setPostModalData] = useState(null);
  // Modal state for viewing a follower's profile
  const [selectedFollowerProfile, setSelectedFollowerProfile] = useState(null);
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [showFollowerShareModal, setShowFollowerShareModal] = useState(false);

  // Form state for own profile modals
  const [newProfilePic, setNewProfilePic] = useState(null);
  const [newBio, setNewBio] = useState("");
  const [newOrganization, setNewOrganization] = useState("");
  const [newSkills, setNewSkills] = useState([]);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  // For Create Post Modal (own profile)
  const [newPostText, setNewPostText] = useState("");
  const [newPostMedia, setNewPostMedia] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileView, setMobileView] = useState("profile"); //
  const toggleMobileView = (view) => {
    setMobileView(view);
  };

  // State for follower search in own profile
  const [followerSearchQuery, setFollowerSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getUserById(userId);
      // Merge isFollowing flag
      if (data.followers && user?.following) {
        data.followers = data.followers.map((f) => ({
          ...f,
          isFollowing: user.following.includes(f._id),
        }));
      }
      setProfile(data);
      setNewBio(data.bio || "");
      setNewOrganization(data.organization || "");
      setNewSkills(data.skills || []);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err.message);
      if (err.message.includes("401")) {
        navigate("/signin");
      }
    }
  }, [userId, user, navigate]);

  // Fetch users for suggested followers
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

  // 2) Initial load & whenever userId or user context changes
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // 3) Refresh when scrolled to top (debounced)
 
  const filteredFollowers = useMemo(() => {
    return (profile?.followers || []).filter((follower) =>
      (follower.username || "")
        .toLowerCase()
        .includes(followerSearchQuery.toLowerCase())
    );
  }, [profile, followerSearchQuery]);
  
  const filteredSuggested = useMemo(
    () =>
      users.filter((u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [users, searchQuery]
  );

  if (error) return <p>Error: {error}</p>;
  if (!profile) return <p>Loading...</p>;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (newProfilePic) formData.append("profilePic", newProfilePic);
    formData.append("bio", newBio);
    formData.append("organization", newOrganization);
    formData.append("skills", JSON.stringify(newSkills));
    try {
      const updatedProfile = await api.updateProfile(userId, formData);
      setProfile(updatedProfile);
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError(`Error updating profile: ${error.message}`);
    }
  };

 const handleCreatePostSubmit = async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  setIsSubmitting(true);
  setError(null);

  const formData = new FormData();
  formData.append("text", newPostText);
  if (newPostMedia) formData.append("img", newPostMedia);

  try {
    // 1) Use your api helper (handles headers, base URL, JSON parsing)
    const newPost = await api.createPost(formData);

    // 2) Update state
    setProfile((prev) => ({
      ...prev,
      posts: [newPost, ...(prev.posts || [])],
    }));

    // 3) Reset form
    setNewPostText("");
    setNewPostMedia(null);
    setShowCreatePostModal(false);

    // 4) Navigate if needed
    navigate(`/feed/${userId}`);
  } catch (err) {
    console.error("Error creating post:", err);
    setError(`Error creating post: ${err.message}`);
  } finally {
    setIsSubmitting(false);
  }
};

  // Updated follow handler that uses AuthContext to update the current user's following list
  const handleFollowToggle = async (followerId) => {
    try {
      const resData = await api.followUser(followerId);
      const isNowFollowing = resData.message === "Followed successfully.";
      const updatedUser = { ...user };
      if (isNowFollowing) {
        if (!updatedUser.following.includes(followerId)) {
          updatedUser.following.push(followerId);
        }
      } else {
        updatedUser.following = updatedUser.following.filter(
          (id) => id !== followerId
        );
      }
      setUser(updatedUser);
      localStorage.setItem("user-verse", JSON.stringify(updatedUser));
      setProfile((prev) => ({
        ...prev,
        followers: prev.followers.map((follower) =>
          follower._id === followerId
            ? { ...follower, isFollowing: isNowFollowing }
            : follower
        ),
      }));
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  // Modified handleSkillToggle: convert the selected skill to lowercase before adding/removing
  const handleSkillToggle = (skill) => {
    const lowerSkill = skill.toLowerCase();
    if (newSkills.includes(lowerSkill)) {
      setNewSkills(newSkills.filter((s) => s !== lowerSkill));
    } else {
      setNewSkills([...newSkills, lowerSkill]);
    }
  };

  const toggleSkillsDropdown = () => {
    setShowSkillsDropdown(!showSkillsDropdown);
  };

  // New handler: Open follower profile modal by fetching full data for that follower
  const handleFollowerCardClick = async (followerId) => {
    try {
      const data = await api.getUserById(followerId);
      setSelectedFollowerProfile(data);
      setShowFollowerModal(true);
    } catch (error) {
      console.error("Error fetching follower profile:", error);
    }
  };
  const isVideo = (url) => /\.(mp4|webm|ogg)$/i.test(url);
  const openPostModal = (post) => setPostModalData(post);
  const closePostModal = () => setPostModalData(null);
  return (
    <div className="profile-container">
      {/* Own Profile Section (Left) */}
      <div
        className={`profile-section ${
          mobileView === "followers" || mobileView === "following" ? "mobile-hidden" : ""
        }`}
      >
        <div className="profile-header">
          <div className="profile-pic">
            <img
              src={profile.profilePic || "/assets/noprofile.jpg"}
              alt="Profile"
              className="profile-image"
            />
          </div>
          <div className="profile-info">
            <div className="profile-info-1">
              <h2 className="username">{profile.username}</h2>
              <div className="stats">
                <p>
                  <strong>{profile.posts?.length || 0}</strong> Posts
                </p>
                <p
                  className="stat-clickable"
                  onClick={() => toggleMobileView("followers")}
                >
                  <strong>{profile.followers?.length || 0}</strong> Followers
                </p>
                <p
                  className="stat-clickable"
                  onClick={() => toggleMobileView("following")}
                >
                  <strong>{profile.following?.length || 0}</strong> Following
                </p>
              </div>
            </div>
          </div>
          <div className="profile-info-2">
            <div className="profile-top">
              <div className="verse-points">
                <img
                  src="/assets/coin_1369860.png"
                  alt="Coin"
                  className="coin-icon"
                />
                <span>{profile.versePoints || 50}</span>
              </div>
              <button
                className="create-post-button"
                onClick={() => setShowCreatePostModal(true)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="bio-section">
          {profile.skills && profile.skills.length > 0 && (
            <div className="skills-tags">
              {profile.skills.map((skill, index) => (
                <span key={index} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          )}
          <p>{profile.organization || "Not specified."}</p>
          <p>{profile.bio || "No bio added."}</p>
        </div>

        <div className="profile-actions">
          <button
            className="edit-button"
            onClick={() => setShowEditModal(true)}
          >
            Edit Profile
          </button>
          <button
            className="edit-button"
            onClick={() => setShowShareModal(true)}
          >
            Share Profile
          </button>
        </div>

        <div className="posts-section">
          <h3>Your Posts</h3>
          {profile.posts?.length > 0 ? (
            <div className="posts-grid">
              {profile.posts.map((post, i) => (
                <div key={`${post._id}-${i}`} className="post-minimized" onClick={() => openPostModal(post)}>
                  {post.img ? (
                    isVideo(post.img) ? (
                      <video src={post.img} preload="metadata" className="post-thumbnail"/>
                    ) : (
                      <img src={post.img} alt="Post thumbnail" className="post-thumbnail" />
                    )
                  ) : (
                    <div className="post-no-image">
                      {post.text?.slice(0, 20) || "No content"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No posts yet.</p>
          )}
        </div>
      </div>
      {/* Followers Panel (Right) */}
      <div
        className={`followers-panel ${
          mobileView === "followers" ? "" : "mobile-hidden"
        }`}
      >
        <div className="followers-header">
          <div className="mobile-back">
            <button onClick={() => toggleMobileView("profile")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#ffffff"
              >
                <path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z" />
              </svg>
            </button>
            <h2>Followers</h2>
          </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search followers..."
              value={followerSearchQuery}
              onChange={(e) => setFollowerSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="followers-list">
          {filteredFollowers.length > 0 ? (
            filteredFollowers.map((follower, index) => (
              <div
                key={`follower-${follower._id || index}`}
                className="follower-card"
                onClick={() => handleFollowerCardClick(follower._id)}
              >
                <div className="profile-follow-card">
                  <img
                    src={follower.profilePic || "/assets/noprofile.jpg"}
                    alt="avatar"
                    className="follower-avatar"
                  />
                  <span className="follower-username">{follower.username}</span>
                </div>
                <div>
                  <button
                    className={`follow-button ${
                      user.following.includes(follower._id) ? "following" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowToggle(follower._id);
                    }}
                  >
                    {follower.isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No followers yet.</p>
          )}
        </div>
      </div>

      {/* Suggested Followers Panel - Visible when clicking "Following" in mobile */}
      <div
        className={`suggested-followers-panel ${
          mobileView === "following" ? "mobile-visible" : ""
        }`}
      >
        <div className="followers-header">
          <div className="mobile-back">
            <button onClick={() => toggleMobileView("profile")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#ffffff"
              >
                <path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z" />
              </svg>
            </button>
            <h2>Discover</h2>
          </div>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="suggested-list">
          {filteredSuggested.length > 0 ? (
            filteredSuggested.map((u) => (
              <div
                key={u._id}
                className="follower-card"
                onClick={() => handleFollowerCardClick(u._id)}
              >
                <div className="profile-follow-card">
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
                    handleFollowToggle(u._id);
                  }}
                >
                  {user.following.includes(u._id) ? "Following" : "Follow"}
                </button>
              </div>
            ))
          ) : (
            <p>No suggestions available.</p>
          )}
        </div>
      </div>


      {/* Modals */}

      {/* Edit Profile Modal */}
         {/* Post View Modal */}
         {postModalData && (
        <Modal onClose={closePostModal}>
          <div className="post-view-modal">
            {postModalData.img && isVideo(postModalData.img) ? (
              <video
                src={postModalData.img}
                controls
                autoPlay
                className="post-view-video"
              />
            ) : postModalData.img ? (
              <img
                src={postModalData.img}
                alt="Post"
                className="post-view-image"
              />
            ) : null}
            {postModalData.text && <p className="post-view-text">{postModalData.text}</p>}
          </div>
        </Modal>
      )}
      {showEditModal && (
  <Modal onClose={() => setShowEditModal(false)}>
    <h2>Edit Profile</h2>

    <form onSubmit={handleUpdateProfile} className="edit-profile-form">
      <label htmlFor="profilePic">Profile Picture:</label>
      <input
        id="profilePic"
        name="profilePic"
        type="file"
        accept="image/*"
        onChange={(e) => setNewProfilePic(e.target.files[0])}
      />

      <label htmlFor="bio">Bio:</label>
      <textarea
        id="bio"
        name="bio"
        value={newBio}
        onChange={(e) => setNewBio(e.target.value)}
        placeholder="Tell us about yourself..."
      />

      <label htmlFor="organization">Organization:</label>
      <input
        id="organization"
        name="organization"
        type="text"
        value={newOrganization}
        onChange={(e) => setNewOrganization(e.target.value)}
        placeholder="Your organization..."
      />
      <div className="skills-dropdown-container">
        <button
          type="button"
          className="dropdown-toggle-button"
          onClick={toggleSkillsDropdown}
        >
          {newSkills.length > 0 ? "Edit Skills" : "Select Skills"}
        </button>

        {showSkillsDropdown && (
          <div className="skills-dropdown">
            <input
              type="text"
              placeholder="Search skills..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
            />

            <div className="skills-options">
              {availableSkills
                .filter((skill) =>
                  skill.toLowerCase().includes(skillInput.toLowerCase())
                )
                .map((skill) => (
                  <div key={skill} className="skill-option">
                    <input
                      type="checkbox"
                      id={`skill-${skill}`}
                      checked={newSkills.includes(skill.toLowerCase())}
                      onChange={() => handleSkillToggle(skill)}
                    />
                    <label htmlFor={`skill-${skill}`}>{skill}</label>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <button type="submit" className="edit-button">
          Save
        </button>
        <button
          type="button"
          className="edit-button"
          onClick={() => setShowEditModal(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  </Modal>
)}


      {/* Create Post Modal */}
      {showCreatePostModal && (
  <Modal onClose={() => setShowCreatePostModal(false)}>
    <h2>Create New Post</h2>
    <form onSubmit={handleCreatePostSubmit} className="create-post-form">
      <label htmlFor="caption">Caption:</label>
      <textarea
        id="caption"
        value={newPostText}
        onChange={(e) => setNewPostText(e.target.value)}
        placeholder="Write your caption..."
        required
      />

      <label htmlFor="postImage">Upload media:</label>
      <input
        type="file"
        id="postImage"
        accept="image/*,video/*"
        onChange={(e) => setNewPostMedia(e.target.files[0])}
        required
      />

      <button type="submit" disabled={isSubmitting} className="create-post-submit">
        {isSubmitting ? "Posting..." : "Post"}
      </button>
    </form>
  </Modal>
)}


      {/* Share Profile Modal */}
      {showShareModal && (
        <Modal onClose={() => setShowShareModal(false)}>
          <h3>Share Your Profile</h3>
          <p>Scan the QR code to view this profile:</p>
          <QRCodeCanvas
            value={`${window.location.origin}/profile/${userId}`}
            size={200}
          />
          <div className="modal-actions">
            <button
              className="edit-button"
              onClick={() => setShowShareModal(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

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
                  {selectedFollowerProfile.organization || ""}
                </p>
                <p>{selectedFollowerProfile.bio || ""}</p>
              </div>
              {/* Profile Actions (Message & Share) placed before posts */}
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
              {/* Follower's Posts Section now appears below the buttons */}
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
                          <img
                            src={post.img}
                            alt="Post thumbnail"
                            className="post-thumbnail-modal"
                          />
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

export default Profile;
