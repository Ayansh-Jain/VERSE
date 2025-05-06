import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/CreatePost.css";

const CreatePost = () => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("text", text);
    if (media) formData.append("img", media);
    try {
      const res = await api.createPost(formData);
      if (res._id || res.text) {
        alert("Post created successfully!");
        setText("");
        setMedia(null);
        navigate("/feed");
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  return (
    <div className="create-post">
      <h2>Create a Post</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write something..."
        />
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setMedia(e.target.files[0])}
        />
        <button type="submit">Post</button>
      </form>
    </div>
  );
};

export default CreatePost;
