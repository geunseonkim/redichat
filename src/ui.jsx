import React, { useState, useEffect } from "react";
import { Text, Box, Newline, useApp } from "ink";
import TextInput from "ink-text-input";

const App = () => {
  const [nickname, setNickname] = useState("");
  const [isNicknameSet, setIsNicknameSet] = useState(false);
  const [messages, setMessages] = useState([]); // 채팅 메시지 목록
  const [currentMessage, setCurrentMessage] = useState(""); // 현재 입력 중인 메시지
  const { exit } = useApp(); // Ink 앱 종료 훅

  // 앱 종료 시 메시지
  useEffect(() => {
    const handleExit = () => {
      if (nickname && isNicknameSet) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now().toString(),
            sender: "System",
            content: `${nickname}님이 채팅방을 나갔습니다.`,
            timestamp: new Date().toISOString(),
            type: "LEAVE",
          },
        ]);
        // 실제 Redis PUBLISH 로직은 여기에 추가될 예정
      }
    };

    // Ink 앱 종료 시 호출될 함수 등록 (예시)
    // Ink의 exit()는 실제 프로세스를 종료하므로, 여기서는 메시지만 추가
    // 실제 앱 종료 로직은 cli.jsx에서 처리하거나, 특정 키 입력으로 처리할 수 있습니다.
    // return () => { /* cleanup */ };
  }, [nickname, isNicknameSet]);

  const handleNicknameSubmit = (value) => {
    if (value.trim()) {
      setNickname(value.trim());
      setIsNicknameSet(true);
    }
  };

  const handleMessageSubmit = (value) => {
    if (value.trim() && nickname) {
      // 현재는 로컬 상태에만 추가. 나중에 Redis PUBLISH 로직으로 대체
      setMessages((prevMessages) => [
        ...prevMessages.slice(-100), // 최대 100개 메시지 유지 (임시)
        {
          id: Date.now().toString(),
          sender: nickname,
          content: value.trim(),
          timestamp: new Date().toISOString(),
          type: "MESSAGE",
        },
      ]);
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
      height="100%" // 터미널 높이에 맞춰 최대한 확장
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
      <Box
        flexGrow={1} // 남은 공간을 모두 차지
        flexDirection="column"
        overflow="hidden" // 메시지가 넘칠 경우 숨김 (Ink는 스크롤 기능이 없음)
      >
        {messages.map((msg) => (
          <Box key={msg.id} flexDirection="row">
            {msg.type === "SYSTEM" ||
            msg.type === "JOIN" ||
            msg.type === "LEAVE" ? (
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
          placeholder="메시지를 입력하세요..."
        />
      </Box>
    </Box>
  );
};

export default App;
