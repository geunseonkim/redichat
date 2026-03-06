# Development Log

## 1. 프로젝트 초기화 및 기본 환경 설정

- 기존 `fe`, `be` 폴더를 삭제하여 프로젝트를 클린 상태로 만들었습니다.
- `package.json` 파일을 생성하고, Node.js 기반의 터미널 UI 개발을 위한 핵심 의존성들을 추가했습니다:
  - `ink`: React 문법으로 터미널 UI를 구축하기 위한 라이브러리.
  - `ink-text-input`: Ink 기반의 텍스트 입력 컴포넌트.
  - `ioredis`: Node.js에서 Redis와 통신하기 위한 클라이언트.
  - `react`: Ink의 기반이 되는 UI 라이브러리.
  - `tsx`: JSX 파일을 Node.js 환경에서 직접 실행하기 위한 개발 의존성.
- `src/cli.jsx` 파일을 앱의 진입점으로 생성하고, `src/ui.jsx` 파일에 "Welcome to Redis Terminal Chat!" 메시지를 표시하는 기본 UI 컴포넌트를 작성했습니다.
- `npm start` 스크립트를 `tsx src/cli.jsx`로 설정하여 앱을 실행할 수 있도록 했습니다.

## 2. 환경 설정 문제 해결 및 파일 구조 정돈

- `node:internal/modules/run_main:107 SyntaxError: Unexpected identifier 'assert'` 에러를 해결하기 위해 `package.json`의 `start` 스크립트에서 `import-jsx` 대신 `tsx`를 사용하도록 변경했습니다.
- `Error [ERR_MODULE_NOT_FOUND]` 에러를 해결하기 위해 `cli.js`와 `ui.js` 파일을 `src` 디렉토리 안으로 이동시켰습니다.
- `SyntaxError: Unexpected token '<'` 에러를 해결하기 위해 `cli.js`와 `ui.js` 파일의 확장자를 `.jsx`로 변경하고, `package.json` 및 `src/cli.jsx`에서 참조하는 파일명도 `.jsx`로 업데이트했습니다. 이는 `tsx`가 JSX 문법을 인식하기 위해 필요한 조치였습니다.

## 3. Git 저장소 초기화 및 GitHub 연동

- 프로젝트 루트 디렉토리에서 `git init` 명령어를 사용하여 로컬 Git 저장소를 초기화했습니다.
- `node_modules/` 등 Git이 추적하지 않아야 할 파일들을 명시하기 위해 `.gitignore` 파일을 생성했습니다.
- 현재까지의 모든 변경사항을 스테이징하고 "feat: Initial project setup with Ink and tsx" 메시지로 첫 번째 커밋을 생성했습니다.
- GitHub에 원격 저장소를 생성하고, 로컬 저장소를 이 원격 저장소에 연결한 후 첫 번째 커밋을 푸시하여 GitHub에 반영했습니다.

## 4. 닉네임 입력 화면 구현

- `src/ui.jsx` 파일에 `useState` 훅을 사용하여 닉네임과 닉네임 설정 여부 상태를 관리하도록 추가했습니다.
- `ink-text-input` 컴포넌트를 사용하여 사용자가 닉네임을 입력할 수 있는 화면을 구현했습니다.
- 닉네임이 입력되면 채팅방 입장 메시지를 표시하도록 조건부 렌더링을 적용했습니다.

## 5. 기본 채팅 UI 구현

- 닉네임 입력 후 표시될 채팅 화면의 기본 레이아웃을 구성했습니다.
- 메시지 목록을 표시할 영역과 메시지를 입력할 `TextInput` 컴포넌트를 추가했습니다.
- `useState` 훅을 사용하여 채팅 메시지 목록(`messages`)과 현재 입력 중인 메시지(`currentMessage`) 상태를 관리하도록 했습니다.
- 메시지 전송 시 로컬 `messages` 상태에 메시지를 추가하고 입력창을 초기화하는 `handleMessageSubmit` 함수를 구현했습니다.

## 6. Redis Pub/Sub 연동

- `ioredis` 라이브러리를 사용하여 Redis 클라이언트(Publisher, Subscriber)를 생성했습니다.
- `uuid` 라이브러리를 추가하여 메시지별 고유 ID를 생성하도록 했습니다.
- 닉네임 설정 시, `JOIN` 메시지를 Redis 채널에 발행(Publish)하도록 `handleNicknameSubmit` 함수를 수정했습니다.
- 메시지 입력 시, `MESSAGE` 타입의 메시지를 Redis 채널에 발행하도록 `handleMessageSubmit` 함수를 수정했습니다.
- `useEffect` 훅을 사용하여 컴포넌트가 마운트될 때 Redis 채널을 구독(Subscribe)하고, 수신된 메시지를 화면에 표시하도록 구현했습니다.
- 컴포넌트 언마운트(앱 종료) 시, `LEAVE` 메시지를 발행하고 Redis 연결을 정리하는 로직을 추가했습니다.

## 7. 환경 변수를 이용한 Redis 연결 설정

- Redis 연결 정보(호스트, 포트, 비밀번호, 채널)를 코드에서 분리하여 환경 변수에서 읽어오도록 수정했습니다.
- 다른 사용자들이 설정을 쉽게 할 수 있도록 `.env.example` 파일을 추가했습니다.
- 민감한 정보가 담길 수 있는 `.env` 파일이 Git에 커밋되지 않도록 `.gitignore`에 추가했습니다.

## 8. 사용자 목록 표시 기능 구현

- Redis의 `SET` 자료구조를 사용하여 채팅방에 참여 중인 사용자 목록을 관리하도록 구현했습니다.
  - 사용자가 입장하면 `SADD` 명령어로 닉네임을 추가합니다.
  - 사용자가 퇴장하면 `SREM` 명령어로 닉네임을 제거합니다.
- `src/ui.jsx`의 레이아웃을 좌/우 2단으로 변경하여, 좌측에는 참여자 목록을, 우측에는 채팅 내용을 표시하도록 수정했습니다.
- `JOIN`/`LEAVE` 메시지를 수신할 때마다 로컬 사용자 목록 상태를 실시간으로 업데이트하여 다른 클라이언트의 입/퇴장을 즉시 반영하도록 했습니다.
- 입장 시 Redis `SET`에서 전체 사용자 목록을 가져와(`SMEMBERS`) 초기 사용자 목록을 구성하도록 했습니다.

## 9. 사용자 목록 조회 기능 변경 (/users 명령어)

- 기존의 좌/우 2단 레이아웃을 제거하고 단일 채팅창 레이아웃으로 복귀했습니다.
- 채팅 입력창에 `/users` 명령어를 입력하면 참여자 목록을 볼 수 있도록 `handleMessageSubmit` 함수를 수정했습니다.
- `/users` 명령어 실행 시, Redis의 `SMEMBERS` 명령을 통해 현재 참여자 목록을 조회하고, 이를 시스템 메시지 형태로 채팅창에 표시하도록 구현했습니다.
- 사용자 경험을 위해 입력창의 `placeholder`에 `/users` 명령어에 대한 안내를 추가했습니다.
