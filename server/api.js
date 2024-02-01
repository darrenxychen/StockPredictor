/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/

const express = require("express");

// import models so we can interact with the database
const User = require("./models/user");
const Comment = require("./models/comment");
const Exercise = require("./models/exercise");
const Workout = require("./models/workout");
const Like = require("./models/like");
const Star = require("./models/star");
const Document = require("./models/document");

const { OpenAI } = require("openai");
const ANYSCALE_API_KEY = process.env.ANYSCALE_API_KEY;
const MODEL = "meta-llama/Llama-2-13b-chat-hf";

const anyscale = new OpenAI({
  baseURL: "https://api.endpoints.anyscale.com/v1",
  apiKey: ANYSCALE_API_KEY,
});

// import authentication library
const auth = require("./auth");

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

//initialize socket
const socketManager = require("./server-socket");

router.post("/login", auth.login);
router.post("/login/grading", auth.loginGrading);
router.post("/logout", auth.logout);
router.get("/whoami", (req, res) => {
  if (!req.user) {
    // not logged in
    return res.send({});
  }
  User.findById(req.user._id).then((user) => res.send(user));
});

router.post("/initsocket", (req, res) => {
  // do nothing if user not logged in
  if (req.user)
    socketManager.addUser(req.user, socketManager.getSocketFromSocketID(req.body.socketid));
  res.send({});
});

// |------------------------------|
// | write your API methods below!|
// |------------------------------|

router.get("/workout/current", (req, res) => {
  Workout.find({ creator_id: req.query.userId, current: true }).then((workout) => {
    res.send(workout);
  });
});

router.post("/workout/create", (req, res) => {
  const newWorkout = new Workout({
    creator_id: req.user._id,
    creator_name: req.user.name,
    current: req.body.current,
  });
  newWorkout.save().then((workout) => {
    res.send(workout);
  });
});

router.post("/workout/save", (req, res) => {
  Workout.findById(req.body.id).then((workout) => {
    if (!workout) {
      return res.status(404).send("Workout not found");
    }

    workout.posted = false;
    workout.current = false;

    workout
      .save()
      .then(() => {
        Exercise.find({ parent: workout._id }).then((exercises) => {
          if (!exercises || exercises.length === 0) {
            return res.status(404).send("Exercises not found");
          }

          Promise.all(
            exercises.map((exercise) => {
              exercise.posted = true;
              return exercise.save();
            })
          )
            .then(() => {
              res.send(workout);
            })
            .catch((err) => {
              res.status(500).send(err.message);
            });
        });
      })
      .catch((err) => {
        res.status(500).send(err.message);
      });
  });
});

router.post("/workout/post", (req, res) => {
  Workout.findById(req.body.id).then((workout) => {
    if (!workout) {
      return res.status(404).send("Workout not found");
    }

    workout.posted = true;
    workout.current = false;

    workout
      .save()
      .then(() => {
        Exercise.find({ parent: workout._id }).then((exercises) => {
          if (!exercises || exercises.length === 0) {
            return res.status(404).send("Exercises not found");
          }

          Promise.all(
            exercises.map((exercise) => {
              exercise.posted = true;
              return exercise.save();
            })
          )
            .then(() => {
              res.send(workout);
            })
            .catch((err) => {
              res.status(500).send(err.message);
            });
        });
      })
      .catch((err) => {
        res.status(500).send(err.message);
      });
  });
});

router.post("/workout/delete", (req, res) => {
  Workout.deleteOne({ _id: req.body.workout_id }).then((workout) => {
    res.send(workout);
  });
  Exercise.deleteMany({ parent: req.body.workout_id }).then((workout) => {});
  Comment.deleteMany({ parent: req.body.workout_id }).then((workout) => {});
  Like.deleteMany({ workoutId: req.body.workout_id }).then((workout) => {});
  Star.deleteMany({ workoutId: req.body.workout_id }).then((workout) => {});
});

router.post("/workout/change-visibility", (req, res) => {
  Workout.findById(req.body.id).then((workout) => {
    workout.posted = !workout.posted;
    workout.save().then((workout) => res.send(workout));
  });
});

router.get("/workouts/feed", (req, res) => {
  Workout.find({ posted: true }).then((workouts) => res.send(workouts));
});

router.get("/workouts/feed/friends", (req, res) => {
  User.findById(req.user._id).then((user) => {
    Workout.find({ creator_id: { $in: user.friends }, posted: true })
      .then((workouts) => {
        res.send(workouts);
      })
      .catch((error) => {
        res.status(500).send(error);
      });
  });
});

router.get("/workouts/profile/:userId", (req, res) => {
  const userId = req.params.userId;
  Workout.find({ creator_id: userId, current: false }).then((workouts) => res.send(workouts));
});

