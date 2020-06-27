"use strict";

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

// Init
const app = express();

// Port
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  // Handle initial error
  .catch((err) => console.error(err))
  // Success
  .then(() => console.log("Connected to DB"));

// Handle errors after established connection
mongoose.connection.on(
  "error",
  console.error.bind(console, "connection error")
);

// Schema
const userSchema = new mongoose.Schema({
  username: String,
});

// Model
const User = mongoose.model("User", userSchema);

// CORS
app.use(cors());

// Body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static
app.use("/dist", express.static("dist"));

// Index
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/index.html");
});

// API new user
app.post("/api/exercise/new-user", (req, res) => {
  res.json(req.body);
});

// API array of users
app.get("/api/exercise/users", (req, res) => {
  User.find({}, "username _id").then((response) => {
    res.json(response);
  });
});

// API add exercise
app.post("/api/exercise/add", (req, res) => {
  res.json(req.body);
});

// API retrieve exercise log

// Listening
const listener = app.listen(PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
