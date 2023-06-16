require("dotenv").config();
const { MongoClient } = require("mongodb");
const conn_str = process.env.mongoURI;




const deleteKeyWord = async (username, keyWord, date, res) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db("search");
    const userScrapCollection = database.collection(username);
    const result = await userScrapCollection.findOne({ user: username });

    // keyWord에 해당하는 데이터 삭제
    result.keyWords = result.keyWords.filter(
      (keyword) => !(keyword.date === date && keyword.keyWord === keyWord)
    );

    if (result.keyWords.length === 0) {
      // keyWords 배열이 모두 비었을 경우 컬렉션 삭제
      await userScrapCollection.drop();
    }

    await userScrapCollection.updateOne(
      { user: username },
      { $set: { keyWords: result.keyWords } }
    );
    return { message: "데이터 삭제 완료" };
  } catch (error) {
    console.error(error);
    res.status(500).json("스크랩 삭제 오류");
  }
};

module.exports = { deleteKeyWord };

