// src/api.js

// Fallback to the real backend if the env var is missing:
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://verse-48io.onrender.com/api";

async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function authFetch(path, opts = {}) {
  const token = localStorage.getItem("verse_token");
  const headers = { ...(opts.headers || {}) };

  // If body is not FormData, assume JSON
  if (opts.body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });
}

export const api = {
  signup: (userData) =>
    authFetch("/users/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    }).then(safeJson),

  login: (userData) =>
    authFetch("/users/login", {
      method: "POST",
      body: JSON.stringify(userData),
    }).then(safeJson),

  getCurrentUser: () =>
    authFetch("/users/me").then(async (res) => {
      if (!res.ok) throw new Error(res.statusText || "Failed to fetch");
      return safeJson(res);
    }),

  logout: () => {
    localStorage.removeItem("verse_token");
    localStorage.removeItem("verse_user");
    return Promise.resolve({ message: "Logged out." });
  },

  getUserById: (id) => authFetch(`/users/${id}`).then(safeJson),
  followUser: (id) =>
    authFetch(`/users/${id}/follow`, { method: "PUT" }).then(safeJson),

  createPost: (formData) =>
    authFetch("/posts", { method: "POST", body: formData }).then(safeJson),
  likePost: (postId) =>
    authFetch(`/posts/like/${postId}`, { method: "PUT" }).then(safeJson),
  toggleLike: (postId) => api.likePost(postId),

  getFeed: (page = 1, limit = 10) =>
    authFetch(`/posts/feed?page=${page}&limit=${limit}`).then(safeJson),

  getAllUsers: () => authFetch("/users").then(safeJson),

  sendMessage: (formData) =>
    authFetch("/messages", { method: "POST", body: formData }).then(safeJson),
  getConversation: (userId) =>
    authFetch(`/messages/conversation/${userId}`).then(safeJson),
  markConversationRead: (userId) =>
    authFetch(`/messages/conversation/${userId}/read`, {
      method: "PUT",
    }).then(safeJson),

  createPoll: (pollData) =>
    authFetch("/polls", { method: "POST", body: pollData }).then(async (res) => {
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Error creating poll");
      }
      return safeJson(res);
    }),

  votePoll: (pollId, option) =>
    authFetch(`/polls/${pollId}/vote`, {
      method: "PUT",
      body: JSON.stringify({ option }),
    }).then(safeJson),

  updatePollSubmission: (pollId, submissionData) =>
    authFetch(`/polls/${pollId}/submission`, {
      method: "PUT",
      body: submissionData,
    }).then(safeJson),

  getPolls: () => authFetch("/polls").then(safeJson),
  getPollById: (pollId) => authFetch(`/polls/${pollId}`).then(safeJson),
  cancelPoll: () =>
    authFetch("/polls/cancel", { method: "DELETE" }).then(safeJson),

  getUserProfile: () => {
    const stored = localStorage.getItem("verse_user");
    if (!stored) return Promise.reject(new Error("No user in storage"));
    const { _id } = JSON.parse(stored);
    return authFetch(`/users/${_id}`).then(safeJson);
  },
};

export default api;
