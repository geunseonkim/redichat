#!/usr/bin/env node
import "dotenv/config";

try {
  await import("../dist/ui.js");
} catch (error) {
  if (error.code === "ERR_MODULE_NOT_FOUND") {
    console.error(
      "\x1b[31mError: The application has not been built yet.\x1b[0m",
    );
    console.error(
      'Please run \x1b[32m"npm run build"\x1b[0m before starting the application.',
    );
    process.exit(1);
  }
  console.error("\x1b[31mAn unexpected error occurred:\x1b[0m", error);
  process.exit(1);
}