router.get("/workouts/profile/public/:userId", (req, res) => {
  const userId = req.params.userId;
  Workout.find({ creator_id: userId, current: false, posted: true }).then((workouts) =>
    res.send(workouts)
  );
});

router.get("/workouts/profile/drafts/:userId", (req, res) => {
  const userId = req.params.userId;
  Workout.find({ creator_id: userId, current: false, posted: false }).then((workouts) =>
    res.send(workouts)
  );
});

router.get("/workouts/profile/starred/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const stars = await Star.find({ userId: userId });

    // Using Promise.all to wait for all the Workout.findbyId operations to complete
    const workoutList = await Promise.all(stars.map((star) => Workout.findById(star.workoutId)));

    res.send(workoutList);
  } catch (error) {
    // Sending a 500 Internal Server Error response in case of an error
    res.status(500).send(error);
  }
});

router.get("/exercises/year", (req, res) => {
  let dateToCompare = new Date();
  dateToCompare.setFullYear(dateToCompare.getFullYear() - 1);
  Exercise.find({ creator_id: req.query.creator_id })
    .then((exercises) => {
      res.send(exercises);
    })
    .catch((err) => {
      console.error("Error during query:", err);
    });
});

router.get("/exercises", (req, res) => {
  Exercise.find({ parent: req.query.parent }).then((exercises) => res.send(exercises));
});

router.get("/exercise", (req, res) => {
  Exercise.findById(req.query.id).then((exercise) => res.send(exercise));
});

router.get("/exercises/user", (req, res) => {
  Exercise.find({ creator_id: req.user._id }).then((exercises) => res.send(exercises));
});

router.get("/exercises/user/any", (req, res) => {
  Exercise.find({ creator_id: req.query.id }).then((exercises) => res.send(exercises));
});

router.get("/exercises/user/pr", (req, res) => {
  Exercise.find({ creator_id: req.user._id, posted: true, name: req.query.name }).then(
    (exercises) => res.send(exercises)
  );
});

router.post("/exercises/user/pr/update", (req, res) => {
  Exercise.findById(req.body.id)
    .then((exercise) => {
      exercise.pr = req.body.pr;
      exercise.save().then(res.send(exercise));
    })
    .catch((err) => {}); //this will catch the error if deleting an exercise that isn't selected anymore
});

router.post("/exercise/create", (req, res) => {
  const newExercise = new Exercise({
    creator_id: req.body.creator_id,
    parent: req.body.workoutId,
  });
  newExercise.save().then((exercise) => {
    res.send(exercise);
  });
});

router.post("/exercise/delete", (req, res) => {
  Exercise.deleteOne({ _id: req.body.exerciseId }).then((exercise) => {
    res.send(exercise);
  });
});

router.post("/exercise/update", (req, res) => {
  Exercise.findById(req.body.id).then((exercise) => {
    exercise.name = req.body.name;
    exercise.sets = req.body.sets;
    exercise.pr = req.body.pr;
    exercise.save().then(res.send(exercise));
  });
});

router.get("/exercise/name", (req, res) => {
  Exercise.findById(req.query.id).then((exercise) => {
    res.send(exercise);
  });
});

router.post("/comment", (req, res) => {
  const newComment = new Comment({
    creator_id: req.user._id,
    creator_name: req.user.name,
    parent: req.body.parent, // links to the _id of a parent workout (_id is an autogenerated field by Mongoose).
    content: req.body.content,
  });
  newComment.save().then((comment) => {
    res.send(comment);
  });
});

router.get("/comments", (req, res) => {
  Comment.find({ parent: req.query.parent }).then((comments) => res.send(comments));
});

router.post("/like", (req, res) => {
  if (req.body.isLiked) {
    const like = new Like({
      userId: req.user._id,
      workoutId: req.body.workoutId,
    });
    like.save().then((like) => {});
  } else {
    Like.deleteOne({
      userId: req.user._id,
      workoutId: req.body.workoutId,
    }).then(() => {});
  }
});

router.get("/like", (req, res) => {
  Like.find({ userId: req.query.userId, workoutId: req.query.workoutId }).then((like) => {
    res.send(like);
  });
});

router.post("/star", (req, res) => {
  if (req.body.isStarred) {
    const star = new Star({
      userId: req.user._id,
      workoutId: req.body.workoutId,
    });
    star.save().then((star) => {});
  } else {
    Star.deleteOne({
      userId: req.user._id,
      workoutId: req.body.workoutId,
    }).then(() => {});
  }
});

router.get("/star", (req, res) => {
  Star.find({ userId: req.query.userId, workoutId: req.query.workoutId }).then((star) => {
    res.send(star);
  });
});

router.get("/nukedb", (req, res) => {
  Comment.deleteMany({}).then((comments) => {});
  Exercise.deleteMany({}).then((comments) => {});
  Like.deleteMany({}).then((comments) => {});
  Star.deleteMany({}).then((comments) => {});
  User.deleteMany({}).then((comments) => {});
  Workout.deleteMany({}).then((comments) => {});
});

