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
app.set('io', io);

const { getDateAndTime } = require('../../function/getDateAndTime');
// token과 secretkey이용해서 _id, username추출
const extractUserName = async (token, secretKey, client) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    const decodedUser = decoded.user; // 사용자 ID 반환
    const userID = String(decodedUser.id);
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

const saveGroupScrap = async (username, groupName, groupOwner, keyWord, url, title, date, time, client) => {
  try {
    const database = client.db('groupScrap');
    const collectionName = `${groupName}_${groupOwner}`;
    const usersCollection = database.collection(collectionName);

    // 중복 스크랩 검사
    const existingScrap = await usersCollection.findOne({ keyWord, title });
    if (existingScrap) {
      return { message: 'duplicate' }; // 중복 처리
    }

    const scrap = {
      user: username,
      keyWord: keyWord,
      title: title,
      url: url,
      time: time, // 현재 시간
      date: date, // 현재 날짜
    };

    const result = await usersCollection.insertOne(scrap);
    if (result) {
      return; // 삽입 성공
    } else {
      throw new Error('Failed');
    }
  } catch (error) {
    throw new Error('Failed');
  }
};

router.post('/', async (req, res) => {
  const client = await MongoClient.connect(conn_str);
  const session = client.startSession(); // 세션 생성
  session.startTransaction(); // 트랜잭션 시작
  try {
    const { userToken, groupName, groupOwner, keyWord, url, title } = req.body;
    const dateTime = await getDateAndTime();

    const username = await extractUserName(userToken, process.env.jwtSecret, client);
    await saveGroupScrap(username, groupName, groupOwner, keyWord, url, title, dateTime.date, dateTime.time, client);
    const scrap = {
      user: username,
      keyWord: keyWord,
      url: url,
      title: title,
      time: dateTime.time, // 현재 시간
      date: dateTime.date, // 현재 날짜
    };
    await session.commitTransaction(); // 트랜잭션 커밋
    session.endSession(); // 세션 종료
    client.close();
    io.emit('groupScrapDataUpdate', scrap);
    console.log(scrap);
    res.status(200).json({ message: 'complete' });
  } catch (error) {
    console.error(error);
    await session.abortTransaction(); // 트랜잭션 커밋
    session.endSession(); // 세션 종료
    client.close();
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
