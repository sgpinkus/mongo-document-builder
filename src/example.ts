import { MongoClient } from 'mongodb';
import { sample } from 'lodash';
import { UpdateBuilder } from './index';

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/test');
  await client.connect();
  const collection = client.db().collection('recipes');
  const q = UpdateBuilder.new({
    name: 'Nachos & Bean',
    description: 'Yes',
  });
  addSpices(q);
  addZest(q);
  ensureBand(q);
  console.log(q.getValue(), q.getQuery());
  await q.save(collection);
  q.$push('guests', 'jill', 'dave');
  addZest(q);
  addDisaster(q);
  await q.save(collection);
  console.log(q.getValue(), q.getQuery());
}

function addSpices(q: UpdateBuilder) {
  q.$push('ingredients', 'chilli');
  q.$push('drinks', 'water', 'milk');
}

function addZest(q: UpdateBuilder) {
  q.$addToSet('guests', 'sam');
  q.$pull('guests', 'jim');
}

function ensureBand(q: UpdateBuilder) {
  q.$set('expensive', true);
}

function addDisaster(q: UpdateBuilder) {
  q.$addToSet('ingredients', sample(['salmnonella', 'cholera', 'poop', 'weewee', 'covid']));
}

main()
  .then(() => { console.log('Done'); process.exit(); })
  .catch((e) => { console.error(e); process.exit(1); });
