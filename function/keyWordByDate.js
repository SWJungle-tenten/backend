require("dotenv").config();
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const conn_str = process.env.mongoURI;
const secretKey = process.env.jwtSecret;

// token과 secretkey이용해서 _id, username추출
const extractUserName = async (token) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    const decodedUser = decoded.user; // 사용자 ID 반환
    const userID = String(decodedUser.id);
    const client = await MongoClient.connect(conn_str);
    const database = client.db("test");
    const usersCollection = database.collection("users");
    const user = await usersCollection.findOne({ _id: new ObjectId(userID) });

    if (user) {
      const userName = user.name;
      return userName;
    } else {
      throw new Error("User not found");
    }
  } catch (error) {
    throw new Error("Invalid token");
  }
};

// 최신 날짜 순으로 키워드 정렬, 키워드에 해당하는 url은 시간 순으로 정렬
const keyWordByDate = async (username) => {
  try {
    const client = await MongoClient.connect(conn_str);
    console.log("Atlas에 연결 완료");
    const database = client.db("search");
    const userScrapCollection = database.collection(username);
    const result = await userScrapCollection.findOne({ user: username });
    // 날짜를 기준으로 keyWord 묶기
    if (result === null) {
      return result;
    }
    const groupedByDate = {};
    result.keyWords.forEach((keyword) => {
      const date = keyword.date;
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(keyword);
    });

    // keyWord 순서를 data 배열에 있는 시간 순으로 정렬
    Object.values(groupedByDate).forEach((keywords) => {
      keywords.sort((a, b) => b.data[0].time.localeCompare(a.data[0].time));
      keywords.forEach((keyword) => {
        keyword.data.sort((a, b) => b.time.localeCompare(a.time));
      });
    });

    const sortedByDate = Object.entries(groupedByDate).sort((a, b) =>
      b[0].localeCompare(a[0])
    );
    // 클라이언트에게 보낼 데이터 생성
    const dataToSend = sortedByDate.map(([date, keywords]) => ({
      date,
      keywords,
    }));
    // 클라이언트에게 데이터 전송
    client.close();
    return dataToSend;
  } catch (error) {
    throw error;
  }
};

// 함수를 export
module.exports = {
  extractUserName,
  keyWordByDate,
};
