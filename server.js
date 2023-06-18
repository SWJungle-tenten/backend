const express = require('express');
const connectDB = require('./config/db');
const app = express();

app.use(express.json());
const cors = require('cors');
app.use(cors());

app.use(express.json({ extended: false }));

/* socket.io */
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE'],
  },
});

app.set('io', io);

const { extractUserName } = require('./function/keyWordByDate');
const { saveUserScrap } = require('./function/saveUserScrap');
const { getDateAndTime } = require('./function/getDateAndTime');
const { deleteKeyWord } = require('./function/deleteKeyWord');
const { deleteUserScrap } = require('./function/deleteUserScrap');

app.get('/', (req, res) => {
  res.send('API Running');
});

connectDB();

const authRouter = require('./routes/api/auth');
app.use('/api/auth', authRouter);

const registerRouter = require('./routes/api/register');
app.use('/api/register', registerRouter);

const loginRouter = require('./routes/api/login');
app.use('/api/login', loginRouter);

const giveUserNameRouter = require('./routes/api/giveUserName');
app.use('/api/giveUserName', giveUserNameRouter);

const logoutRouter = require('./routes/api/logout');
app.use('/api/logout', logoutRouter);

const saveUserScrapRouter = require('./routes/api/saveUserScrap');
app.use('/api/saveUserScrap', saveUserScrapRouter);

const makeGroupRouter = require('./routes/api/makeGroup');
app.use('/api/makeGroup', makeGroupRouter);

const addGroupMemberRouter = require('./routes/api/addGroupMember');
app.use('/api/addGroupMember', addGroupMemberRouter);

const saveGroupScrapRouter = require('./routes/api/saveGroupScrap');
app.use('/api/saveGroupScrap', saveGroupScrapRouter);

const showGroupScrap = require('./routes/api/showGroupScrap');
app.use('/api/showGroupScrap', showGroupScrap);

const keyWordByDate = require('./routes/api/keyWordByDate');
app.use('/api/keyWordByDate', keyWordByDate);

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('check storage request from client', async (msg) => {
    const userToken = msg.userToken;
    const username = await extractUserName(userToken);
    const dataToSend = await keyWordByDate(username);

    socket.emit('check storage respond from server', {
      dataToSend,
    });
  });

  let cachedUsername;

  socket.on('saveUserScrap request from client', async (msg) => {
    // extractUserName 결과를 캐싱하여 중복 호출을 피함
    let username = cachedUsername;

    if (!username) {
      username = await extractUserName(msg.userToken, process.env.jwtSecret);
      cachedUsername = username;
    }
    const dateTime = await getDateAndTime();
    const result = await saveUserScrap(username, msg.keyWord, msg.url, dateTime.date, dateTime.time, msg.title);

    // DB에 update된 내용을 다시 보내주기
    const dataToSend = await keyWordByDate(username);
    socket.emit('saveUserScrap respond from server', {
      dataToSend,
    });
  });

  socket.on('deleteKeyWord request from client', async (msg) => {
    const username = await extractUserName(msg.userToken, process.env.jwtSecret);
    const result = await deleteKeyWord(username, msg.keyWord, msg.date);
    // DB에 update된 내용을 다시 보내주기
    console.log(result);
    const dataToSend = await keyWordByDate(username);

    socket.emit('deleteKeyWord respond from server', {
      dataToSend,
    });
  });

  socket.on('deleteUserScrap request from client', async (msg) => {
    const username = await extractUserName(msg.userToken, process.env.jwtSecret);
    const result = await deleteUserScrap(username, msg.url, msg.title, msg.date);
    console.log(result);
    // DB에 update된 내용을 다시 보내주기
    const dataToSend = await keyWordByDate(username);
    socket.emit('deleteUserScrap respond from server', {
      dataToSend,
    });
  });
});

server.listen(8080, () => {
  console.log('listening on *:8080');
});
