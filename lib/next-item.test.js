import assert from 'node:assert/strict';
import test from 'node:test';
import { nextItemId } from './next-item.js';

test('después de decidir, el siguiente es la tarjeta que sigue', () => {
  assert.equal(nextItemId(['a', 'b', 'c'], 'a'), 'b');
  assert.equal(nextItemId(['a', 'b', 'c'], 'c'), null);
  assert.equal(nextItemId(['a'], 'a'), null);
  assert.equal(nextItemId([], 'a'), null);
});
