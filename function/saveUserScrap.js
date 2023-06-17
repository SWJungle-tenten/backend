require('dotenv').config();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;

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

module.exports = { saveUserScrap };
