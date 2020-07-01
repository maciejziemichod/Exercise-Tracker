"use strict";

// TODO: i think i need to enable passing date object to adding exercise api to fulfill fcc requirements
// use toDateString()

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

// Functions
const validateId = (id) => mongoose.Types.ObjectId.isValid(id);

// Init
const app = express();

// Port
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
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
  username: {
    type: String,
    required: true,
  },
  log: [
    {
      description: String,
      duration: Number,
      date: String,
    },
  ],
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
  const { username } = req.body;
  const newUser = new User({ username });

  // Checking if that user already exists
  User.findOne({ username })
    .then((response) => {
      if (response) {
        // username already taken
        res.json({ error: `Username '${username}' is already taken` });
      } else {
        newUser
          .save()
          .then((response) => {
            res.json({ _id: response._id, username });
          })
          .catch((err) => console.error(err));
      }
    })
    .catch((err) => console.error(err));
});

// API array of users
app.get("/api/exercise/users", (req, res) => {
  User.find({}, "username _id").then((response) => {
    res.json(response);
  });
});

// API add exercise
app.post("/api/exercise/add", (req, res) => {
  const { userId, description, duration, date } = req.body;

  // ID validation
  if (!validateId(userId)) {
    res.json({ error: "Invalid user ID" });
    return;
  }

  // Date validation
  const givenDate = date ? date : Date.now();
  const newDate = new Date(givenDate).toDateString();
  if (newDate === "Invalid Date") {
    res.json({ error: "Invalid date provided" });
    return;
  }

  const options = { new: true };
  const update = { $push: { log: [{ description, duration, date: newDate }] } };

  User.findByIdAndUpdate(userId, update, options)
    .then((response) => {
      res.json({
        _id: userId,
        username: response.username,
        date: newDate,
        duration: parseFloat(duration),
        description,
      });
    })
    .catch((err) => console.error(err));
});

// API retrieve exercise log
app.get("/api/exercise/log", (req, res) => {
  const { userId } = req.query;

  // No query provided
  if (!userId) {
    res.json({ error: "Use /api/exercise/log?userId=_id" });
    return;
  }

  // Invalid ID
  if (!validateId(userId)) {
    res.json({ error: "Invalid ID" });
    return;
  }

  User.findById(userId, "_id username log")
    .then((response) => {
      res.json({
        ...response.toObject(),
        count: response.toObject().log.length,
      });
    })
    .catch((err) => console.error(err));
});

// Listening
const listener = app.listen(PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