router.post("/image/upload", async (req, res) => {
  fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: {
      Authorization: "Client-ID a670efe26c0f9b7",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: req.body.file, // Assuming this is a base64 encoded string
      type: "base64",
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Imgur API responded with status: ${response}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data.success) {
        throw new Error("Failed to upload image to Imgur");
      }
      User.findById(req.user._id).then((user) => {
        user.profile_picture = data.data.link;
        user.save().then((user) => res.send(user));
      });
    })
    .catch((error) => {
      console.error("Here Error:", error);
      res.status(500).send("An error occurred");
    });
});

router.get("/user/info", (req, res) => {
  User.findById(req.query.creator_id).then((user) => {
    res.send(user);
  });
});

router.get("/user/profile/:userId", (req, res) => {
  const userId = req.params.userId;
  User.findById(userId).then((user) => res.send(user));
});

router.post("/user/update", (req, res) => {
  User.findById(req.user._id).then((user) => {
    user.name = req.body.name;
    user.bio = req.body.bio;
    user.save().then((user) => res.send(user));
  });
});

router.get("/users/explore", (req, res) => {
  let idsToExclude = [];

  // Convert req.user._id to a string and add it to idsToExclude
  if (req.user && req.user._id) {
    idsToExclude.push(req.user._id.toString());
  }

  // Check if 'ids' query parameter exists
  if (req.query.ids) {
    if (Array.isArray(req.query.ids)) {
      // If 'ids' is already an array, add them to idsToExclude
      idsToExclude = idsToExclude.concat(req.query.ids.map((id) => id.toString()));
    } else if (typeof req.query.ids === "string" && req.query.ids.length > 0) {
      // If 'ids' is a string, split it into an array and add them to idsToExclude
      idsToExclude = idsToExclude.concat(req.query.ids.split(","));
    }
  }

  User.find({ _id: { $nin: idsToExclude } })
    .limit(10)
    .then((users) => {
      res.json(users);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

router.post("/user/unfollow", (req, res) => {
  // Assuming req.user._id and req.body.follow_id are already validated and exist
  const userId = req.user._id;
  const unfollowId = req.body.follow_id;

  // Find the user who is being unfollowed
  User.findById(unfollowId)
    .then((userUnfollow) => {
      // Find the user who is unfollowing
      User.findById(userId)
        .then((user) => {
          // Check if the user is in the unfollow user's friends list
          let stillFollows = false;
          if (userUnfollow.friends.includes(userId) && !userUnfollow.requests.includes(userId)) {
            user.requests.push(userUnfollow._id);
            stillFollows = true;
          }

          //if unfollowing person who has you in their requests (they don't follow you back)
          if (userUnfollow.requests.includes(userId)) {
            userUnfollow.requests = userUnfollow.requests.filter((request) => request !== userId);
          }

          user.friends = user.friends.filter((friend) => friend !== unfollowId.toString());

          // Save both user documents
          Promise.all([userUnfollow.save(), user.save()])
            .then(() => {
              res.send({ user: userUnfollow, stillFollows: stillFollows });
            })
            .catch((err) => {
              res.status(500).send(err);
            });
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

router.post("/user/follow", (req, res) => {
  // Assuming req.user._id and req.body.follow_id are validated and exist
  const userId = req.user._id;
  const followId = req.body.follow_id;

  // Find the user to follow
  User.findById(followId)
    .then((userToFollow) => {
      // Find the user who is following
      User.findById(userId)
        .then((user) => {
          // Check if the user is already in the other user's friends list
          if (userToFollow.friends.includes(userId)) {
            // this should be in the user's "request"
            user.friends.push(userToFollow._id);
            user.requests = user.requests.filter(
              (requestId) => requestId !== userToFollow._id.toString()
            );
          } else {
            // this should be in user's explore
            if (!userToFollow.requests.includes(userId)) {
              userToFollow.requests.push(userId);
            }
            user.friends.push(userToFollow._id);
          }

          // Save both user documents
          Promise.all([userToFollow.save(), user.save()])
            .then(() => {
              res.send(userToFollow);
            })
            .catch((err) => {
              res.status(500).send(err);
            });
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

router.post("/query", (req, res) => {
  const makeQuery = async () => {
    try {
      const prompt = {
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              `Your role is to be a professional personal trainer named FitBot which answer questions for ${req.user.name}.\n` +
              "Please do not mention that you were given any context in your response and be very professional.",
          },
          { role: "user", content: `${req.body.query}` },
        ],
        // temperature controls the variance in the llms responses
        // higher temperature = more variance
        temperature: 0.7,
      };
      const completion = await anyscale.chat.completions.create(prompt);
      res.send({ response: completion.choices[0].message.content });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send({});
    }
  };

  makeQuery();
});

// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
