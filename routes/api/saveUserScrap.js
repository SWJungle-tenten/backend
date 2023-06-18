const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const conn_str = process.env.mongoURI;
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());
const cors = require('cors');
app.use(cors());

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

const { keyWordByDate } = require('../../function/keyWordByDate');
const { saveUserScrap } = require('../../function/saveUserScrap');
const { getDateAndTime } = require('../../function/getDateAndTime');
app.set('io', io);

// token과 secretkey이용해서 _id, username추출
const extractUserName = async (token, secretKey) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    const decodedUser = decoded.user; // 사용자 ID 반환
    const userID = String(decodedUser.id);
    const client = await MongoClient.connect(conn_str);
    const database = client.db('test');
    const usersCollection = database.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userID) });
    if (user) {
      const userName = user.name;
      return userName;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// const sendDataViaSocket = async (data) => {
//   io.emit('scrapDataUpdate', data);
//   io.on('error', (error) => {
//     console.error('Socket error:', error);
//   });
// };

router.post('/', async (req, res) => {
  try {
    const { userToken, keyWord, url, title } = req.body;
    const dateTime = await getDateAndTime();
    const username = await extractUserName(userToken, process.env.jwtSecret);
    const result = await saveUserScrap(username, keyWord, url, dateTime.date, dateTime.time, title);
    const dataToSend = await keyWordByDate(username);
    // sendDataViaSocket(dataToSend);
    // res.status(200).json({ message: result });
    res.status(200).json(dataToSend);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
