const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  bio: { type: String, default: "" },
  friends: {
    type: [String],
    default: [],
  },
  requests: {
    type: [String],
    default: [],
  },
  googleid: String,
  profile_picture: { type: String, default: "https://i.imgur.com/Wfv7adq.png" },
});

// compile model from schema
module.exports = mongoose.model("user", UserSchema);
