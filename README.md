# 🎨 MoodBoard

A beautiful, interactive mood tracking and emotional well-being app built with React Native and Expo. MoodBoard helps you understand your emotional patterns over time, share your state with trusted family members, and gain actionable insights into your daily life.

## ✨ Features

- **📊 Daily Mood Logging**: Easily log your mood, add contextual tags, and write brief journal entries.
- **📈 Advanced Insights**: Visualize your emotional trends over time with weekly charts, mood distribution bars, and streak tracking.
- **👨‍👩‍👧‍👦 Family & Collaboration**: Connect with family members or close friends to share mood states in real-time.
- **☁️ Cloud Sync & Offline First**: Built with an offline-first approach using Expo SQLite, smoothly syncing with Supabase when online.
- **🌙 Beautiful UI**: Smooth animations with React Native Reanimated and a modern, aesthetically pleasing design.

## 🛠️ Technology Stack

- **Framework**: [React Native](https://reactnative.dev/) / [Expo](https://expo.dev/) (SDK 54)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Database (Local)**: `expo-sqlite` & `AsyncStorage`
- **Database (Cloud/Auth)**: [Supabase](https://supabase.com/)
- **Animations**: `react-native-reanimated`

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator (for Mac) or Android Emulator (for Windows/Mac/Linux), or a physical device with the Expo Go app.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd MoodBoard-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory.
   - Add your Supabase credentials:
     ```env
     EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Start the development server:
   ```bash
   npx expo start
   ```

5. Open the app:
   - Press `a` to open in Android Emulator.
   - Press `i` to open in iOS Simulator.
   - Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android).

## 📱 App Structure

- `app/(tabs)`: Main navigation tabs (Dashboard, Log, History, Insights, Family, Profile).
- `components/`: Reusable UI components (Charts, Badges, Cards).
- `store/`: State management and database contexts (`MoodContext`, `AuthContext`).
- `services/`: API and backend service integrations (`supabase.ts`, `userService.ts`, `familyService.ts`).
- `constants/`: Theme colors, mood configurations, and app-wide constants.

## 📄 License

This project is licensed under the MIT License.
