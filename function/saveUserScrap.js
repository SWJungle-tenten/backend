require("dotenv").config();
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const conn_str = process.env.mongoURI;
const secretKey = process.env.jwtSecret;

const extractUserName = async (token, secretKey) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    const decodedUser = decoded.user;
    const userID = String(decodedUser.id);
    const client = await MongoClient.connect(conn_str);
    const database = client.db('test');
    const usersCollection = database.collection('users');
    const user = await usersCollection.findOne({_id: new ObjectId(userID)});
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
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  const time = now.toLocaleTimeString();
  const dateTime = {
    time: time,
    date: date,
  };
  return dateTime;
};

const saveUserScrap = async (username, keyWord, url, date, time, title, res) => {
  try {
    const client = await MongoClient.connect(conn_str);
    console.log('Atlas에 연결 완료');
    const database = client.db('search');
    const userScrapCollection = database.collection(username);
    const collectionExists = (await userScrapCollection.countDocuments()) > 0;

    if (collectionExists) {
      const query = {
        'keyWords.keyWord': keyWord,
        'keyWords.date': date,
      };
      const keyWordObj = {
        title: title,
        url: url,
        time: time,
      };

      const existingScrap = await userScrapCollection.findOne(query);
      if (existingScrap && existingScrap.keyWords.some((kw) => kw.data.some((data) => data.title === title))) {
        console.log('중복된 스크랩입니다.');
        return { error: '중복된 스크랩' };
      }

      const update = {
        $push: {
          'keyWords.$.data': keyWordObj,
        },
      };
      const result = await userScrapCollection.updateOne(query, update);
      if (result.matchedCount === 0) {
        await userScrapCollection.updateOne(
          { user: username },
          {
            $push: {
              keyWords: {
                keyWord: keyWord,
                data: [
                  {
                    title: title,
                    url: url,
                    time: time,
                  },
                ],
                date: date,
              },
            },
          }
        );
      } else {
        console.log('url이 성공적으로 추가되었다.');
      }
    } else {
      const newDocument = {
        user: username,
        keyWords: [
          {
            keyWord: keyWord,
            data: [
              {
                title: title,
                url: url,
                time: time,
              },
            ],
            date: date,
          },
        ],
      };
      await userScrapCollection.insertOne(newDocument);
    }
    client.close();
    return { success: '저장완료' };
  } catch (error) {
    console.error('Atlas 및 데이터 저장 오류:', error);
    return { error: '데이터 저장 오류' };
  }
};

module.exports = { saveUserScrap };
