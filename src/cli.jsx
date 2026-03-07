#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import App from "./ui.jsx";

// 터미널 화면 지우고 실행 (선택사항)
// console.clear();
render(<App />, { exitOnCtrlC: false });
