const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

test('connectDB usa la URI directa cuando la URI Atlas SRV falla por DNS', async () => {
  const previousMongoUri = process.env.MONGO_URI;
  const previousDirectUri = process.env.MONGO_URI_DIRECT;
  const originalConnect = mongoose.connect;
  const connectCalls = [];
  const directConnection = { connection: { host: 'atlas-node.example', name: 'interclases' } };
  process.env.MONGO_URI = 'mongodb+srv://usuario:secreto@cluster.example/interclases';
  process.env.MONGO_URI_DIRECT = 'mongodb://usuario:secreto@atlas-node.example/interclases';
  mongoose.connect = async (uri, options) => {
    connectCalls.push({ uri, options });
    if (uri === process.env.MONGO_URI) {
      const error = new Error('querySrv ECONNREFUSED cluster.example');
      error.code = 'ECONNREFUSED';
      throw error;
    }
    return directConnection;
  };

  try {
    const connection = await connectDB();
    assert.equal(connection, directConnection);
    assert.equal(connectCalls.length, 2);
    assert.equal(connectCalls[1].uri, process.env.MONGO_URI_DIRECT);
    assert.deepEqual(connectCalls[0].options, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 8000,
      retryReads: true,
      retryWrites: true
    });
    assert.deepEqual(connectCalls[1].options, connectCalls[0].options);
  } finally {
    mongoose.connect = originalConnect;
    if (previousMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousMongoUri;
    if (previousDirectUri === undefined) delete process.env.MONGO_URI_DIRECT;
    else process.env.MONGO_URI_DIRECT = previousDirectUri;
  }
});

test('connectDB no usa la URI directa para errores de autenticación', async () => {
  const previousMongoUri = process.env.MONGO_URI;
  const previousDirectUri = process.env.MONGO_URI_DIRECT;
  const originalConnect = mongoose.connect;
  const connectCalls = [];
  process.env.MONGO_URI = 'mongodb+srv://usuario:secreto@cluster.example/interclases';
  process.env.MONGO_URI_DIRECT = 'mongodb://usuario:secreto@atlas-node.example/interclases';
  mongoose.connect = async (uri) => {
    connectCalls.push(uri);
    const error = new Error('Authentication failed');
    error.code = 'AuthenticationFailed';
    throw error;
  };

  try {
    await assert.rejects(connectDB(), /Authentication failed/);
    assert.deepEqual(connectCalls, [process.env.MONGO_URI]);
  } finally {
    mongoose.connect = originalConnect;
    if (previousMongoUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousMongoUri;
    if (previousDirectUri === undefined) delete process.env.MONGO_URI_DIRECT;
    else process.env.MONGO_URI_DIRECT = previousDirectUri;
  }
});
