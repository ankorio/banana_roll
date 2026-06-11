// Exercises the Redis persistence + pub/sub backend in rooms.js using ioredis-mock
// (no real Redis needed). Validates: durable room writes, cross-instance roll
// fan-out, remote room sync, and self-echo filtering.
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);

// Make rooms.js's `require('ioredis')` resolve to the in-process mock.
const RedisMock = require('ioredis-mock');
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'ioredis') return RedisMock;
  return origLoad.call(this, request, ...rest);
};

process.env.REDIS_URL = 'redis://localhost:6379';

const rooms = require('../src/rooms.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures++;
}

// A raw client standing in for "another instance" publishing onto the bus.
const other = new RedisMock();

async function main() {
  const remoteRolls = [];
  rooms.onRemoteRoll((room, roll) => remoteRolls.push({ id: room.id, roll }));
  await rooms.init();

  // 1. createRoom writes a durable key
  const { id } = await rooms.createRoom();
  await sleep(20);
  const raw = await other.get(`br:room:${id}`);
  check('createRoom persists a room key in redis', !!raw && JSON.parse(raw).id === id);
  check('room is in the local working set', !!rooms.getRoom(id));

  // 2. a roll published by ANOTHER instance is delivered to our remote handler
  const before = remoteRolls.length;
  await other.publish('br:roll', JSON.stringify({
    i: 'other-instance', id, roll: { id: 'r-remote', total: 19 },
  }));
  await sleep(30);
  check('remote roll reaches onRemoteRoll', remoteRolls.length === before + 1 &&
    remoteRolls[remoteRolls.length - 1].roll.id === 'r-remote');
  check('remote roll updates retained lastRoll', rooms.getRoom(id).lastRoll?.id === 'r-remote');

  // 3. a room created on ANOTHER instance syncs into our working set
  await other.publish('br:room', JSON.stringify({
    i: 'other-instance', room: { id: 'room-from-elsewhere', publishToken: 'tok', styles: {}, players: [] },
  }));
  await sleep(30);
  check('remote room syncs into local working set', !!rooms.getRoom('room-from-elsewhere'));

  // 4. our OWN published rolls must NOT loop back (would double-broadcast)
  const room = rooms.getRoom(id);
  const before2 = remoteRolls.length;
  await rooms.persistRoll(room, { id: 'r-self', total: 7 });
  await sleep(30);
  check('our own roll is not re-delivered to us', remoteRolls.length === before2);

  await rooms.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
