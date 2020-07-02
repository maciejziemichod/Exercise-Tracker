"use strict";

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

// Functions
const validateId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateLimit = (limit) =>
  Number.isInteger(parseFloat(limit)) && parseInt(limit) > 0;

const validateDate = (date) => {
  if (typeof date === "string") {
    return new Date(date) + "" !== "Invalid Date";
  } else {
    return date + "" !== "Invalid Date";
  }
};

const compareDates = (date1, date2, operation) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  // Making sure comparison doesn't consider hours
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  if (operation === "from") {
    return d1 >= d2;
  } else if (operation === "to") {
    return d1 <= d2;
  }
};

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

///////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////

// API array of users
app.get("/api/exercise/users", (req, res) => {
  User.find({}, "username _id").then((response) => {
    res.json(response);
  });
});

///////////////////////////////////////////////////////////////

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
  if (!validateDate(newDate)) {
    res.json({ error: "Invalid date provided" });
    return;
  }

  const options = { new: true };
  const update = { $push: { log: [{ description, duration, date: newDate }] } };

  User.findByIdAndUpdate(userId, update, options)
    .then((response) => {
      // User not found
      if (!response) {
        res.json({ error: "No user with this ID" });
        return;
      }

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

///////////////////////////////////////////////////////////////

// API retrieve exercise log
app.get("/api/exercise/log", (req, res) => {
  const { userId, from, to, limit } = req.query;

  // No userId provided
  if (!userId) {
    res.json({ error: "Use /api/exercise/log?userId=_id" });
    return;
  }

  // Invalid ID format
  if (!validateId(userId)) {
    res.json({ error: "Invalid ID" });
    return;
  }

  User.findById(userId, "_id username log")
    .then((response) => {
      // User not found
      if (!response) {
        res.json({ error: "No user with this ID" });
        return;
      }

      const exerciseLog = { ...response.toObject() };
      exerciseLog.log = exerciseLog.log.map((elem) => {
        // Omitting _id with rest operator
        const { _id, ...exercise } = elem;
        return exercise;
      });

      // From
      if (from) {
        if (!validateDate(from)) {
          res.json({ error: "'from' parameter must be a proper date" });
          return;
        }

        exerciseLog.log = exerciseLog.log.filter((exercise) =>
          compareDates(exercise.date, from, "from")
        );
      }

      // To
      if (to) {
        if (!validateDate(to)) {
          res.json({ error: "'to' parameter must be a proper date" });
          return;
        }

        exerciseLog.log = exerciseLog.log.filter((exercise) =>
          compareDates(exercise.date, to, "to")
        );
      }

      // Limit
      if (limit) {
        if (!validateLimit(limit)) {
          res.json({ error: "'limit' parameter must be int > 0" });
          return;
        }
        exerciseLog.log = exerciseLog.log.slice(0, parseInt(limit));
      }

      // Adding count property
      exerciseLog.count = exerciseLog.log.length;

      // Sending final response
      res.json(exerciseLog);
    })
    .catch((err) => console.error(err));
});

// Listening
const listener = app.listen(PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
