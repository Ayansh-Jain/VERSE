// src/api.js

// Base URL (no trailing “/api” here—keep it clean)
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://verse-48io.onrender.com";

// Safely parse JSON or return raw text
async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// Unified fetch with token + error handling
async function authFetch(path, opts = {}) {
  const token = localStorage.getItem("verse_token");
  const headers = { ...(opts.headers || {}) };

  // auto-content type for JSON bodies
  if (opts.body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });

  const data = await safeJson(res);
  if (!res.ok) {
    // normalized throw
    const msg = data?.message || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
}

// Normalize the user + token shape
function normalizeUser({ token, user }) {
  return {
    ...user,
    token,
    following: (user.following || []).map((u) => u._id),
    followers: (user.followers || []).map((u) => u._id),
  };
}

export const api = {
  signup: (userData) =>
    authFetch("/users/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    }).then(normalizeUser),

  login: (userData) =>
    authFetch("/users/login", {
      method: "POST",
      body: JSON.stringify(userData),
    }).then(normalizeUser),

  getCurrentUser: () => authFetch("/users/me"),

  logout: () => {
    localStorage.removeItem("verse_token");
    localStorage.removeItem("verse_user");
    return Promise.resolve({ message: "Logged out." });
  },

  getUserById: (id) => authFetch(`/users/${id}`),
  followUser: (id) =>
    authFetch(`/users/${id}/follow`, { method: "PUT" }),

  createPost: (formData) =>
    authFetch("/posts", { method: "POST", body: formData }),
  likePost: (postId) =>
    authFetch(`/posts/like/${postId}`, { method: "PUT" }),
  toggleLike: (postId) => api.likePost(postId),

  getFeed: (page = 1, limit = 10) =>
    authFetch(`/posts/feed?page=${page}&limit=${limit}`),

  getAllUsers: () => authFetch("/users"),

  sendMessage: (formData) =>
    authFetch("/messages", { method: "POST", body: formData }),
  getConversation: (userId) =>
    authFetch(`/messages/conversation/${userId}`),
  markConversationRead: (userId) =>
    authFetch(`/messages/conversation/${userId}/read`, {
      method: "PUT",
    }),

  createPoll: (pollData) =>
    authFetch("/polls", { method: "POST", body: pollData }),

  votePoll: (pollId, option) =>
    authFetch(`/polls/${pollId}/vote`, {
      method: "PUT",
      body: JSON.stringify({ option }),
    }),

  updatePollSubmission: (pollId, submissionData) =>
    authFetch(`/polls/${pollId}/submission`, {
      method: "PUT",
      body: submissionData,
    }),

  getPolls: () => authFetch("/polls"),
  getPollById: (pollId) => authFetch(`/polls/${pollId}`),
  cancelPoll: () =>
    authFetch("/polls/cancel", { method: "DELETE" }),

  updateProfile: (id, formData) =>
    authFetch(`/users/${id}/update-profile`, {
      method: "PUT",
      body: formData,
    }),
};

export default api;
