require("dotenv").config();
const { MongoClient } = require("mongodb");
const conn_str = process.env.mongoURI;

const addGroupMember = async (memberID, groupname, groupowner) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const session = client.startSession(); // 세션 생성
    session.startTransaction(); // 트랜잭션 시작
    const database = client.db('test');
    const groupCollection = database.collection('group');
    const query = {
      groupName: groupname,
      groupOwner: groupowner,
    };
    const update = { $addToSet: { members: memberID } };
    await groupCollection.updateOne(query, update, { session }); // 세션 사용하여 업데이트
    const updatedDocument = await groupCollection.findOne(query);
    if (!updatedDocument) {
      await session.abortTransaction(); // 트랜잭션 롤백
      session.endSession(); // 세션 종료
      client.close();
      throw new Error('멤버 추가 실패');
    }
    const insertedID = updatedDocument._id;
    await session.commitTransaction(); // 트랜잭션 커밋
    session.endSession(); // 세션 종료
    client.close();
    return insertedID;
  } catch (error) {
    await session.abortTransaction(); // 트랜잭션 롤백
    session.endSession(); // 세션 종료
    client.close();
    throw error;
  }
};

module.exports = { addGroupMember };