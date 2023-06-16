const express = require("express");
const connectDB = require("./config/db");
const app = express();
const PORT = 8080;
app.use(express.json());
const cors = require("cors");
app.use(cors());
app.use(express.json({ extended: false }));

/* socket.io */
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const { extractUserName, keyWordByDate } = require("./function/keyWordByDate");

app.get("/", (req, res) => {
  res.send("API Running");
});

connectDB();

// app.get("/", (req, res) => {
//   res.send("API Running");
// });

/*
const authRouter = require("./routes/api/auth");
app.use("/api/auth", authRouter);

const registerRouter = require("./routes/api/register");
app.use("/api/register", registerRouter);

const loginRouter = require("./routes/api/login");
app.use("/api/login", loginRouter);

const deleteUserScrapRouter = require("./routes/api/deleteUserScrap");
app.use("/api/deleteUserScrap", deleteUserScrapRouter);

const saveUserScrapRouter = require("./routes/api/saveUserScrap");
app.use("/api/saveUserScrap", saveUserScrapRouter);

const keyWordByDateRouter = require("./routes/api/keyWordByDate");
app.use("/api/keyWordByDate", keyWordByDateRouter);

const deleteKeyWordRouter = require("./routes/api/deleteKeyWord");
app.use("/api/deleteKeyWord", deleteKeyWordRouter);

const giveUserName = require("./routes/api/giveUserName");
app.use("/api/giveUserName", giveUserName);

const logoutRouter = require("./routes/api/logout");
app.use("/api/logout", logoutRouter);
*/


// connectDB();

// app.listen(PORT, () => console.log(`Server started on port ${PORT}`));


io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("check storage request from client", async (msg) => {
    const userToken = msg.userToken;
    const username = await extractUserName(userToken);
    const dataToSend = await keyWordByDate(username);

    socket.emit("check storage respond from server", {
      dataToSend
    });
  });
});

server.listen(6000, () => {
  console.log("listening on *:6000");
});
