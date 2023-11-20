const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();
// API - 1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 0);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const addUserQuery = `INSERT INTO user (username, password, name, gender)
         VALUES('${username}', '${hashedPassword}', '${name}', '${gender}');`;
      await db.run(addUserQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
// API -2
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;

        next();
      }
    });
  }
};

const convertResponseObjectToDbObjectApi3 = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    DateTime: dbObject.date_time,
  };
};
// API - 3
/*
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let { username } = request;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);

  const getFollowingUserIdsQuery = `SELECT following_user_id FROM follower WHERE follower_user_id = '${userDetails.user_id}';`;
  const followingUsers = await db.all(getFollowingUserIdsQuery);

  let tweets = [];
  for (let i = 0; i < followingUsers.length; i++) {
    const tweetQuery = `SELECT name, tweet, date_time FROM tweet JOIN user ON tweet.user_id = user.user_id WHERE tweet.user_id = ${followingUsers[i].following_user_id} ORDER BY date_time DESC LIMIT 4;`;
    const tweetResult = await db.all(tweetQuery);
    tweets = [...tweets, ...tweetResult];
  }
  response.send(
    tweets.map((dbObject) => convertResponseObjectToDbObjectApi3(dbObject))
});*/
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let { username } = request;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);

  const getFollowingUserIdsQuery = `SELECT following_user_id FROM follower WHERE follower_user_id = '${userDetails.user_id}';`;
  const followingUsers = await db.all(getFollowingUserIdsQuery);

  let tweets = [];
  for (let i = 0; i < followingUsers.length; i++) {
    const tweetQuery = `SELECT username, tweet, date_time FROM tweet JOIN user ON tweet.user_id = user.user_id WHERE tweet.user_id = ${followingUsers[i].following_user_id} ORDER BY date_time DESC LIMIT 4;`;
    const tweetResult = await db.all(tweetQuery);
    tweets = [...tweets, ...tweetResult];
  }
  tweets.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
  tweets = tweets.slice(0, 4);
  response.send(
    tweets.map((tweet) => ({
      username: tweet.username,
      tweet: tweet.tweet,
      dateTime: tweet.date_time,
    }))
  );
});

// API - 4
app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);

  const getFollowingUserNameQuery = `SELECT  name FROM follower JOIN user ON follower.following_user_id = user.user_id WHERE follower.follower_user_id = '${userDetails.user_id}';`;
  const followingUsers = await db.all(getFollowingUserNameQuery);
  response.send(followingUsers.map((user) => ({ name: user.name })));
});
// API - 5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  let { username } = request;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);

  const getFollowersUserNameQuery = `SELECT name FROM follower JOIN user ON follower.follower_user_id = user.user_id WHERE follower.following_user_id = '${userDetails.user_id}';`;
  const followersUsers = await db.all(getFollowersUserNameQuery);
  response.send(followersUsers);
});
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let { username } = request;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);

  const getFollowingUserIdsQuery = `SELECT following_user_id FROM follower WHERE follower_user_id = '${userDetails.user_id}';`;
  const followingUsers = await db.all(getFollowingUserIdsQuery);

  let tweets = [];
  for (let i = 0; i < followingUsers.length; i++) {
    const tweetQuery = `SELECT username, tweet, date_time FROM tweet JOIN user ON tweet.user_id = user.user_id WHERE tweet.user_id = ${followingUsers[i].following_user_id} ORDER BY date_time DESC LIMIT 4;`;
    const tweetResult = await db.all(tweetQuery);
    tweets = [...tweets, ...tweetResult];
  }
  tweets.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
  tweets = tweets.slice(0, 4);
  response.send(
    tweets.map((tweet) => ({
      username: tweet.username,
      tweet: tweet.tweet,
      dateTime: tweet.date_time,
    }))
  );
});

//API - 6
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  let { username } = request;
  const { tweetId } = request.params;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);

  const getFollowingUserIdsQuery = `SELECT following_user_id FROM follower WHERE follower_user_id = '${userDetails.user_id}';`;
  const followingUsers = await db.all(getFollowingUserIdsQuery);

  const getTweetDetailsQuery = `SELECT * FROM tweet WHERE tweet_id = '${tweetId}';`;
  const tweetDetails = await db.get(getTweetDetailsQuery);

  if (
    !followingUsers.some(
      (user) => user.following_user_id === tweetDetails.user_id
    )
  ) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const getLikesCountQuery = `SELECT COUNT(*) as likes FROM like WHERE tweet_id = '${tweetId}';`;
    const likesCount = await db.get(getLikesCountQuery);

    const getRepliesCountQuery = `SELECT COUNT(*) as replies FROM reply WHERE tweet_id = '${tweetId}';`;
    const repliesCount = await db.get(getRepliesCountQuery);

    response.send({
      tweet: tweetDetails.tweet,
      likes: likesCount.likes,
      replies: repliesCount.replies,
      dateTime: tweetDetails.date_time,
    });
  }
});
// API - 7
app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    const { tweetId } = request.params;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const userDetails = await db.get(selectUserQuery);

    const getFollowingUserIdsQuery = `SELECT following_user_id FROM follower WHERE follower_user_id = '${userDetails.user_id}';`;
    const followingUsers = await db.all(getFollowingUserIdsQuery);

    const getTweetDetailsQuery = `SELECT * FROM tweet WHERE tweet_id = '${tweetId}';`;
    const tweetDetails = await db.get(getTweetDetailsQuery);

    if (
      !followingUsers.some(
        (user) => user.following_user_id === tweetDetails.user_id
      )
    ) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const getLikesQuery = `SELECT username FROM like JOIN user ON like.user_id = user.user_id WHERE tweet_id = '${tweetId}';`;
      const likes = await db.all(getLikesQuery);
      response.send({ likes: likes.map((user) => user.username) });
    }
  }
);
// API - 8

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    const { tweetId } = request.params;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const userDetails = await db.get(selectUserQuery);

    const getFollowingUserIdsQuery = `SELECT following_user_id FROM follower WHERE follower_user_id = '${userDetails.user_id}';`;
    const followingUsers = await db.all(getFollowingUserIdsQuery);

    const getTweetDetailsQuery = `SELECT * FROM tweet WHERE tweet_id = '${tweetId}';`;
    const tweetDetails = await db.get(getTweetDetailsQuery);

    if (
      !followingUsers.some(
        (user) => user.following_user_id === tweetDetails.user_id
      )
    ) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const getRepliesQuery = `SELECT name, reply FROM reply JOIN user ON reply.user_id = user.user_id WHERE tweet_id = '${tweetId}';`;
      const replies = await db.all(getRepliesQuery);
      response.send({ replies: replies });
    }
  }
);
// API - 9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);

  const getTweetsQuery = `SELECT tweet, (SELECT COUNT(*) FROM like WHERE tweet_id = t.tweet_id) as likes, (SELECT COUNT(*) FROM reply WHERE tweet_id = t.tweet_id) as replies, date_time FROM tweet as t WHERE user_id = '${userDetails.user_id}';`;
  const tweets = await db.all(getTweetsQuery);

  response.send(
    tweets.map((tweet) => ({
      tweet: tweet.tweet,
      likes: tweet.likes,
      replies: tweet.replies,
      dateTime: tweet.date_time,
    }))
  );
});
// API - 10
app.post("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  const { tweet } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);

  let date = new Date();
  const addTweetQuery = `INSERT INTO tweet(tweet, user_id, date_time)
  VALUES ('${tweet}', '${userDetails.user_id}', '${date}');`;
  await db.run(addTweetQuery);
  response.send("Created a Tweet");
});
// API - 11
app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    const { tweetId } = request.params;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const userDetails = await db.get(selectUserQuery);

    const getTweetDetailsQuery = `SELECT * FROM tweet WHERE tweet_id = '${tweetId}';`;
    const tweetDetails = await db.get(getTweetDetailsQuery);

    if (userDetails.user_id !== tweetDetails.user_id) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const deleteTweetQuery = `DELETE FROM tweet WHERE tweet_id = '${tweetId}';`;
      await db.run(deleteTweetQuery);
      response.send("Tweet Removed");
    }
  }
);
module.exports = app;
