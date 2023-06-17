const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

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
      await session.commitTransaction(); // 트랜잭션 커밋
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
    throw error;
  }
};

const addGroupInUser = async (groupName, username, insertedID) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const session = client.startSession(); // 세션 생성
    session.startTransaction(); // 트랜잭션 시작
    const database = client.db('search');
    const userCollection = database.collection(username);
    const groupDocument = {
      groupName: groupName,
      groupOwner: username,
      group: insertedID, // 그룹 도큐먼트의 ID
    };
    await userCollection.insertOne(groupDocument);
    await session.commitTransaction(); // 트랜잭션 커밋
    session.endSession(); // 세션 종료
    client.close();
  } catch (error) {
    await session.abortTransaction(); // 트랜잭션 롤백
    session.endSession(); // 세션 종료
    client.close();
    throw error;
  }
};

const addGroupInMember = async (memberName, groupName, groupOwner) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const session = client.startSession(); // 세션 생성
    session.startTransaction(); // 트랜잭션 시작
    const database = client.db('search');
    const memberCollection = database.collection(memberName);
    // 중복 처리를 위해 이미 해당 멤버가 있는지 확인
    const existingDocument = await memberCollection.findOne({ groupName: groupName, groupOwner: groupOwner });
    if (existingDocument) {
      await session.abortTransaction(); // 트랜잭션 롤백
      session.endSession(); // 세션 종료
      client.close();
      return groupName;
    }
    const document = {
      groupName: groupName,
      groupOwner: groupOwner,
    };
    const result = await memberCollection.insertOne(document);
    const insertedID = result.insertedId;
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

const addGroupID = async (groupID, memberID, memberName) => {
  try {
    const client = await MongoClient.connect(conn_str);
    const session = client.startSession(); // 세션 생성
    session.startTransaction(); // 트랜잭션 시작
    const database = client.db('search');
    const memberCollection = database.collection(memberName);
    const query = {
      _id: memberID,
    };
    const update = { $set: { group: groupID } };

    await memberCollection.updateOne(query, update, { session }); // 세션 사용하여 업데이트

    await session.commitTransaction(); // 트랜잭션 커밋
    session.endSession(); // 세션 종료
    client.close();

    return;
  } catch (error) {
    await session.abortTransaction(); // 트랜잭션 롤백
    session.endSession(); // 세션 종료
    client.close();
    throw error;
  }
};

router.post('/', async (req, res) => {
  try {
    const { userToken, groupName, members } = req.body;
    const groupOwner = await extractOwnerName(userToken, process.env.jwtSecret);
    const insertedID = await makeGroup(groupOwner, groupName);
    if (insertedID === groupName) {
      return res.status(400).json({ message: '같은 이름의 그룹이 이미 존재' });
    }
    await addGroupInUser(groupName, groupOwner, insertedID);
    if (members.length === 0) {
      // members 배열이 비어있을 경우 예외 처리
      return res.status(200).json({ message: '멤버가 없는 그룹 추가 완료' });
    }
    for (const memberEmail of members) {
      const memberName = await extractMemberName(memberEmail);
      const memberID = await addGroupInMember(memberName, groupName, groupOwner);
      if (memberID === groupName) {
        continue;
      }
      const groupID = await addGroupMember(memberID, groupName, groupOwner);
      await addGroupID(groupID, memberID, memberName);
    }

    res.status(200).json({ message: '그룹 및 멤버 추가 완료' });
  } catch (error) {
    res.status(500).json({ message: error });
  }
});

module.exports = router;
