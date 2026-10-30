import assert from 'node:assert/strict';
import test from 'node:test';
import { nextItemId } from './next-item.js';

test('after a decision, the next card is the one that follows', () => {
  assert.equal(nextItemId(['a', 'b', 'c'], 'a'), 'b');
  assert.equal(nextItemId(['a', 'b', 'c'], 'c'), null);
  assert.equal(nextItemId(['a'], 'a'), null);
  assert.equal(nextItemId([], 'a'), null);
});
