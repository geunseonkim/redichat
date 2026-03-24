import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

const PasswordInput = ({
  roomName,
  password,
  setPassword,
  error,
  setError,
  onSubmit,
}) => {
  return (
    <Box
      borderStyle="bold"
      borderColor="green"
      padding={1}
      flexDirection="column"
    >
      <Text>
        채팅방 '<Text color="cyan">{roomName}</Text>'의 비밀번호를 입력해주세요.
      </Text>
      <Text color="gray">(비밀번호가 없으면 Enter, 돌아가려면 /back)</Text>
      {error && <Text color="red">{error}</Text>}
      <TextInput
        value={password}
        onChange={(v) => {
          setPassword(v);
          setError(""); // 입력 시 에러 메시지 제거
        }}
        onSubmit={onSubmit}
        placeholder="비밀번호 입력..."
      />
    </Box>
  );
};

export default PasswordInput;
