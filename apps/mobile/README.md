# @stitch/mobile

Expo + React Native + TypeScript app for Stitch residents and prospects.

## Quick start

```powershell
pnpm install                       # from monorepo root, installs all workspaces
cd apps/mobile
pnpm start                         # opens Expo dev tools + QR code
```

Then scan the QR code with **Expo Go** on your phone.

## Stack

| Layer      | Tech                                                         |
| ---------- | ------------------------------------------------------------ |
| Framework  | Expo SDK 54 + React Native 0.81 (new arch)                   |
| Navigation | Expo Router v6 (file-based, typed routes)                    |
| Styling    | NativeWind v4 (Tailwind for RN)                              |
| State      | Zustand (UI), TanStack Query (server)                        |
| Auth       | Clerk (`@clerk/clerk-expo`)                                  |
| Forms      | react-hook-form + Zod                                        |
| i18n       | i18next + react-i18next + expo-localization (EN/AR with RTL) |
| Icons      | lucide-react-native                                          |

## Layout

```
apps/mobile/
├── app/                  # Expo Router file-based routes
│   ├── _layout.tsx       # Root: ClerkProvider + QueryClientProvider + auth gate
│   ├── (auth)/           # sign-in, sign-up, onboarding
│   ├── (tabs)/           # 5 tabs: home, community, services, discover, profile
│   ├── notifications.tsx # bell-icon target
│   ├── qr/               # FAB target: My QR, Guest Pass, Scan, Logs
│   └── voice/            # AI Voice (Farah)
├── components/           # TopBar, CenterFab, etc.
├── lib/                  # api client, clerk token cache, i18n, theme
├── locales/              # en.json, ar.json
└── assets/               # icons, splash images
```

## Talking to the API from a physical device

`EXPO_PUBLIC_API_URL=http://localhost:8000` works in the iOS Simulator / Android
emulator on your dev machine, but **not** on a real phone via Expo Go —
`localhost` there refers to the phone itself. Switch to your laptop's LAN IP:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000  # your laptop on the wifi
```

Find your IP via `ipconfig` (Windows) or `ifconfig` / `ip addr` (Mac/Linux).
