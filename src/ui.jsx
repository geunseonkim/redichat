import React from "react";
import { Text, Box } from "ink";

const App = () => {
  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Text>
        Welcome to{" "}
        <Text color="green" bold>
          Redis Terminal Chat
        </Text>
        !
      </Text>
    </Box>
  );
};

export default App;
