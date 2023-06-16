const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

// token과 secretkey이용해서 _id, username추출
const extractUserName = async (token, secretKey) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    const decodedUser = decoded.user; // 사용자 ID 반환
    const userID = String(decodedUser.id);
    const client = await MongoClient.connect(conn_str);
    const database = client.db('test');
    const usersCollection = database.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userID) });
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

const makeGroup = async (username, groupName) => {
  try {
    const client = await MongoClient.connect(conn_str);
    console.log('Atlas에 연결 완료');
    const database = client.db('test');
    const groupCollection = database.collection('group');

    const groupOwner = username;
    const members = [];

    const groupDocument = {
      groupName: groupName,
      groupOwner: groupOwner,
      members: members,
    };

    // 그룹 컬렉션이 존재하지 않으면 새로 생성합니다.
    const collectionExists = (await groupCollection.countDocuments()) > 0;
    if (!collectionExists) {
      await database.createCollection('group');
    }

    const result = await groupCollection.insertOne(groupDocument);
    console.log('그룹 다큐먼트 추가');

    client.close();
    return result.insertedId;
  } catch (error) {
    throw error;
  }
};

const addGroupInUser = async (groupName, username, insertedID) => {
  try {
    const client = await MongoClient.connect(conn_str);
    console.log('Atlas에 연결 완료');
    const database = client.db('search');
    const userCollection = database.collection(username);

    const groupDocument = {
      groupName: groupName,
      group: insertedID, // 그룹 도큐먼트의 ID
    };

    const result = await userCollection.insertOne(groupDocument);
    console.log('유저 컬렉션에 그룹 추가 완료');

    client.close();
  } catch (error) {
    throw error;
  }
};

router.post('/', async (req, res) => {
  try {
    const { userToken, groupName } = req.body;
    const username = await extractUserName(userToken, process.env.jwtSecret);
    const insertedID = await makeGroup(username, groupName);
    console.log(insertedID);
    await addGroupInUser(groupName, username, insertedID);
    res.status(200).json({ message: '그룹 추가 완료' });
  } catch (error) {
    res.status(500).json('그룹 생성 실패');
  }
});

module.exports = router;
