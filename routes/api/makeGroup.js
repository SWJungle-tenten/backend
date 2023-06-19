const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const { addGroupMember } = require('../../function/addGroupMember');

const extractOwnerInf = async (token, secretKey) => {
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
      const owneremail = user.email;
      const data = {
        name: ownername,
        email: owneremail,
      };
      client.close();
      return data;
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

const makeGroup = async (username, groupName) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const session = client.startSession(); // 세션 생성
    session.startTransaction(); // 트랜잭션 시작
    console.log('Atlas에 연결 완료');
    const database = client.db('test');
    const groupCollection = database.collection('group');

    const groupOwner = username;
    const members = [];
    const query = {
      groupName: groupName,
      groupOwner: groupOwner,
    };
    // 동일한 groupName과 groupOwner를 가진 도큐먼트가 있는지 확인
    const existingDocument = await groupCollection.findOne(query);
    if (existingDocument) {
      session.endSession(); // 세션 종료
      client.close();
      return groupName;
    }
    const groupDocument = {
      groupName: groupName,
      groupOwner: groupOwner,
      members: members,
    };
    const result = await groupCollection.insertOne(groupDocument);
    await session.commitTransaction(); // 트랜잭션 커밋
    session.endSession(); // 세션 종료
    client.close();
    return result.insertedId;
  } catch (error) {
    await session.abortTransaction(); // 트랜잭션 롤백
    session.endSession(); // 세션 종료
    client.close();
    throw error;
  }
};

router.post('/', async (req, res) => {
  try {
    const { groupName, members } = req.body;
    const authorizationHeader = req.headers.authorization;
    let userToken = null;
    if (authorizationHeader && authorizationHeader.startsWith('Bearer')) {
      userToken = authorizationHeader.substring(7); // "Bearer " 부분을 제외한 토큰 값 추출
    }
    const groupOwner = await extractOwnerInf(userToken, process.env.jwtSecret);
    const insertedID = await makeGroup(groupOwner.name, groupName);
    if (insertedID === groupName) {
      return res.status(400).json({ message: '같은 이름의 그룹이 이미 존재' });
    }
    await extractMemberID(groupOwner.email, groupName, groupOwner.name);
    if (members.length === 0) {
      // members 배열이 비어있을 경우 예외 처리
      return res.status(200).json({ message: '멤버가 없는 그룹 추가 완료' });
    }
    for (const memberEmail of members) {
      const memberID = await extractMemberID(memberEmail, groupName, groupOwner.name);
      await addGroupMember(memberID, groupName, groupOwner.name);
    }
    res.status(200).json({ message: '그룹 및 멤버 추가 완료' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
