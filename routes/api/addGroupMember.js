const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

// token과 secretkey이용해서 membername추출
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
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// test->group에 member추가하고 ID반환
const addGroupMember = async (memberID, groupname, groupowner) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('test');
    const groupCollection = database.collection('group');
    const query = {
      groupName: groupname,
      groupOwner: groupowner,
    };
    const update = { $addToSet: { members: memberID } };
    await groupCollection.updateOne(query, update);
    const updatedDocument = await groupCollection.findOne(query);
    if (!updatedDocument) {
      throw new Error('멤버 추가에 실패했습니다.');
    }
    const insertedID = updatedDocument._id;

    client.close();
    return insertedID;
  } catch (error) {
    console.log(error);
  }
};

// search->memberName에 groupname추가, memberID반환
const addGroupInUser = async (memberName, groupName) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('search');
    const memberCollection = database.collection(memberName);

    // 중복 처리를 위해 이미 해당 멤버가 있는지 확인
    const existingDocument = await memberCollection.findOne({ groupName: groupName });
    if (existingDocument) {
      client.close();
      return groupName;
    }

    const document = {
      groupName: groupName,
    };

    const result = await memberCollection.insertOne(document);
    const insertedID = result.insertedId;
    client.close();
    return insertedID;
  } catch (error) {
    throw error;
  }
};

const addGroupID = async (groupID, memberID, memberName) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const database = client.db('search');
    const memberCollection = database.collection(memberName);
    const query = {
      _id: memberID,
    };
    const update = { $set: { group: groupID } };

    await memberCollection.updateOne(query, update);
    client.close();
    return { message: 'groupID 정상 추가' };
  } catch (error) {
    throw error;
  }
};

router.post('/', async (req, res) => {
  try {
    const { userToken, groupName, email } = req.body;
    const membername = await extractMemberName(email);
    const groupOwner = await extractOwnerName(userToken, process.env.jwtSecret);
    const memberID = await addGroupInUser(membername, groupName);
    if (memberID === groupName) {
      return res.json({ message: '이미 추가된 멤버' });
    }
    const groupID = await addGroupMember(memberID, groupName, groupOwner);
    const message = await addGroupID(groupID, memberID, membername);
    res.status(200).json(message);
  } catch (error) {
    res.status(400).json({ message: '멤버 추가 실패' });
  }
});

module.exports = router;
