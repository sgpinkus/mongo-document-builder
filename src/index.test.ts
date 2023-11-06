import chai from 'chai';
const { expect } = chai;
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import { v4 as uuid } from 'uuid';
import { get } from 'lodash';
import { UpdateBuilder } from './index';

const testObj = { _id: uuid(), a: 1, b: '2', c: ['x'] };

describe('update builder', () => {
  before(async() => {
  });

  it('fails if not new and not _id', () => {
    expect(() => UpdateBuilder.load({ a: 1 } as any)).to.throw(Error);
  });

  it('sets fields', () => {
    const q = UpdateBuilder.load(testObj);
    q.$set('x.y.z', []);
    expect(get(q.getValue(), 'x.y.z')).deep.equal([]);
    expect(q.getQuery().$set).keys(['x.y.z']);
  });

  it ('set conditionally', () => {
    const q = UpdateBuilder.load(testObj);
    q.$set('a', 1);
    expect(q.getQuery()).deep.equal({});
    q.$set('a', 2);
    expect(q.getQuery()).deep.equal({ $set: { a: 2 } });
  });

  it('unsets fields', () => {
    const q = UpdateBuilder.load({ ...testObj, x: { y: { z: 1 } } });
    q.$unset('x.y.z');
    expect(get(q.getValue(), 'x.y.z')).is.undefined;
    expect(q.getQuery().$unset['x.y.z']).equals(true);
    expect(q.getQuery().$unset).keys(['x.y.z']);
  });

  it ('unset conditionally', () => {
    const testObj = { _id: uuid(), a: 1 };
    const q = UpdateBuilder.load(testObj);
    q.$unset('b');
    expect(q.getQuery()).deep.equal({});
    q.$unset('a');
    expect(q.getQuery()).deep.equal({ $unset: { a: true } });
  });

  it('push to array', () => {
    const q = UpdateBuilder.load(testObj);
    q.$push('x.y.z', 1);
    expect(get(q.getValue(), 'x.y.z')).deep.equal([1]);
    q.$push('x.y.z', 2, 3);
    expect(get(q.getValue(), 'x.y.z')).deep.equal([1, 2, 3]);
    expect(q.getQuery()).deep.equal({ $push: { 'x.y.z': { $each: [1,2,3] } } });
  });


  it('push to non array throws', () => {
    const q = UpdateBuilder.load(testObj);
    expect(() => q.$push('a', 1)).to.throw(Error);
  });

  it('pull from array', () => {
    const q = UpdateBuilder.load(testObj);
    q.$pull('c', 'x');
    expect(get(q.getValue(), 'c')).deep.equal([]);
    expect(q.getQuery()).deep.equal({ $pull: { c: { $in: ['x'] } } });
    q.$pull('c', 'never');
    q.$pull('c', { never: 'ever' });
    expect(get(q.getValue(), 'c')).deep.equal([]);
    expect(q.getQuery()).deep.equal({ $pull: { c: { $in: ['x'] } } });
  });

  it('pull from array conditionall', () => {
    const q = UpdateBuilder.load(testObj);
    q.$pull('d', 'x');
    expect(get(q.getValue(), 'd')).is.undefined;
    expect(q.getQuery()).deep.equal({});
  });

  it('pull from non array throws', () => {
    const q = UpdateBuilder.load(testObj);
    expect(() => q.$pull('a', 1)).to.throw(Error);
  });

  it('pull match', () => {
    const testObj = { _id: uuid(), a: [1, { x: 1, y: 2 }, { x: 2 }, 'x'] };
    const q = UpdateBuilder.load(testObj);
    q.$pullMatch('a', { x: 1 });
    expect(get(q.getValue(), 'a')).deep.equals([1, { x: 2 }, 'x']);
  });

  it('pull match after pull throws', () => {
    const testObj = { _id: uuid(), a: [1, { x: 1, y: 2 }, { x: 2 }, 'x'] };
    const q = UpdateBuilder.load(testObj);
    expect(() => { q.$pullMatch('a', { x: 1 }); q.$pullMatch('a', { x: 1 }); }).to.throw(Error);
  });

  it ('add to a existing set', () => {
    const q = UpdateBuilder.load(testObj);
    q.$addToSet('c', 1);
    expect(q.getQuery()).deep.equal({ $addToSet: { c: { $each: [1] } } });
    q.$addToSet('c', 2);
    expect(q.getQuery()).deep.equal({ $addToSet: { c: { $each: [1,2] } } });
    q.$addToSet('c', 1);
    expect(q.getQuery()).deep.equal({ $addToSet: { c: { $each: [1,2] } } });
  });

  it ('add to a non existing set', () => {
    const q = UpdateBuilder.load(testObj);
    q.$addToSet('d', { a: 1 });
    expect(q.getQuery()).deep.equal({ $addToSet: { d: { $each: [{ a: 1 }] } } });
  });
});

describe('prop set/get', () => {
  it ('property getters work', () => {
    const testObj = { _id: uuid(), a: 1, b: [1, 3], c: { d: 4 } };
    const q = UpdateBuilder.load(testObj);
    expect((q as any).a).equals(1);
    expect((q as any).b[1]).equals(3);
    expect((q as any).d).is.undefined;
  });

  it ('property setters TypeError', () => {
    const testObj = { _id: uuid(), a: 1, b: [1, 3], c: { d: 4 } };
    const q = UpdateBuilder.load(testObj);
    expect(() => { (q as any).a = 1;}).to.throw(TypeError);
  });
});

describe('new', () => {
  // Everything's different when isNew which is a bit ugly. Arg to support new object build for insert is client
  // of type can use same klunky interface whether new or not and not care.

  it('allows no _id if isNew', () => {
    expect(() => UpdateBuilder.new({ a: 1 })).not.to.throw(Error);
  });

  it('allows _id if isNew', () => {
    expect(() => UpdateBuilder.new({ _id: uuid(), a: 1 })).not.to.throw(Error);
  });

  it('sets fields', () => {
    const q = UpdateBuilder.new(testObj);
    q.$set('x.y.z', []);
    expect(get(q.getValue(), 'x.y.z')).deep.equal([]);
    expect(q.getQuery()).deep.equals({});
  });

  it('unsets fields', () => {
    const q = UpdateBuilder.new(testObj);
    q.$unset('x.y.z');
    expect(get(q.getValue(), 'x.y.z')).is.undefined;
    expect(q.getQuery()).deep.equals({});
  });

  xit('more', () => {});

});



