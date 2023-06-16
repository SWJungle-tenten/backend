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
      username = user.name;
      client.close();
      return username;
    } else {
      client.close();
      throw new Error('User not found');
    }
  } catch (error) {
    client.close();
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
      client.close();
      return ownername;
    } else {
      client.close();
      throw new Error('User not found');
    }
    client.close();
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const extractMemberID = async (membername) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('search');
    const usersCollection = database.collection(membername);
    const user = await usersCollection.findOne({ user: membername });
    if (user) {
      memberID = user._id;
      client.close();
      return memberID;
    }
  } catch (error) {
    throw error;
  }
};

// test->memberName에 group추가하고 ID반환
const addGroupMember = async (memberID, groupname, groupowner) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('test');
    const groupCollection = database.collection('group');
    const query = {
      groupName: groupname,
      groupOwner: groupowner,
      members: { $ne: memberID }, // 중복된 값이 없는 경우에만 추가
    };
    const update = { $addToSet: { members: memberID } };
    await groupCollection.updateOne(query, update);
    const updatedDocument = await groupCollection.findOne({ groupName: groupname, groupOwner: groupowner });
    const insertedID = updatedDocument._id;

    client.close();
    return insertedID;
  } catch (error) {
    console.log(error);
  }
};

const addMemberGroup = async (memberName, groupID, groupName) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('search');
    const memberCollection = database.collection(memberName);

    // 중복 처리를 위해 이미 해당 문서가 있는지 확인
    const existingDocument = await memberCollection.findOne({ groupName: groupName, group: groupID });
    if (existingDocument) {
      console.log('이미 해당 문서가 존재합니다.');
      client.close();
      return { message: '이미 해당 문서가 존재합니다. ' };
    }
    // if (groupID === null) {
    //   return { message: 'groupID가 없습니다.' };
    // }
    const document = {
      groupName: groupName,
      group: groupID,
    };

    await memberCollection.insertOne(document);
    client.close();
    return { message: '멤버 추가 성공' };
  } catch (error) {
    throw error;
  }
};

router.post('/', async (req, res) => {
  try {
    const { userToken, groupName, email } = req.body;
    const membername = await extractMemberName(email);
    const groupOwner = await extractOwnerName(userToken, process.env.jwtSecret);
    const memberID = await extractMemberID(membername);
    const groupID = await addGroupMember(memberID, groupName, groupOwner);
    const message = await addMemberGroup(membername, groupID, groupName);
    res.status(200).json(message);
  } catch (error) {
    res.status(400).json({ message: '멤버 추가 실패' });
  }
});

module.exports = router;
