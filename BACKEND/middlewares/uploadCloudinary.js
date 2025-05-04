// src/middlewares/uploadCloudinary.js
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "verse_uploads",      // all uploads go here
    resource_type: "auto",        // auto-detect image/video
    format: async (req, file) => {
      // preserve original format (jpg, png, mp4, etc)
      const orig = file.mimetype.split("/")[1];
      return orig === "jpeg" ? "jpg" : orig;
    },
    public_id: (req, file) =>
      `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
  },
});

export default multer({ storage });
