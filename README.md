# Verse 🎤📸 — A Challenge-Based Social Platform

**Verse** is a full-stack web application that combines the essence of social media with skill-based challenges. Built for users to showcase their talents, connect over shared interests, and grow through friendly competition. Whether you’re a dancer, coder, singer, or designer — Verse gives you a platform to shine 🌟.

---

## 🔗 Live Demo

[Visit Verse](https://verse-frontend.onrender.com)

---

## 🧰 Tech Stack

### Frontend
- **React.js**
- **Tailwind CSS**
- **Axios**
- **Framer Motion** (for animations)
- **React Router DOM**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB** & **Mongoose**

### Cloud & Media
- **Cloudinary** for image & video uploads
- **JWT** for authentication
- **Render** for deployment

---

## ✨ Features

### 🏆 Challenge System
- Create public challenges based on skills (e.g., singing, dancing, coding)
- Upload images or short videos (1‑minute max for certain categories)
- Match with other users and compete in community‑driven polls
- Automated matchmaking and real‑time status updates

### 🗳️ Voting & Polls
- Vote on active challenge submissions
- Polls expire after a set period
- Dynamic updates without full page refresh

### 🧑‍💼 Profiles & Points
- User profiles with bio, skills, and **versePoints**
- **versePoints** reflect user activity and wins
- Skill‑tagged content and activity history

### 📨 Messaging (Beta)
- Real‑time direct messages
- Seamless UI integration within user profiles

### 🖼️ Feed
- Instagram‑like scrollable image & challenge feed
- Explore others’ content and vote on challenges

### 🔐 Authentication
- Secure login & registration using JWT
- Passwords hashed with bcrypt
- Profile pictures and media stored via Cloudinary

---

## 🚀 Getting Started Locally

### 1. Clone the repository

git clone https://github.com/Ayansh-Jain/VERSE.git
cd VERSE
**2. Setup Backend**

cd BACKEND
npm install
**Create a `.env` file with:**
MONGODB_URI=<your MongoDB connection string>
 JWT_SECRET=<your JWT secret>
npm start
**3. Setup Frontend**

cd FRONTEND
npm install
npm run dev
**🛠️ To‑Do / Future Features**
Notifications system

AI‑powered matchmaking

Video processing optimization

Improved accessibility and mobile UX

### 👨‍💻 Developer

Ayansh Jain

📧 Email: ayanshjain.co@gmail.com

💼 LinkedIn: linkedin.com/in/ayansh-jain-b74bab27b

### 🙌 Contribution
Have ideas or found a bug? Contributions are welcome!
Fork the project

Create your feature branch

git checkout -b feature/YourFeature
Commit your changes


git commit -m "Add YourFeature"
Push to the branch


git push origin feature/YourFeature
Open a Pull Request

### 📄 License

MIT License

Copyright (c) 2025 Ayansh Jain

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell  
copies of the Software, and to permit persons to whom the Software is  
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in  
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR  
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE  
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER  
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN  
THE SOFTWARE.
Copy
Edit
