require('dotenv').config();
const { MongoClient } = require('mongodb');
const conn_str = process.env.mongoURI;

const extractImages = async (username) => {
  const client = await MongoClient.connect(conn_str);
  let images;
  try {
    const database = client.db('scrapData');
    const scrapCollection = database.collection(username);

    // Find all documents and include only the 'img' field
    const documents = await scrapCollection.find({}, { projection: { _id: 0, img: 1 } }).toArray();

    // Extract 'img' field from each document
    images = documents.flatMap((document) => document.img).reverse();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    client.close();
  }
  return images;
};

module.exports = { extractImages };
