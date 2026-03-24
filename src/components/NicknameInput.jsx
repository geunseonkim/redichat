import React from "react";
import { Box, Text, Newline } from "ink";
import TextInput from "ink-text-input";

const NicknameInput = ({ nickname, setNickname, onSubmit }) => {
  return (
    <Box
      borderStyle="bold"
      borderColor="green"
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
      <Text color="green">닉네임을 입력해주세요:</Text>
      <TextInput
        value={nickname}
        onChange={setNickname}
        onSubmit={onSubmit}
        placeholder="여기에 닉네임을 입력하세요..."
      />
    </Box>
  );
};

export default NicknameInput;
