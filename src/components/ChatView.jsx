import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { getColorForNickname } from "../utils/colors.js";
import { formatDate } from "../utils/format.js";
import Message from "./Message.jsx";

const ChatView = ({
  roomName,
  nickname,
  messages,
  currentMessage,
  setCurrentMessage,
  onSubmit,
}) => {
  return (
    <Box padding={1} flexDirection="column" height="100%">
      {/* 채팅방 헤더 */}
      <Box
        flexDirection="column"
        marginBottom={1}
        borderStyle="single"
        borderBottomColor="gray"
        borderLeft={false}
        borderRight={false}
        borderTop={false}
      >
        <Text>
          <Text bold>채팅방: {roomName}</Text> (나:{" "}
          <Text color={getColorForNickname(nickname)}>{nickname}</Text>)
        </Text>
      </Box>

      {/* 메시지 표시 영역 */}
      <Box flexGrow={1} flexDirection="column">
        {messages.map((msg, index) => {
          // Find the previous non-system, non-whisper message to compare dates
          let prevRealMsg = null;
          for (let i = index - 1; i >= 0; i--) {
            if (messages[i].type === "MESSAGE") {
              prevRealMsg = messages[i];
              break;
            }
          }

          // Show date separator only for the first message of a new day
          const isMessage = msg.type === "MESSAGE";
          const showDateSeparator =
            isMessage &&
            (!prevRealMsg ||
              new Date(msg.timestamp).toDateString() !==
                new Date(prevRealMsg.timestamp).toDateString());

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <Box key={`date-${msg.id}`}>
                  <Text dimColor>--- {formatDate(msg.timestamp)} ---</Text>
                </Box>
              )}
              <Box flexDirection="row">
                <Message message={msg} currentUserNickname={nickname} />
              </Box>
            </React.Fragment>
          );
        })}
      </Box>

      {/* 메시지 입력 영역 */}
      <Box marginTop={1}>
        <Box marginRight={1}>
          <Text color="green">{">"}</Text>
        </Box>
        <TextInput
          value={currentMessage}
          onChange={setCurrentMessage}
          onSubmit={onSubmit}
          placeholder="메시지를 입력하세요... (/users, /whisper, /join, /rooms)"
        />
      </Box>
    </Box>
  );
};

export default ChatView;
