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

// 닉네임에 따라 고유한 색상을 반환하는 함수
const COLORS = ["green", "yellow", "blue", "magenta", "cyan", "red"];
const getColorForNickname = (nickname) => {
  if (nickname === "System") return "gray";
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash % COLORS.length)];
};

// 타임스탬프 포맷팅 함수 (HH:mm)
const formatTimestamp = (isoString) => {
  return new Date(isoString).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const App = () => {
  const [step, setStep] = useState("NICKNAME"); // NICKNAME, ROOM_NAME, ROOM_PASSWORD, CHATTING
  const [nickname, setNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");

  const [messages, setMessages] = useState([]); // 채팅 메시지 목록
  const [currentMessage, setCurrentMessage] = useState(""); // 현재 입력 중인 메시지
  const { exit } = useApp();

  // Dynamic Redis keys based on user input
  const [channel, setChannel] = useState("");
  const [usersSetKey, setUsersSetKey] = useState("");

  // Redis 메시지 수신 및 앱 종료 처리
  useEffect(() => {
    if (step !== "CHATTING" || !channel) {
      return;
    }

    // 채널 구독
    subscriber.subscribe(channel);

    const messageHandler = (channel, message) => {
      if (channel === channel) {
        const parsedMessage = JSON.parse(message);
        setMessages((prev) => [...prev.slice(-100), parsedMessage]);
      }
    };

    subscriber.on("message", messageHandler);

    // 컴포넌트 언마운트 시 정리 (앱 종료)
    return () => {
      const cleanup = async () => {
        await publisher.srem(usersSetKey, nickname);
        const leaveMessage = {
          id: uuidv4(),
          type: "LEAVE",
          nickname,
          content: `${nickname}님이 채팅방을 나갔습니다.`,
          timestamp: new Date().toISOString(),
        };
        await publisher.publish(channel, JSON.stringify(leaveMessage));

        subscriber.off("message", messageHandler);
        subscriber.unsubscribe(channel);
        await publisher.quit();
        await subscriber.quit();
      };
      cleanup();
    };
  }, [step, channel, usersSetKey, nickname]);

  const handleNicknameSubmit = (value) => {
    if (value.trim()) {
      setNickname(value.trim());
      setStep("ROOM_NAME");
    }
  };

  const handleRoomNameSubmit = (value) => {
    if (value.trim()) {
      setRoomName(value.trim());
      setStep("ROOM_PASSWORD");
    }
  };

  const handleRoomPasswordSubmit = async (value) => {
    const finalPassword = value.trim(); // 비밀번호는 비워둘 수 있음
    setRoomPassword(finalPassword);

    // 동적 채널 및 사용자 Set 키 생성
    const finalChannel = `chat:room:${roomName}:${finalPassword}`;
    const finalUsersSetKey = `${finalChannel}:users`;
    setChannel(finalChannel);
    setUsersSetKey(finalUsersSetKey);

    // 새 채팅방의 사용자 Set에 현재 사용자 추가
    await publisher.sadd(finalUsersSetKey, nickname);

    // 채팅 단계로 이동
    setStep("CHATTING");

    // 입장 메시지 발행
    const joinMessage = {
      id: uuidv4(),
      type: "JOIN",
      nickname,
      content: `${nickname}님이 채팅방에 입장했습니다.`,
      timestamp: new Date().toISOString(),
    };
    await publisher.publish(finalChannel, JSON.stringify(joinMessage));
  };

  const handleMessageSubmit = async (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || !nickname) {
      return;
    }

    // 명령어 처리: /users
    if (trimmedValue === "/users") {
      const onlineUsers = await publisher.smembers(usersSetKey);
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
      await publisher.publish(channel, JSON.stringify(message));

      setCurrentMessage(""); // 메시지 전송 후 입력창 초기화
    }
  };

  if (step === "NICKNAME") {
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

  if (step === "ROOM_NAME") {
    return (
      <Box
        borderStyle="round"
        borderColor="yellow"
        padding={1}
        flexDirection="column"
      >
        <Text>
          안녕하세요,{" "}
          <Text color={getColorForNickname(nickname)} bold>
            {nickname}
          </Text>
          님!
        </Text>
        <Newline />
        <Text>참여하거나 새로 만들 채팅방 이름을 입력해주세요:</Text>
        <TextInput
          value={roomName}
          onChange={setRoomName}
          onSubmit={handleRoomNameSubmit}
          placeholder="예: general, random..."
        />
      </Box>
    );
  }

  if (step === "ROOM_PASSWORD") {
    return (
      <Box
        borderStyle="round"
        borderColor="yellow"
        padding={1}
        flexDirection="column"
      >
        <Text>
          채팅방 '<Text color="cyan">{roomName}</Text>'의 비밀번호를
          입력해주세요.
        </Text>
        <Text color="gray">(비밀번호가 없으면 그냥 Enter를 누르세요)</Text>
        <TextInput
          value={roomPassword}
          onChange={setRoomPassword}
          onSubmit={handleRoomPasswordSubmit}
          placeholder="비밀번호 입력..."
        />
      </Box>
    );
  }

  // CHATTING 단계
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
          {roomName} -{" "}
          <Text color={getColorForNickname(nickname)}>{nickname}</Text>
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
                <Text color="gray">[{formatTimestamp(msg.timestamp)}] </Text>
                <Text bold color={getColorForNickname(msg.sender)}>
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
