/**
 * Simple MongoDB update builder.
 * https://www.mongodb.com/docs/manual/reference/operator/update/
 */

import type { Collection } from 'mongodb';
import { v4 as uuid, validate } from 'uuid';
import { has, get, set, unset, cloneDeep, isArray, isMatch, pickBy, isEmpty, isEqual } from 'lodash';

export type UpdateObject = {
  _id: string,
  [x: string]: any,
}

export type NewObject = {
  _id?: string,
  [x: string]: any,
}

export type Options = {
  isNew?: boolean,
  useVersionKey?: boolean,
}

const emptyQuery: Record<string, Record<string, any>> = {
  $set: {},
  $unset: {},
  $push: {},
  $pull: {},
  $addToSet: {},
};

export class UpdateBuilder implements ProxyHandler<object> {
  private query: Record<string, Record<string, any>> = cloneDeep(emptyQuery);
  private ref: UpdateObject;
  private work: UpdateObject;
  private isNew: boolean;
  private useVersionKey: boolean;

  static new(base: NewObject, options?: Omit<Options, 'isNew'>) {
    return new UpdateBuilder({ _id: uuid(), ...base },  { ...options, isNew: true });
  }

  static load(base: UpdateObject, options?: Omit<Options, 'isNew'>) {
    return new UpdateBuilder(base, options);
  }

  private constructor(base: UpdateObject, options?: Options) {
    const { isNew, useVersionKey } = { isNew: false, useVersionKey: false, ...options };
    if (!base._id) throw new Error('_id field required (and required to be a string)');
    if (!validate(base._id)) throw new Error();
    this.ref = cloneDeep(base);
    this.work = cloneDeep(base);
    this.isNew = isNew;
    this.useVersionKey = useVersionKey;
    return new Proxy(this, this); // Whaat?
  }

  get(_target, k) {
    const exists = Reflect.get(this, k);
    if (exists !== undefined) return exists;
    else return Reflect.get(this.work, k);
  }

  set(_target, k, v) {
    if (['isNew', 'ref', 'work', 'query'].includes(k)) {
      return Reflect.set(this, k, v);

    }
    return false;
  }

  $set(k: string, v: unknown) {
    if (has(this.work, k) && get(this.work, k) === v) return;
    set(this.work, k, v);
    if (this.isNew) return;
    this.query.$set[k] = v;
  }

  $unset(k: string) {
    if (!has(this.work, k)) return;
    unset(this.work, k);
    if (this.isNew) return;
    this.query.$unset[k] = true;
  }

  /**
   * Do push. If a $push already exists, update the $push op. Use $each to allow $push to be called many times additively.
   * https://www.mongodb.com/docs/manual/reference/operator/update/push/
   */
  $push(k: string, ...v: unknown[]) {
    const ref = get(this.isNew ? this.work : this.ref, k);
    if (ref !== undefined && !isArray(ref)) throw new Error(`Can't push onto existing value of type ${typeof ref}`);
    const working = this.isNew ? ref : get(this.work, k);
    if (working === undefined) {
      set(this.work, k, v);
    } else {
      working.push(...v);
    }
    if (this.isNew) return;
    this.query.$push[k] = { $each: [...this.query.$push[k]?.$each || [], ...v] };
  }

  /**
   * Add to a set. addToSet will create key if DNE like $push.
   * https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/
   */
  $addToSet(k: string, ...v: unknown[]) {
    const ref = get(this.isNew ? this.work : this.ref, k);
    if (ref !== undefined && !isArray(ref)) throw new Error(`Can't add to existing value of type ${typeof ref}`);
    const working = this.isNew ? ref : get(this.work, k);
    if (working === undefined) {
      set(this.work, k, v);
      if (this.isNew) return;
      this.query.$addToSet[k] = { $each: v };
    } else {
      const add: unknown[] = v.filter(x => working.every(y => !isEqual(x, y)));
      working.push(...add);
      if (this.isNew) return;
      if (!isEmpty(add)) this.query.$addToSet[k] = { $each: [...this.query.$addToSet[k]?.$each || [], ...v] };
    }
  }

  /**
   * Do pull. If a $pull already exists, update the $pull.
   * https://www.mongodb.com/docs/manual/reference/operator/update/pull/
   */
  $pull(k: string, ...v: unknown[]) {
    const ref = get(this.isNew ? this.work : this.ref, k);
    if (ref !== undefined && !isArray(ref)) throw new Error('Cannot apply $pull to a non-array value');
    if (/* !this.isNew && */ this.query.$pull[k] && !this.query.$pull[k].$in) throw new Error('Cannot use $pull after $pullMatch. You need to apply two update ops');
    const working = this.isNew ? ref : get(this.work, k);
    if (!working) return; // pull from undefined is a null op not error.
    const matching = working.filter(x => v.some(y => isEqual(y, x)));
    if (!isEmpty(matching)) {
      set(this.work, k, working.filter(x => !matching.some(y => isEqual(y, x))));
      if (this.isNew) return;
      this.query.$pull[k] = { $in: [...this.query.$pull[k]?.$in || [], ...matching] };
    }
  }

  $pullMatch(k: string, v: object) {
    const ref = get(this.isNew ? this.work : this.ref, k);
    if (ref !== undefined && !isArray(ref)) throw new Error('Cannot apply $pull to a non-array value');
    if (/* !this.isNew && */ this.query.$pull[k]) throw new Error('Cannot use $pullMatch after $pull. You need to apply two update ops');
    const working = this.isNew ? ref : get(this.work, k);
    if (!working) return; // pull from undefined is a null op not error.
    set(this.work, k, working.filter(w => !isMatch(w, v)));
    if (this.isNew) return;
    this.query.$pull[k] = v;
  }

  getValue() {
    return cloneDeep(this.work);
  }

  getQuery() {
    return cloneDeep(pickBy(this.query, (v) => !isEmpty(v)));
  }

  modifiedPaths() {
    return Object.values(this.query).reduce((a,b) => ({ ...a, ...b }), {});
  }

  async save(collection: Collection<any>) {
    if (this.isNew) {
      await collection.insertOne(this.getValue());
      this.isNew = false;
    } else if (!isEmpty(this.getQuery())) {
      await collection.updateOne({ _id: this.ref._id }, this.getQuery());
    }
    this.sync();
  }

  sync() {
    this.query = cloneDeep(emptyQuery);
    this.ref = this.work;
  }

  reset() {
    this.query = cloneDeep(emptyQuery);
    this.work = cloneDeep(this.ref);
  }
}