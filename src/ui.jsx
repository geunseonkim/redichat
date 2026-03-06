import React, { useState, useEffect } from "react";
import { Text, Box, Newline, useApp } from "ink";
import TextInput from "ink-text-input";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

// Redis 연결 설정. 환경 변수에서 값을 읽어오고, 없으면 기본값을 사용합니다.
const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD, // password가 없으면 undefined가 되어야 함
};

// Redis 클라이언트 생성. Pub/Sub을 위해서는 Publisher와 Subscriber를 분리하는 것이 좋습니다.
const publisher = new Redis(redisOptions);
const subscriber = new Redis(redisOptions);

const CHANNEL = process.env.REDIS_CHANNEL || "chat:global";
const USERS_SET_KEY = `${CHANNEL}:users`;

const App = () => {
  const [nickname, setNickname] = useState("");
  const [isNicknameSet, setIsNicknameSet] = useState(false);
  const [messages, setMessages] = useState([]); // 채팅 메시지 목록
  const [currentMessage, setCurrentMessage] = useState(""); // 현재 입력 중인 메시지
  const { exit } = useApp();

  // Redis 메시지 수신 및 앱 종료 처리
  useEffect(() => {
    if (!isNicknameSet) {
      return;
    }

    // 채널 구독
    subscriber.subscribe(CHANNEL);

    const messageHandler = (channel, message) => {
      if (channel === CHANNEL) {
        const parsedMessage = JSON.parse(message);
        setMessages((prev) => [...prev.slice(-100), parsedMessage]);
      }
    };

    subscriber.on("message", messageHandler);

    // 컴포넌트 언마운트 시 정리 (앱 종료)
    return () => {
      const cleanup = async () => {
        await publisher.srem(USERS_SET_KEY, nickname);
        const leaveMessage = {
          id: uuidv4(),
          type: "LEAVE",
          nickname,
          content: `${nickname}님이 채팅방을 나갔습니다.`,
          timestamp: new Date().toISOString(),
        };
        await publisher.publish(CHANNEL, JSON.stringify(leaveMessage));

        subscriber.off("message", messageHandler);
        subscriber.unsubscribe(CHANNEL);
        await publisher.quit();
        await subscriber.quit();
      };
      cleanup();
    };
  }, [isNicknameSet, nickname]);

  const handleNicknameSubmit = async (value) => {
    if (value.trim()) {
      const newNickname = value.trim();

      // Redis Set에 사용자 추가
      await publisher.sadd(USERS_SET_KEY, newNickname);

      setNickname(newNickname);
      setIsNicknameSet(true);

      // 입장 메시지 발행
      const joinMessage = {
        id: uuidv4(),
        type: "JOIN",
        nickname: newNickname,
        content: `${newNickname}님이 채팅방에 입장했습니다.`,
        timestamp: new Date().toISOString(),
      };
      await publisher.publish(CHANNEL, JSON.stringify(joinMessage));
    }
  };

  const handleMessageSubmit = async (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || !nickname) {
      return;
    }

    // 명령어 처리: /users
    if (trimmedValue === "/users") {
      const onlineUsers = await publisher.smembers(USERS_SET_KEY);
      const usersMessage = {
        id: uuidv4(),
        type: "SYSTEM",
        content: `참여자 목록 (${onlineUsers.length}): ${onlineUsers.join(", ")}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.slice(-100), usersMessage]);
      setCurrentMessage("");
      return;
    }

    // 일반 메시지 처리
    if (trimmedValue && nickname) {
      // 메시지 발행
      const message = {
        id: uuidv4(),
        sender: nickname,
        content: value.trim(),
        timestamp: new Date().toISOString(),
        type: "MESSAGE",
      };
      await publisher.publish(CHANNEL, JSON.stringify(message));

      setCurrentMessage(""); // 메시지 전송 후 입력창 초기화
    }
  };

  if (!isNicknameSet) {
    return (
      <Box
        borderStyle="round"
        borderColor="yellow"
        padding={1}
        flexDirection="column"
      >
        <Text>
          환영합니다!{" "}
          <Text color="green" bold>
            Redis 터미널 채팅
          </Text>
          에 오신 것을 환영합니다.
        </Text>
        <Newline />
        <Text>닉네임을 입력해주세요:</Text>
        <TextInput
          value={nickname}
          onChange={setNickname}
          onSubmit={handleNicknameSubmit}
          placeholder="여기에 닉네임을 입력하세요..."
        />
      </Box>
    );
  }

  // 닉네임 설정 후 채팅 UI
  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      flexDirection="column"
      height="100%"
    >
      {/* 채팅방 헤더 */}
      <Box
        borderStyle="single"
        borderColor="blue"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold>
          Redis 터미널 채팅 - <Text color="green">{nickname}</Text>
        </Text>
      </Box>

      {/* 메시지 표시 영역 */}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {messages.map((msg) => (
          <Box key={msg.id} flexDirection="row">
            {["SYSTEM", "JOIN", "LEAVE"].includes(msg.type) ? (
              <Text color="gray" italic>
                {msg.content}
              </Text>
            ) : (
              <>
                <Text bold color="magenta">
                  {msg.sender}
                </Text>
                <Text>: {msg.content}</Text>
              </>
            )}
          </Box>
        ))}
      </Box>

      {/* 메시지 입력 영역 */}
      <Box borderStyle="single" borderColor="green" paddingX={1} marginTop={1}>
        <TextInput
          value={currentMessage}
          onChange={setCurrentMessage}
          onSubmit={handleMessageSubmit}
          placeholder="메시지를 입력하세요... (/users 로 참여자 확인)"
        />
      </Box>
    </Box>
  );
};

export default App;
