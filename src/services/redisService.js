import Redis from "ioredis";
import { hashPassword } from "./utils/crypto.js";

// Redis 연결 설정. 환경 변수에서 값을 읽어오고, 없으면 기본값을 사용합니다.
const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD, // password가 없으면 undefined가 되어야 함
};

// Redis 클라이언트 생성. Pub/Sub을 위해서는 Publisher와 Subscriber를 분리하는 것이 좋습니다.
export const publisher = new Redis(redisOptions);
export const subscriber = new Redis(redisOptions);

// --- 키 생성 헬퍼 ---
const getRoomChannel = (roomName) => `chat:room:${roomName}`;
const getUsersSetKey = (roomName) => `chat:room:${roomName}:users`;
const getHistoryKey = (roomName) => `chat:room:${roomName}:history`;
const getRoomsHashKey = () => `chat:rooms`;

// --- 서비스 함수 ---

/**
 * 채널을 구독하고 메시지 핸들러를 연결합니다.
 * @param {string} roomName - 구독할 방 이름
 * @param {function} handler - 메시지를 받았을 때 호출될 콜백 함수
 * @returns {function} 구독 해제 함수
 */
export const subscribeToChannel = (roomName, handler) => {
  const channel = getRoomChannel(roomName);
  subscriber.subscribe(channel);

  const messageHandler = (receivedChannel, message) => {
    if (receivedChannel === channel) {
      handler(JSON.parse(message));
    }
  };
  subscriber.on("message", messageHandler);

  // 구독 해제 함수 반환
  return () => {
    subscriber.unsubscribe(channel);
    subscriber.off("message", messageHandler);
  };
};

/**
 * 채널에 메시지를 발행합니다. (JOIN, LEAVE, WHISPER 등)
 * @param {string} roomName - 발행할 방 이름
 * @param {object} message - 발행할 메시지 객체
 */
export const publishMessage = (roomName, message) => {
  const channel = getRoomChannel(roomName);
  return publisher.publish(channel, JSON.stringify(message));
};

/**
 * 일반 채팅 메시지를 발행하고 대화 기록에 저장합니다. (트랜잭션)
 * @param {string} roomName - 발행할 방 이름
 * @param {object} message - 발행할 메시지 객체
 */
export const sendMessageAndRecordHistory = (roomName, message) => {
  const channel = getRoomChannel(roomName);
  const historyKey = getHistoryKey(roomName);
  const messageString = JSON.stringify(message);

  return publisher
    .multi()
    .lpush(historyKey, messageString)
    .ltrim(historyKey, 0, 99) // 마지막 100개 메시지 유지
    .publish(channel, messageString)
    .exec();
};

/**
 * 방의 최근 대화 기록을 가져옵니다.
 * @param {string} roomName - 방 이름
 * @returns {Promise<Array<object>>} 메시지 객체 배열
 */
export const getChatHistory = async (roomName) => {
  const historyKey = getHistoryKey(roomName);
  const messageHistory = await publisher.lrange(historyKey, 0, 49); // 최근 50개
  return messageHistory.reverse().map((msg) => JSON.parse(msg));
};

/**
 * 방 비밀번호를 확인합니다.
 * @param {string} roomName - 방 이름
 * @param {string} enteredPassword - 사용자가 입력한 비밀번호
 * @returns {Promise<{exists: boolean, correct: boolean}>} 방 존재 여부 및 비밀번호 일치 여부
 */
export const verifyRoomPassword = async (roomName, enteredPassword) => {
  const roomsKey = getRoomsHashKey();
  const storedHashedPassword = await publisher.hget(roomsKey, roomName);
  if (!storedHashedPassword) {
    return { exists: false, correct: false };
  }
  const enteredHashedPassword = hashPassword(enteredPassword);
  return {
    exists: true,
    correct: storedHashedPassword === enteredHashedPassword,
  };
};

/**
 * 새로운 방의 비밀번호를 설정합니다.
 * @param {string} roomName - 방 이름
 * @param {string} password - 설정할 비밀번호
 */
export const setRoomPassword = (roomName, password) => {
  const roomsKey = getRoomsHashKey();
  const newHashedPassword = hashPassword(password);
  return publisher.hset(roomsKey, roomName, newHashedPassword);
};

/**
 * 방의 현재 인원수를 확인합니다.
 * @param {string} roomName - 방 이름
 * @returns {Promise<number>} 인원수
 */
export const getRoomCapacity = (roomName) => {
  const usersKey = getUsersSetKey(roomName);
  return publisher.scard(usersKey);
};

/**
 * 참여 가능한 랜덤 방을 찾습니다.
 * @returns {Promise<string>} 참여 가능한 랜덤 방 이름
 */
export const findAvailableRandomRoom = async () => {
  let roomIndex = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const randomRoomName = `random${roomIndex}`;
    const userCount = await getRoomCapacity(randomRoomName);
    if (userCount < 100) {
      return randomRoomName;
    }
    roomIndex++;
  }
};

export const addUserToRoom = (roomName, nickname) =>
  publisher.sadd(getUsersSetKey(roomName), nickname);
export const removeUserFromRoom = (roomName, nickname) =>
  publisher.srem(getUsersSetKey(roomName), nickname);
export const getRoomUsers = (roomName) =>
  publisher.smembers(getUsersSetKey(roomName));
export const isUserInRoom = (roomName, nickname) =>
  publisher.sismember(getUsersSetKey(roomName), nickname);

export const getRoomList = async () => {
  const privateRooms = await publisher.hkeys(getRoomsHashKey());
  const publicRoomKeys = [];
  const stream = publisher.scanStream({
    match: "chat:room:random*:users",
    count: 100,
  });
  for await (const keys of stream) {
    publicRoomKeys.push(...keys);
  }
  const publicRooms = publicRoomKeys.map((key) => key.split(":")[2]);
  const allRooms = [...new Set([...privateRooms, ...publicRooms])].sort();

  if (allRooms.length === 0) return [];

  const multi = publisher.multi();
  allRooms.forEach((room) => multi.scard(getUsersSetKey(room)));
  const counts = await multi.exec();

  return allRooms.map((room, index) => ({
    name: room,
    count: counts[index][1],
  }));
};

/**
 * Redis 클라이언트 연결을 종료합니다.
 */
export const disconnect = async () => {
  await publisher.quit();
  await subscriber.quit();
};
