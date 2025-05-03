const API_BASE = "/api";

export const api = {
  signup: async (userData) => {
    const res = await fetch(`${API_BASE}/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
      credentials: "include",
    });
    return res.json();
  },
 
  getUserById: async (userId) => {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      credentials: "include",
    });
    return res.json();
  },
  login: async (userData) => {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
      credentials: "include",
    });
    return res.json();
  },
  createPost: async (postData) => {
    const res = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      body: postData,
      credentials: "include",
    });
    return res.json();
  },
  followUser: async (userId) => {
    const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
      method: "PUT",
      credentials: "include",
    });
    return res.json();
  },
  likePost: async (postId) => {
    const res = await fetch(`${API_BASE}/posts/like/${postId}`, {
      method: "PUT",
      credentials: "include",
    });
    return res.json();
  },
  toggleLike: async (postId) => {
    return await api.likePost(postId);
  },
  getFeed: async (page = 1, limit = 10) => {
    const res = await fetch(
      `${API_BASE}/posts/feed?page=${page}&limit=${limit}`,
      { credentials: "include" }
    );
    return res.json();
  },
  getAllUsers: async () => {
    const res = await fetch(`${API_BASE}/users`, { credentials: "include" });
    return res.json();
  },
  sendMessage: async (formData) => {
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    return res.json();
  },
  getConversation: async (userId) => {
    const res = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
      credentials: "include",
    });
    return res.json();
  },
  markConversationRead: async (userId) => {
    const res = await fetch(`${API_BASE}/messages/conversation/${userId}/read`, {
      method: "PUT",
      credentials: "include",
    });
    return res.json();
  },

  createPoll: async (pollData) => {
    const res = await fetch(`${API_BASE}/polls`, {
      method: "POST",
      body: pollData,
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error creating challenge: ${text}`);
    }
    return res.json();
  },
  votePoll: async (pollId, option) => {
    const res = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option }),
      credentials: "include",
    });
    return res.json();
  },
  updatePollSubmission: async (pollId, submissionData) => {
    const res = await fetch(`${API_BASE}/polls/${pollId}/submission`, {
      method: "PUT",
      body: submissionData,
      credentials: "include",
    });
    return res.json();
  },
  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/users/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || res.statusText);
    }
    return res.json();
  },
  logout: async () => {
    const res = await fetch(`${API_BASE}/users/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || res.statusText);
    }
    return res.json();
  },
  getPolls: async () => {
    const res = await fetch(`${API_BASE}/polls`, { credentials: "include" });
    const text = await res.text();
    return text ? JSON.parse(text) : { active: [], pending: [] };
  },
  getPollById: async (pollId) => {
    const res = await fetch(`${API_BASE}/polls/${pollId}`, {
      credentials: "include",
    });
    return res.json();
  },
  getUserProfile: async () => {
      const stored = JSON.parse(localStorage.getItem("user-verse"));
     if (!stored?._id) throw new Error("No user in localStorage");
    const res = await fetch(`${API_BASE}/users/${stored._id}`, {
       credentials: "include",
     });
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
       return res.json();
     },
  cancelPoll: async () => {
    const res = await fetch(`${API_BASE}/polls/cancel`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.json();
  },
};
export default api;
