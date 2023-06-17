const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
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

const getDateAndTime = async () => {
  const now = new Date(); // 현재 시간을 가져옴
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const time = `${hours}:${minutes}:${seconds}`;
  const dateTime = {
    time: time,
    date: date,
  };
  return dateTime;
};

// 개인 유저 스크랩하기
const saveUserScrap = async (username, keyWord, url, date, time, title, res) => {
  let client;
  try {
    client = await MongoClient.connect(conn_str);
    const session = client.startSession(); // 세션 생성
    session.startTransaction(); // 트랜잭션 시작
    console.log('Atlas에 연결 완료');
    const database = client.db('dbtest');
    const scrapCollection = database.collection(username);

    const newScrap = {
      user: username,
      keyWord: keyWord,
      title: title,
      url: url,
      time: time,
      date: date,
    };
    const result = await scrapCollection.findOne({ title: title });
    if (result) {
      console.log('이미 있는 스크랩입니다.');
      return res.status(409).send('이미 있는 스크랩');
    } else {
      const insertResult = await scrapCollection.insertOne(newScrap);
      if (insertResult.insertedId) {
        console.log('스크랩이 성공적으로 저장되었습니다.');
        const dataToSend = await keyWordByDate(username);
        io.emit('scrapDataUpdate', dataToSend);
        res.status(200).json({ message: '스크랩 성공' });
      } else {
        console.log('스크랩 저장에 실패했습니다.');
        res.status(500).json({ message: '스크랩 실패' });
      }
    }
  } catch (error) {
    throw error;
  } finally {
    if (client) {
      client.close();
    }
  }
};

router.post('/', async (req, res) => {
  const { userToken, keyWord, url, title } = req.body;
  const dateTime = await getDateAndTime();
  const username = await extractUserName(userToken, process.env.jwtSecret);
  await saveUserScrap(username, keyWord, url, dateTime.date, dateTime.time, title, res);
});

module.exports = router;
