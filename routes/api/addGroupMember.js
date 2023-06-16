const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

// token과 secretkey이용해서 _id, username추출
const extractMemberName = async (email) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('test');
    const usersCollection = database.collection('users');
    const user = await usersCollection.findOne({ email: email });
    if (user) {
      const userInformation = {
        username: user.name,
        _id: user._id,
      };
      return userInformation;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    throw new Error('Invalid token');
  }
};

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
      return ownername;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// search->memberName에 group추가하고 ID반환
const addGroupMember = async (memberID, memberName, groupName, groupOwner) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('search');
    const usersCollection = database.collection(group);
    const query = { groupName, groupOwner };
    const update = { $push: { members: memberID } };

    const result = await groupCollection.updateOne(query, update);
    console.log('그룹 멤버 추가 완료');

    const updatedDocument = await groupCollection.findOne(query);
    const insertedID = updatedDocument._id;

    client.close();
    return insertedID;
  } catch (error) {}
};

const addMemberGroup = async (memberName, groupID, groupName) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('search');
    const memberCollection = database.collection(memberName);

    const document = {
      groupName: groupName,
      group: groupID,
    };

    await memberCollection.insertOne(document);
    console.log('멤버 그룹 추가 완료');
    client.close();
  } catch (error) {
    throw error;
  }
};

router.post('/', async (req, res) => {
  try {
    const { userToken, groupName, email } = req.body;
    const memberInf = await extractMemberName(email);
    const groupOwner = await extractOwnerName(userToken, process.env.jwtSecret);
    // memberName인 컬렉션 찾아서 그 소속 그룹 추가하고, 유저 스크랩ID return
    const groupID = await addGroupMember(memberInf._id, memberInf.username, groupName, groupOwner);
    // test->groupt 컬렉션에서 groupName에 해당하는 도큐먼트 찾아서 members에 유저 스크랩ID 넣기
    await addMemberGroup(memberInf.username, groupID, groupName);
    res.status(200).json({message: '멤버 추가 성공'})
  } catch (error) {
    res.status(400).json({message: '멤버 추가 실패'})
  }
});

module.exports = router;
