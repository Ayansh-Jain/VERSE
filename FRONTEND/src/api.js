// src/api.js
const API_BASE = "https://verse-48io.onrender.com/api";

async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("safeJson parse error:", err, "Raw response:", text);
    return { raw: text };
  }
}

function authFetch(path, opts = {}) {
  const token = localStorage.getItem("verse_token");
  const headers = { ...(opts.headers || {}) };

  // only set JSON content-type if body is a plain object/string, not FormData
  if (opts.body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
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
    authFetch("/users/me").then((res) => {
      if (!res.ok) {
        throw new Error(res.statusText || "Failed to fetch current user");
      }
      return safeJson(res);
    }),

  logout: () => {
    localStorage.removeItem("verse_token");
    localStorage.removeItem("verse_user");
    return Promise.resolve({ message: "Logged out." });
  },

  getUserById: (userId) =>
    authFetch(`/users/${userId}`).then(safeJson),

  followUser: (userId) =>
    authFetch(`/users/${userId}/follow`, { method: "PUT" }).then(safeJson),

  likePost: (postId) =>
    authFetch(`/posts/like/${postId}`, { method: "PUT" }).then(safeJson),

  toggleLike: (postId) =>
    api.likePost(postId),

  createPost: (formData) =>
    authFetch("/posts", { method: "POST", body: formData }).then(safeJson),

  getFeed: (page = 1, limit = 10) =>
    authFetch(`/posts/feed?page=${page}&limit=${limit}`).then(safeJson),

  getAllUsers: () =>
    authFetch("/users").then(safeJson),

  sendMessage: (formData) =>
    authFetch("/messages", { method: "POST", body: formData }).then(safeJson),

  getConversation: (userId) =>
    authFetch(`/messages/conversation/${userId}`).then(safeJson),

  markConversationRead: (userId) =>
    authFetch(`/messages/conversation/${userId}/read`, { method: "PUT" }).then(safeJson),

  createPoll: async (pollData) => {
    const res = await authFetch("/polls", { method: "POST", body: pollData });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Error creating poll");
    }
    return safeJson(res);
  },

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

  getPolls: () =>
    authFetch("/polls").then(safeJson),

  getPollById: (pollId) =>
    authFetch(`/polls/${pollId}`).then(safeJson),

  getUserProfile: () => {
    const stored = localStorage.getItem("verse_user");
    if (!stored) return Promise.reject(new Error("No user in storage"));
    const { _id } = JSON.parse(stored);
    return authFetch(`/users/${_id}`).then(safeJson);
  },

  cancelPoll: () =>
    authFetch("/polls/cancel", { method: "DELETE" }).then(safeJson),
};

export default api;
