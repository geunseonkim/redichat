import React, { useState } from "react";
import { Text, Box, Newline } from "ink";
import TextInput from "ink-text-input";

const App = () => {
  const [nickname, setNickname] = useState("");
  const [isNicknameSet, setIsNicknameSet] = useState(false);

  const handleNicknameSubmit = (value) => {
    if (value.trim()) {
      setNickname(value.trim());
      setIsNicknameSet(true);
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

  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Text>
        <Text color="green" bold>
          {nickname}
        </Text>
        님, 채팅방에 입장하셨습니다!
      </Text>
    </Box>
  );
};

export default App;
