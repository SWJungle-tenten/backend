const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;

// 최신 날짜 순으로 키워드 정렬, 키워드에 해당하는 url은 시간 순으로 정렬
const groupKeywordByDate = async (groupOwner, groupName) => {
  try {
    const client = await MongoClient.connect(conn_str);
    console.log('Atlas에 연결 완료');
    const database = client.db('groupScrap');
    const collectionName = `${groupName}_${groupOwner}`;
    const groupScrapCollection = database.collection(collectionName);
    // 컬렉션이 없으면, 즉 아직 스크랩이 없으면 null 반환
    const cursor = groupScrapCollection.aggregate([
      {
        $sort: {
          date: -1,
          time: -1,
        },
      },
      {
        $group: {
          _id: {
            date: '$date',
            keyword: '$keyWord',
          },
          title: {
            $push: '$title',
          },
          url: {
            $push: '$url',
          },
          time: {
            $push: '$time',
          },
          user: {
            $push: '$user',
          },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          keywords: {
            $push: {
              keyword: '$_id.keyword',
              titles: '$title',
              urls: '$url',
              times: '$time',
              users: '$user',
            },
          },
        },
      },
      {
        $unwind: '$keywords',
      },
      {
        $sort: {
          date: -1,
          'keywords.times': -1,
        },
      },
      {
        $project: {
          date: '$_id',
          keywords: 1,
          _id: 0,
        },
      },
    ]);
    const result = await cursor.toArray();
    result.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });
    // result를 클라이언트에게 전송
    client.close();

    return result;
  } catch (error) {
    throw error;
  }
};

router.post('/', async (req, res) => {
  const { groupName, groupOwner } = req.body;
  // const authorizationHeader = req.headers.authorization;
  // console.log(authorizationHeader)
  // if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
  //   const userToken = authorizationHeader.substring(7); // "Bearer " 부분을 제외한 토큰 값 추출
  //   console.log(userToken);
  // }
  try {
    const dataToSend = await groupKeywordByDate(groupOwner, groupName);
    if (dataToSend === null) {
      res.status(200).json({ message: 'No scraped data' });
    } else {
      res.status(200).json({ dataToSend });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
