import { MongoClient } from 'mongodb';

function getOps() {
  const ops = ['$set', '$unset', '$push', '$pop', '$addToSet'];
  const arg = { a: 1 };
  const _out: any[] = [];
  for (let i = 0; i < ops.length; i++) {
    for (let j = i+1; j < ops.length; j++) {
      _out.push({ [ops[i]]: arg, [ops[j]]: arg });
    }
  }
  return _out;
}

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/test');
  await client.connect();
  const collection = client.db().collection('test');
  await collection.insertOne({ a: [] });
  getOps().forEach(async o => {
    console.log(o);
    try {
      await collection.updateOne({}, o);
    } catch (e) {
      console.error(o, (e as any).message);
    }
  });
}

main();