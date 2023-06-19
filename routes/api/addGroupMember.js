const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const { addGroupMember } = require('../../function/addGroupMember');

const extractOwnerName = async (token, secretKey) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    const decodedUser = decoded.user; // 사용자 ID 반환
    const userID = String(decodedUser.id);
    const client = await MongoClient.connect(conn_str);
    const database = client.db('test');
    const usersCollection = database.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userID) });
    if (user) {
      const ownername = user.name;
      client.close();
      return ownername;
    } else {
      client.close();
      throw new Error('User not found');
    }
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const extractMemberID = async (email, groupName, groupOwner) => {
  let client;
  try {
    client = await MongoClient.connect(conn_str);
    const session = client.startSession(); // 세션 생성
    session.startTransaction(); // 트랜잭션 시작
    const database = client.db('test');
    const usersCollection = database.collection('users');
    const user = await usersCollection.findOne({ email: email });

    if (user) {
      const updateObj = { $set: { group: {} } };
      if (user.group) {
        updateObj.$set.group = { ...user.group }; // 복사하여 기존 그룹 정보 유지
      }
      updateObj.$set.group[groupName] = groupOwner;
      const updatedUser = await usersCollection.findOneAndUpdate({ email: email }, updateObj);
      if (updatedUser) {
        const userId = updatedUser.value._id;
        await session.commitTransaction(); // 트랜잭션 커밋
        session.endSession(); // 세션 종료
        client.close();
        return userId;
      } else {
        await session.abortTransaction(); // 트랜잭션 롤백
        session.endSession(); // 세션 종료
        client.close();
        throw new Error('Failed to add group to user');
      }
    } else {
      await session.abortTransaction(); // 트랜잭션 롤백
      session.endSession(); // 세션 종료
      client.close();
      throw new Error('User not found');
    }
  } catch (error) {
    if (client) {
      await session.abortTransaction(); // 트랜잭션 롤백
      session.endSession(); // 세션 종료
      client.close();
    }
    throw new Error('Invalid token');
  }
};

router.post('/', async (req, res) => {
  try {
    const { groupName, email } = req.body;
    const authorizationHeader = req.headers.authorization;
    let userToken = null;
    if (authorizationHeader && authorizationHeader.startsWith('Bearer')) {
      userToken = authorizationHeader.substring(7); // "Bearer " 부분을 제외한 토큰 값 추출
    }
    // 멤버 정보에 그룹 추가, id추출
    const groupOwner = await extractOwnerName(userToken, process.env.jwtSecret);
    const memberID = await extractMemberID(email, groupName, groupOwner);
    // 그룹에 멤버 추가
    const message = await addGroupMember(memberID, groupName, groupOwner);
    res.status(200).json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
