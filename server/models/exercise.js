const mongoose = require("mongoose");

//define a message schema for the database
const setSchema = new mongoose.Schema({
  reps: Number,
  weight: Number,
  rpe: Number,
});

const ExerciseSchema = new mongoose.Schema({
  creator_id: String,
  name: { type: String, default: "" },
  parent: String, //what workout it is underneath
  timestamp: { type: Date, default: Date.now },
  sets: {
    type: [setSchema],
    default: [],
  },
  posted: { type: Boolean, default: false },
  pr: { type: Boolean, default: false },
});

// compile model from schema
module.exports = mongoose.model("exercise", ExerciseSchema);
