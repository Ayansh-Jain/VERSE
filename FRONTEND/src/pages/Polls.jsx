//src/pages/Polls.jsx
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import "../styles/Polls.css";
import { api } from "../api";

// Define available skill options for the drop-down
const skillOptions = [
  "Photography",
  "Singing",
  "Dancing",
  "Painting",
  "Cooking",
  "Travel"
];

// Define skills that require video submissions (use lowercase for comparison)
const videoSkills = ["singing", "dancing", "performance"];

const Polls = () => {
  // pollsData: active (matched) and pending (unmatched) challenges
  const [pollsData, setPollsData] = useState({ active: [], pending: [], past: [] });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal states
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [showPastPolls, setShowPastPolls] = useState(false);

  // For the challenge creation form:
  // newPollCategory holds the selected skill.
  const [newPollCategory, setNewPollCategory] = useState(skillOptions[0]);
  // newChallengerSubmission holds the file input (image or video)
  const [newChallengerSubmission, setNewChallengerSubmission] = useState(null);
  // challengeResponseMessage holds the response message from the API
  const [challengeResponseMessage, setChallengeResponseMessage] = useState("");

  // For carousel: show one active challenge at a time
  const [activePollIndex, setActivePollIndex] = useState(0);

  // Get the current user from localStorage (ensure your login updates this as needed)
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user-verse")) || {}
  );
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [versePoints, setVersePoints] = useState(0);
  
  // Track which polls the user has voted on
  const [userVotedPolls, setUserVotedPolls] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const me = await api.getCurrentUser();
        setVersePoints(me.versePoints || 0);
      } catch (e) {
        console.error("Could not load versePoints:", e);
      }
    })();
  }, []);

  // Function to handle file input changes
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // If the selected skill requires a video submission, validate accordingly
    if (videoSkills.includes(newPollCategory.trim().toLowerCase())) {
      if (!file.type.startsWith("video/")) {
        setError("For this challenge, please upload a video file.");
        e.target.value = "";
        return;
      }
      // Validate video duration (max 1 minute)
      const videoElement = document.createElement("video");
      videoElement.preload = "metadata";
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 60) {
          setError("Video must be 1 minute or less.");
          e.target.value = "";
        } else {
          setNewChallengerSubmission(file);
          setError(null);
        }
      };
      videoElement.src = URL.createObjectURL(file);
    } else {
      setNewChallengerSubmission(file);
      setError(null);
    }
  };

  // Fetch challenges on mount
  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const data = await api.getPolls();
        
        // Initialize with default empty arrays if data properties are undefined
        const safeData = {
          active: data.active || [],
          pending: data.pending || [],
          past: data.past || []
        };
        
        setPollsData(safeData);
        setActivePollIndex(0);
        
        // Set attemptsLeft from API response if available
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        
        // Initialize the user voted polls object
        const votedPolls = {};
        if (safeData.active && currentUser && currentUser._id) {
          safeData.active.forEach(poll => {
            const hasUserVoted = poll.votes && poll.votes.some(vote => 
              vote.voter === currentUser._id
            );
            if (hasUserVoted) {
              votedPolls[poll._id] = true;
            }
          });
        }
        setUserVotedPolls(votedPolls);
      } catch (err) {
        console.error("Error fetching challenges:", err);
        setError(err.message || "Failed to fetch challenges");
      }
    };
    fetchPolls();
  }, []);
  
  // Fetch user data and attempts left
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await api.getCurrentUser();
        setVersePoints(userData.versePoints || 0);
        setCurrentUser(userData);
        
        // Update localStorage with fresh user data
        localStorage.setItem("user-verse", JSON.stringify(userData));
        
        // Calculate attempts left
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const data = await api.getPolls();
        
        // Ensure data is properly structured
        const pendingPolls = data.pending || [];
        const activePolls = data.active || [];
        
        // Count challenges where current user is the challenger created today
        const userChallengesToday = activePolls
          .concat(pendingPolls)
          .filter(
            (poll) =>
              poll.challenger &&
              poll.challenger._id === userData._id &&
              new Date(poll.createdAt) >= startOfDay
          ).length;
        
        setAttemptsLeft(3 - userChallengesToday);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    
    fetchUserData();
  }, []);

  // Continuous polling to refresh the challenge list (every 5 seconds)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        if (!currentUser || !currentUser._id) return;
        
        const data = await api.getPolls();
        
        // Ensure data is properly structured
        const safeData = {
          active: data.active || [],
          pending: data.pending || [],
          past: data.past || []
        };
        
        // Update attemptsLeft from API response if available
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        
        setPollsData(() => {
          return {
            active: safeData.active,
            pending: safeData.pending, 
            past: safeData.past
          };
        });
        
        // Update voted polls tracking
        setUserVotedPolls(prev => {
          const newVotedPolls = {...prev};
          if (safeData.active) {
            safeData.active.forEach(poll => {
              if (poll.votes && poll.votes.some(vote => vote.voter === currentUser._id)) {
                newVotedPolls[poll._id] = true;
              }
            });
          }
          return newVotedPolls;
        });
        
        // Refresh user data including versePoints
        const userData = await api.getCurrentUser();
        setVersePoints(userData.versePoints || 0);
      } catch (err) {
        console.error("Error polling for challenges:", err);
      }
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [currentUser]);

  // Handler for clicking Create Poll button
  const handleCreatePollClick = () => {
    if (attemptsLeft <= 0) {
      setError("You've reached your daily limit of 3 polls.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (versePoints < 10) {
      setError("You need at least 10 versePoints to create a poll.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setChallengeResponseMessage(""); // Clear previous message
    setShowCreatePollModal(true);
  };

  // Create Challenge handler
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!newPollCategory) {
      setError("Skill selection is required.");
      return;
    }
    
    if (versePoints < 10) {
      setError("You need at least 10 versePoints to create a poll.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null); // Clear any existing errors
    
    try {
      const formData = new FormData();
      formData.append("category", newPollCategory);
      if (newChallengerSubmission) {
        formData.append("challengerSubmission", newChallengerSubmission);
      }
      
      const response = await api.createPoll(formData);
      console.log("Create Challenge response:", response);
      
      // Update versePoints directly from the API response if available
      if (response.versePoints !== undefined) {
        setVersePoints(response.versePoints);
      } else {
        // Otherwise get from user profile
        const userData = await api.getCurrentUser();
        setVersePoints(userData.versePoints);
        localStorage.setItem("user-verse", JSON.stringify(userData));
        setCurrentUser(userData);
      }
      
      // Update attempts left from the response
      if (response.attemptsLeft !== undefined) {
        setAttemptsLeft(response.attemptsLeft);
      }
      
      setChallengeResponseMessage(
        response.message + " Attempts left: " + (response.attemptsLeft !== undefined ? response.attemptsLeft : attemptsLeft)
      );
      
      // Refetch challenges after creation
      const data = await api.getPolls();
      setPollsData(() => ({
        active: data.active || [],
        pending: data.pending || [],
        past: data.past || [] 
      }));
      setActivePollIndex(0);
      
      // Reset form fields
      setNewChallengerSubmission(null);
      setNewPollCategory(skillOptions[0]);
      
      // Wait 5 seconds, then close the modal and clear the response message
      setTimeout(() => {
        setChallengeResponseMessage("");
        setShowCreatePollModal(false);
      }, 5000);
    } catch (error) {
      console.error("Error creating challenge:", error);
      setError(error.message || "Failed to create challenge");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vote handler - now automatically advances to next poll after voting
  const handleVote = async (pollId, option) => {
    // Prevent voting if user already voted on this poll
    if (userVotedPolls[pollId]) {
      setError("You've already voted on this poll!");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      const updatedPoll = await api.votePoll(pollId, option);
      
      // Update user voted polls tracking
      setUserVotedPolls(prev => ({
        ...prev,
        [pollId]: true
      }));
      
      // First update the poll data with new votes
      setPollsData((prev) => {
        const newActive = (prev.active || []).map((poll) =>
          poll._id === pollId ? { ...poll, votes: updatedPoll.votes } : poll
        );
        return { ...prev, active: newActive };
      });
      
      // Show a temporary success message
      setSuccessMessage("Your vote has been recorded! Earned 1 versePoint.");
      setTimeout(() => setSuccessMessage(null), 1500);
      
      // After a short delay, advance to the next poll if available
      setTimeout(() => {
        // Recalculate active challenges in case they've changed
        const activeChallenges = (pollsData.active || []).filter(
          (poll) => poll.status === "open" || poll.status === "closed"
        );
        
        if (activeChallenges.length > activePollIndex + 1) {
          // Move to next poll
          setActivePollIndex(prevIndex => prevIndex + 1);
        } else if (activeChallenges.length > 1) {
          // If we're at the end, loop back to the first poll
          setActivePollIndex(0);
        }
        // If there's only one poll, we stay on it but removed feedback message
      }, 1000); // Wait 1 second before advancing
      
      // Refresh user data to get updated versePoints (for voting)
      const userData = await api.getCurrentUser();
      setVersePoints(userData.versePoints);
      
    } catch (err) {
      console.error("Error voting on challenge:", err);
      setError(err.message || "Failed to vote");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Toggle past polls visibility
  const togglePastPolls = () => {
    setShowPastPolls(!showPastPolls);
  };

  // Active challenges: include those with status "open" or "closed" (matched challenges)
  // that are less than 24 hours old
  const activeChallenges = (pollsData.active || []).filter(
    (poll) => poll.status === "open" || poll.status === "closed"
  );

  // Past challenges: include closed challenges older than 24 hours
  // and all pending challenges the user has created
  const pastChallenges = pollsData.past || [];

  const activePoll = activeChallenges.length > 0 ? activeChallenges[activePollIndex] : null;

  // Check if user has voted on active poll
  const hasVotedOnActivePoll = activePoll && userVotedPolls[activePoll._id];

  return (
    <div className="polls-container">
      <div className="polls-header">
        <h1>Polls</h1>
        <div className="header-buttons">
          <div className="verse-points">
            <img src="/assets/coin_1369860.png" alt="Coin" className="coin-icon" />
            <span>{versePoints}</span>
          </div>
          <button
            className="toggle-past-button"
            onClick={togglePastPolls}
          >
            {showPastPolls ? "Hide" : "Past Polls"}
          </button>
          <button
            className="create-poll-button"
            onClick={handleCreatePollClick}
            disabled={attemptsLeft <= 0 || versePoints < 10}
          >
            Create Poll ({attemptsLeft})
          </button>
        </div>
      </div>
      
      {error && <div className="status-message error">{error}</div>}
      {successMessage && <div className="status-message success">{successMessage}</div>}
      
      <div className={`polls-content ${showPastPolls ? 'show-past-polls' : ''}`}>
        <div className="active-polls">
          {activePoll ? (
            <div key={activePoll._id} className="poll-card">
              <h3>{activePoll.category}</h3>
              <div className="poll-participants-flex">
                {/* Challenger Section */}
                <div className="poll-participant">
                  <div className="poll-profile-info">
                    <img
                      src={activePoll.challenger?.profilePic || "/assets/noprofile.jpg"}
                      alt={activePoll.challenger?.username || "Unknown"}
                      onContextMenu={(e) => e.preventDefault()}
                      className="watermarked"
                    />
                    <span>{activePoll.challenger?.username || "Unknown"}</span>
                  </div>
                  <div className="submission-container">
                    {activePoll.challengerSubmission ? (
                      <img
                        src={activePoll.challengerSubmission}
                        alt="Poll submission"
                        className="submission-img watermarked"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    ) : (
                      <p>No submission</p>
                    )}
                  </div>
                  <div className="poll-vote-button">
                    <button 
                      onClick={() => handleVote(activePoll._id, "challenger")}
                      disabled={hasVotedOnActivePoll}
                    >
                      {hasVotedOnActivePoll ? "Voted" : "Vote"}
                    </button>
                  </div>
                </div>
                <h1 className="poll-verses">vs</h1>
                {/* Challenged Section */}
                <div className="poll-participant">
                  <div className="poll-profile-info">
                    <img
                      src={activePoll.challenged?.profilePic || "/assets/noprofile.jpg"}
                      alt={activePoll.challenged?.username || "Unknown"}
                      onContextMenu={(e) => e.preventDefault()}
                      className="watermarked"
                    />
                    <span>{activePoll.challenged?.username || "Unknown"}</span>
                  </div>
                  <div className="submission-container">
                    {activePoll.opponentImage ? (
                      <img
                        src={activePoll.opponentImage}
                        alt="Opponent submission"
                        className="submission-img watermarked"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    ) : (
                      <p>Pending submission</p>
                    )}
                  </div>
                  <div className="poll-vote-button">
                    <button 
                      onClick={() => handleVote(activePoll._id, "challenged")}
                      disabled={hasVotedOnActivePoll}
                    >
                      {hasVotedOnActivePoll ? "Voted" : "Vote"}
                    </button>
                  </div>
                </div>
              </div>
              
              
              
              {/* Only show navigation if there are multiple polls */}
              
            </div>
          ) : (
            <div className="empty-polls-container">
              <p className="no-polls-message">No active polls available at the moment.</p>
              <p className="create-poll-suggestion">
                {attemptsLeft > 0 && versePoints >= 10 
                  ? "Why not create a new poll to challenge others?" 
                  : attemptsLeft <= 0 
                    ? "You've reached your daily limit of 3 polls." 
                    : "You need at least 10 versePoints to create a poll."}
              </p>
            </div>
          )}
          {activeChallenges.length > 1 && (
                <div className="carousel-nav">
                  <button 
                    onClick={() => setActivePollIndex(prev => 
                      prev === 0 ? activeChallenges.length - 1 : prev - 1
                    )}
                  >
                    Previous
                  </button>
                  <span>{activePollIndex + 1} of {activeChallenges.length}</span>
                  <button 
                    onClick={() => setActivePollIndex(prev => 
                      prev === activeChallenges.length - 1 ? 0 : prev + 1
                    )}
                  >
                    Next
                  </button>
                </div>
              )}
        </div>
        
        <div className={`past-polls ${showPastPolls ? 'visible' : ''}`}>
          <h2>Past Polls</h2>
          {pastChallenges.length > 0 ? (
            pastChallenges.map((poll) => (
              <div key={poll._id} className="poll-card completed">
                <h3>
                  {poll.category} Poll -{" "}
                  {poll.status === "pending" ? "Pending" : "Completed"}
                </h3>
                {poll.status === "pending" ? (
                  <p>No match found yet.</p>
                ) : (
                  <>
                    <div className="poll-participants-flex">
                      <div className="poll-participant">
                        <div className="poll-profile-info">
                          <img
                            src={poll.challenger?.profilePic || "/assets/noprofile.jpg"}
                            alt={poll.challenger?.username || "Unknown"}
                            onContextMenu={(e) => e.preventDefault()}
                            className="watermarked"
                          />
                          <span>{poll.challenger?.username || "Unknown"}</span>
                        </div>
                        <div className="submission-container">
                          {poll.challengerSubmission ? (
                            <img
                              src={poll.challengerSubmission}
                              alt="Challenger submission"
                              className="submission-img watermarked"
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          ) : (
                            <p>No submission</p>
                          )}
                          <p>
                            Votes:{" "}
                            {poll.votes ? poll.votes.filter((v) => v.option === "challenger").length : 0}
                          </p>
                        </div>
                      </div>
                      <div className="poll-participant">
                        <div className="poll-profile-info">
                          <img
                            src={poll.challenged?.profilePic || "/assets/noprofile.jpg"}
                            alt={poll.challenged?.username || "Unknown"}
                            onContextMenu={(e) => e.preventDefault()}
                            className="watermarked"
                          />
                          <span>{poll.challenged?.username || "Unknown"}</span>
                        </div>
                        <div className="submission-container">
                          {poll.opponentImage ? (
                            <img
                              src={poll.opponentImage}
                              alt="Opponent submission"
                              className="submission-img watermarked"
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          ) : (
                            <p>No submission</p>
                          )}
                          <p>
                            Votes:{" "}
                            {poll.votes ? poll.votes.filter((v) => v.option === "challenged").length : 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="poll-result">
                      <h4>
                        Winner:{" "}
                        {!poll.votes || poll.votes.length === 0 ? "No votes yet" :
                          poll.votes.filter((v) => v.option === "challenger").length >
                          poll.votes.filter((v) => v.option === "challenged").length
                            ? poll.challenger?.username
                            : poll.votes.filter((v) => v.option === "challenged").length >
                              poll.votes.filter((v) => v.option === "challenger").length
                            ? poll.challenged?.username
                            : "Tie"}
                      </h4>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <p>No past challenges.</p>
          )}
        </div>
      </div>

      {showCreatePollModal && (
        <Modal onClose={() => setShowCreatePollModal(false)}>
          <h2>Create New Poll</h2>
          {/* Display the response message within the modal */}
          {challengeResponseMessage && (
            <p className="challenge-response" aria-live="polite">
              {challengeResponseMessage}
            </p>
          )}
          <form onSubmit={handleCreatePoll} className="create-poll-form">
            <div className="poll-cost-info">
              <span> This will cost 10 </span>
              <img src="/assets/coin_1369860.png" alt="Coin" className="coin-icon" />
              
            </div>
            
            <label htmlFor="skill">Skill:</label>
            <select
              id="skill"
              value={newPollCategory}
              onChange={(e) => setNewPollCategory(e.target.value)}
              required
            >
              {skillOptions.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
            <label htmlFor="submission">
              {videoSkills.includes(newPollCategory.trim().toLowerCase())
                ? "Upload Your Video (Max 1 minute):"
                : "Upload Your Submission:"}
            </label>
            <input
              type="file"
              id="submission"
              accept={
                videoSkills.includes(newPollCategory.trim().toLowerCase())
                  ? "video/*"
                  : "image/*,video/*"
              }
              onChange={handleFileInputChange}
            />
            <button 
              type="submit" 
              disabled={isSubmitting || versePoints < 10}
            >
              {isSubmitting ? "Submitting..." : "Create Poll"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Polls;