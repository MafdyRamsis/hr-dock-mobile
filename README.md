# HR Dock — Mobile App

React Native mobile application for **HR Dock**, a multi-tenant Egyptian HRMS SaaS. Built with Expo 54 and Expo Router. Allows employees and managers to handle leave, attendance, approvals, payroll slips, and HR requests from their phone.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo ~54 |
| Navigation | Expo Router ~6 |
| Language | JavaScript |
| Auth Storage | `expo-secure-store` |
| Biometrics | `expo-local-authentication` |
| Notifications | `expo-notifications` |
| Location | `expo-location` |
| PDF / Sharing | `expo-print` + `expo-sharing` |
| HTTP Client | Axios |
| Async Storage | `@react-native-async-storage/async-storage` |

---

## Local Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- [Expo Go](https://expo.dev/client) app on your phone **or** an Android/iOS simulator

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API URL

Create a `.env` file (or set via `app.json` extra config):

```env
EXPO_PUBLIC_API_URL=http://localhost:3003/api/v1
```

Replace with your deployed backend URL for production builds.

### 3. Start

```bash
npm start          # Expo dev server (scan QR with Expo Go)
npm run android    # Android emulator
npm run ios        # iOS simulator (macOS only)
npm run web        # Web preview
```

---

## Useful Commands

| Command | Purpose |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run android` | Run on Android emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run web` | Run in browser |

---

## Project Structure

```
app/
├── _layout.jsx              # Root layout — auth guard, navigation shell
├── (auth)/                  # Login, workspace entry, forgot password
├── (tabs)/                  # Bottom tab navigator
│   ├── index.jsx            # Home / dashboard
│   └── ...
├── leave/                   # Leave request flow
├── requests/                # My requests & approval queue
├── announcements.jsx
├── appraisals.jsx
├── benefits.jsx
├── directory.jsx            # Employee directory
├── documents.jsx
├── expenses.jsx
├── holidays.jsx
├── leave-approvals.jsx      # Manager leave approval list
├── leave-balance.jsx
├── loans.jsx
├── manager-dashboard.jsx
├── notifications.jsx
├── profile.jsx
└── training.jsx

src/
├── components/              # Shared UI components
├── context/                 # Auth context, language/RTL context
├── services/                # Axios API client
└── utils/                   # Helpers, date formatting, etc.
```

---

## Key Features

- **Employee self-service** — submit leave, expenses, WFH, and loan requests
- **Manager approvals** — approve or reject leave and requests on the go
- **Attendance** — view attendance history and daily status
- **Leave balances** — real-time remaining days per leave type
- **Payslips** — view and download payslips as PDF
- **Notifications** — push notifications for pending approvals and announcements
- **Biometric login** — Face ID / fingerprint via `expo-local-authentication`
- **Bilingual** — Arabic (RTL) and English support

---

## Building for Production

HR Dock Mobile uses [EAS Build](https://docs.expo.dev/build/introduction/) for production APK/IPA generation (see `eas.json`).

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```
