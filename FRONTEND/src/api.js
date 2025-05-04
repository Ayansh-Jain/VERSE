// src/api.js  (frontend helper)
const API_BASE = "https://verse-48io.onrender.com/api";

async function safeJson(res) {
  const text = await res.text();
  if (text) {
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("safeJson parse error:", err, "Raw response:", text);
      return { raw: text };
    }
  }
  return {};
}

export const api = {
  signup: async (userData) => {
    const res = await fetch(`${API_BASE}/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
      credentials: "include",
    });
    return safeJson(res);
  },

  login: async (userData) => {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
      credentials: "include",
    });
    return safeJson(res);
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/users/me`, {
      credentials: "include",
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || res.statusText);
    }
    return safeJson(res);
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
    return safeJson(res);
  },

  getUserById: async (userId) => {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      credentials: "include",
    });
    return safeJson(res);
  },

  followUser: async (userId) => {
    const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
      method: "PUT",
      credentials: "include",
    });
    return safeJson(res);
  },
  likePost: async (postId) => {
    const res = await fetch(`${API_BASE}/posts/like/${postId}`, {
      method: "PUT",
      credentials: "include",
    });
    return safeJson(res);
  },
  toggleLike: async (postId) => {
    return await api.likePost(postId);
  },
  getFeed: async (page = 1, limit = 10) => {
    const res = await fetch(
      `${API_BASE}/posts/feed?page=${page}&limit=${limit}`,
      { credentials: "include" }
    );
    return safeJson(res);
  },
  getAllUsers: async () => {
    const res = await fetch(`${API_BASE}/users`, { credentials: "include" });
    return safeJson(res);
  },
  sendMessage: async (formData) => {
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    return safeJson(res);
  },
  getConversation: async (userId) => {
    const res = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
      credentials: "include",
    });
    return safeJson(res);
  },
  markConversationRead: async (userId) => {
    const res = await fetch(`${API_BASE}/messages/conversation/${userId}/read`, {
      method: "PUT",
      credentials: "include",
    });
    return safeJson(res);
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
    return safeJson(res);
  },
  votePoll: async (pollId, option) => {
    const res = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option }),
      credentials: "include",
    });
    return safeJson(res);
  },
  updatePollSubmission: async (pollId, submissionData) => {
    const res = await fetch(`${API_BASE}/polls/${pollId}/submission`, {
      method: "PUT",
      body: submissionData,
      credentials: "include",
    });
    return safeJson(res);
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
    return safeJson(res);
  },
  getUserProfile: async () => {
      const stored = JSON.parse(localStorage.getItem("user-verse"));
     if (!stored?._id) throw new Error("No user in localStorage");
    const res = await fetch(`${API_BASE}/users/${stored._id}`, {
       credentials: "include",
     });
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
       return safeJson(res);
     },
  cancelPoll: async () => {
    const res = await fetch(`${API_BASE}/polls/cancel`, {
      method: "DELETE",
      credentials: "include",
    });
    return safeJson(res);
  },
};
export default api;
