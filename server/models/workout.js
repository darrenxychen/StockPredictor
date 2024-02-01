const mongoose = require("mongoose");

//define a story schema for the database
const WorkoutSchema = new mongoose.Schema({
  creator_id: String,
  creator_name: String,
  timestamp: { type: Date, default: Date.now },
  posted: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  current: { type: Boolean, default: false },
});

// compile model from schema
module.exports = mongoose.model("workout", WorkoutSchema);
