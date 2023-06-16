require('dotenv').config();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;

// 스크랩 하나 삭제
const deleteUserScrap = async (username, url, title, date) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('search');
    const userScrapCollection = database.collection(username);
    const result = await userScrapCollection.findOne({ user: username });
    let dataDeleted = false;

    // keyWords 배열을 순회하면서 데이터 삭제
    for (let i = 0; i < result.keyWords.length; i++) {
      const keywordData = result.keyWords[i].data;
      const keywordDate = result.keyWords[i].date;
      if (keywordDate !== date) {
        continue;
      } else {
        const dataIndex = keywordData.findIndex((item) => item.title === title && item.url === url);
        if (dataIndex !== -1) {
          keywordData.splice(dataIndex, 1);
          dataDeleted = true;

          if (keywordData.length === 0) {
            // 데이터 배열이 비었을 경우 해당 키워드 삭제
            result.keyWords.splice(i, 1);
            if (result.keyWords.length === 0) {
              // keyWords 배열이 모두 비었을 경우 컬렉션 삭제
              await userScrapCollection.drop();
            }
          }
          break; // 삭제 완료 후 루프 종료
        }
      }
    }
    if (!dataDeleted) {
      // 해당 데이터가 없을 경우 에러 응답
      return { message: '해당 데이터를 찾을 수 없음' };
    }
    await userScrapCollection.updateOne({ user: username }, { $set: { keyWords: result.keyWords } });
    return { message: '데이터 삭제 완료' };
  } catch (error) {
    console.error(error);
  }
};

module.exports = { deleteUserScrap };
