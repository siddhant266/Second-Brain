import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { connectDB } from "./dbConnect.js";
import isValidPassword from "./utils/validatePassword.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { Content, User } from "./db.js";
import { AuthMiddleware } from "./middleware.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

connectDB().then(() => {
  app.listen(3000, () => console.log("Server running"));
});

app.post("/api/v1/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and Password are required",
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "Strong Password needed",
      });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.post("/api/v1/signin", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Signin successful",
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.post("/api/v1/content", AuthMiddleware, async (req, res) => {
  try {
    const { link, type, title, tags } = req.body;

    // Validation
    if (!link || !type || !title) {
      return res.status(400).json({
        message: "Link, type, and title are required",
      });
    }

    // Create content
    const content = await Content.create({
      link,
      type,
      title,
      tags: tags || [], // Optional tags
      userId: req.userId, // From auth middleware
    });

    res.status(201).json({
      message: "Content created successfully",
      content,
    });
  } catch (error) {
    console.error("Content creation error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.get("/api/v1/content", AuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const content = await Content.find({
      userId: userId,
    });
    // .populate('userId', 'username');
    res.status(200).json({
      message: "Content fetched successfully",
      content,
      user: {
        id: userId,
        username: req.username,
      },
    });
  } catch (error) {
    console.error("Content fetching error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.delete("/api/v1/content", AuthMiddleware, async (req, res) => {
  try {
    const contentId = req.body.contentId;
    await Content.deleteOne({
      _id: contentId,
      userId: req.userId,
    });

    res.json({
      message: "Content deleted",
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Error deleting the content",
    });
  }
});

app.post("/api/v1/brain/share", (req, res) => {});

app.get("/api/v1/brain/:shareLink", (req, res) => {});
