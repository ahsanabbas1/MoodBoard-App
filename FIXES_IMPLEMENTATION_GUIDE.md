# MoodBoard App - Issue Fixes and Implementation Guide

## Overview

This document outlines all the issues identified in the MoodBoard app and the fixes that have been implemented.

---

## ✅ Issues Fixed

### 1. **Logout Button Not Working**

**Problem:** When users logged out, AsyncStorage keys containing user data weren't cleared. This meant that when a different user logged in on the same device, they could see the previous user's cached data.

**Solution Implemented:**

- Updated `signOut()` function in [store/AuthContext.tsx](store/AuthContext.tsx) to clear all user-specific AsyncStorage keys before signing out
- Keys cleared include:
  - Friend/Family circles cache
  - Privacy settings
  - Notifications
  - AI insights cache
  - Profile preferences
  - Peer mood data
  - And more...

**Files Modified:**

- [store/AuthContext.tsx](store/AuthContext.tsx) - Added AsyncStorage import and cleanup logic

---

### 2. **Database Integrity After Logout/Login**

**Problem:** Users worried that re-logging in with the same account might lose their mood data.

**Solution:**

- SQLite database uses `user_id` filtering for all queries, ensuring data is isolated per user
- Mood entries are stored locally in SQLite and are never synced to the server
- When a user logs back in, their SQLite database is accessible and all mood entries are preserved
- AsyncStorage is user-scoped (keys include user ID), so each user has their own cached data

**Why it works:**

- All SQLite queries filter by `user_id`: `SELECT * FROM user_mood_entries WHERE user_id = ?`
- The database is local to the app and persists across app restarts
- Different users on the same phone get different user IDs from Supabase Auth

---

### 3. **Multi-User Account Isolation**

**Problem:** Different user accounts on the same phone need separate, isolated data.

**Solution Implemented:**

1. **AsyncStorage Isolation:** All AsyncStorage keys are user-scoped (e.g., `circle_family_v5_{uid}`)
2. **SQLite Isolation:** All mood entries are filtered by `user_id`
3. **Supabase RLS Policies:** Created Row-Level Security policies (see below)

**Files Created:**

- [DATABASE_SETUP.sql](DATABASE_SETUP.sql) - Complete SQL setup with RLS policies

**RLS Policies Ensure:**

- Users can only view/modify their own profiles
- Users can only see friend requests they sent or received
- Users can only view/manage their own notifications
- Profiles are publicly viewable (for friend discovery)

---

### 4. **Friend/Family Request System**

**Problem:** The friend/family request system was incomplete:

- No notifications when requests are sent
- No notifications when requests are accepted/rejected
- No proper notification flow for both sender and receiver

**Solution Implemented:**

#### 4a. **New Notification Service**

Created [services/notificationService.ts](services/notificationService.ts) with functions:

- `createRequestNotification()` - Called when a request is sent
- `createAcceptedNotification()` - Called when a request is accepted
- `createRejectedNotification()` - Called when a request is rejected
- `createRemovalNotification()` - Called when a user is removed from friend/family
- `getNotifications()` - Fetch all notifications for a user
- `markAsRead()` - Mark notification as read
- `deleteNotification()` - Delete a notification
- `getUnreadCount()` - Get count of unread notifications

#### 4b. **Updated Friend Request Service**

Modified [services/friendRequestService.ts](services/friendRequestService.ts) to:

- Call `createRequestNotification()` when `sendFriendRequest()` is called
- Call `createAcceptedNotification()` when request is accepted
- Call `createRejectedNotification()` when request is rejected
- Call `createRemovalNotification()` when `removeConnection()` is called

#### 4c. **Notification Flow**

Now the complete flow works as follows:

**User A sends request to User B:**

1. Request is created in `friend_requests` table
2. Notification is created for User B (to accept/reject)
3. User B sees "Connection Requests" section with User A's request

**User B accepts the request:**

1. Request status is updated to 'accepted'
2. Notification is created for User A (saying User B accepted)
3. User A sees the notification in "Request Updates" section
4. Both users appear in each other's Friend/Family circles

**User B rejects the request:**

1. Request status is updated to 'rejected'
2. Notification is created for User A (saying User B rejected)
3. User A sees the notification in "Request Updates" section

**User A removes User B:**

1. Request record is deleted from `friend_requests` table
2. Notification is created for User B (saying User A removed them)
3. User B sees the notification in "Updates" section
4. User B is removed from User A's circles and vice versa
5. User B will not be re-added automatically on next app load

#### 4d. **Notification Display**

The [app/(tabs)/notifications.tsx](<app/(tabs)/notifications.tsx>) page displays:

- "Request Updates" - responses to your sent requests (accepted/rejected)
- "Updates" - social notifications (removals, etc.)
- "Connection Requests" - incoming requests to accept/decline

The new notification service complements this system and stores notifications in the Supabase `notifications` table for future features.

---

### 5. **Complete Account Deletion**

**Problem:** The original "Clear All Data" button only deleted local data, leaving server-side records intact. This violated user privacy and made account deletion incomplete.

**Solution Implemented:**

#### 5a. **New `deleteAccount()` Function**

Added to [store/AuthContext.tsx](store/AuthContext.tsx):

- Deletes all friend requests (both sent and received)
- Deletes user's profile from Supabase
- Clears all local mood entries from SQLite
- Clears all user-specific AsyncStorage keys
- Deletes the auth account using Supabase admin API

#### 5b. **Updated Profile Page**

Modified [app/(tabs)/profile.tsx](<app/(tabs)/profile.tsx>):

- Changed "Clear All Data" button to "Delete Account"
- Updated dialog message to explain full account deletion
- Calls `deleteAccount()` instead of partial local cleanup

**Data Deleted:**

- ✅ Auth account
- ✅ User profile
- ✅ All friend requests
- ✅ All mood entries
- ✅ All cached data

---

### 6. **Prevent Automatic Re-adding of Removed Users**

**Problem:** When users removed someone from friend/family, they would get re-added automatically on next app load.

**Solution Implemented:**

#### 6a. **Fixed Sync Logic**

Updated [app/(tabs)/family.tsx](<app/(tabs)/family.tsx>) to properly sync local circles with Supabase:

- **Before:** Only added missing connections, never removed stale ones
- **After:** Filters local lists to keep only users still connected in Supabase, then adds any missing connections

**Key Changes:**

- `setFamilyMembers()` and `setFriendMembers()` now filter to keep only `isYou` (admin) + connected users
- Then adds any missing connections from Supabase
- This ensures removed users are permanently removed and don't get re-added

#### 6b. **Updated `removeConnection()`**

Modified [services/friendRequestService.ts](services/friendRequestService.ts):

- Now accepts `relationshipType` parameter
- Creates notification for the removed user before deleting the connection
- Ensures the removal is communicated to both parties

---

### 7. **Local Data Clearing (Profile Page)**

**Problem:** User wanted the profile page "Delete all data" to only clear local database, not delete the Supabase account.

**Solution Implemented:**

- Reverted [app/(tabs)/profile.tsx](<app/(tabs)/profile.tsx>) back to original implementation
- Button now says "Clear All Data" and only clears:
  - Local mood entries from SQLite
  - User-specific AsyncStorage keys
  - Cached data
- Does NOT delete Supabase account or server data
- User can still log back in and see their server data

---

### 5. **Delete All Data from Profile**

**Problem:** The original "Clear All Data" button only deleted local data, leaving server-side records intact. This violated user privacy and made account deletion incomplete.

**Solution Implemented:**

#### 5a. **New `deleteAccount()` Function**

Added to [store/AuthContext.tsx](store/AuthContext.tsx):

- Deletes all friend requests (both sent and received)
- Deletes user's profile from Supabase
- Clears all local mood entries from SQLite
- Clears all user-specific AsyncStorage keys
- Deletes the auth account using Supabase admin API

#### 5b. **Updated Profile Page**

Modified [app/(tabs)/profile.tsx](<app/(tabs)/profile.tsx>):

- Changed "Clear All Data" button to "Delete Account"
- Updated dialog message to explain full account deletion
- Calls `deleteAccount()` instead of partial local cleanup
- Redirects to login after successful deletion

**Data Deleted:**

- ✅ Auth account
- ✅ User profile
- ✅ All friend requests
- ✅ All mood entries
- ✅ All cached data

---

## 🔧 Setup Instructions

### Step 1: Run Supabase SQL Setup

1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Copy and paste the contents of [DATABASE_SETUP.sql](DATABASE_SETUP.sql)
4. Click "Run" to execute

This will:

- Create the `notifications` table if it doesn't exist
- Create indexes for performance
- Set up Row-Level Security (RLS) policies
- Create a cleanup function

### Step 2: Enable RLS on Existing Tables

If you already have `profiles` and `friend_requests` tables, make sure RLS is enabled:

1. In Supabase, go to **Authentication** → **Policies**
2. For each table, ensure:
   - `Enable RLS is toggled ON`
   - The policies from DATABASE_SETUP.sql are applied

### Step 3: Verify Setup

Run this query in Supabase SQL Editor to verify RLS is enabled:

```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN (
  'profiles', 'friend_requests', 'notifications'
);
```

Expected output: All three tables should have `rowsecurity = true`

### Step 4: Test the App

1. **Test Logout:**
   - Log in as User A
   - Save some data (mood entries, friends, etc.)
   - Log out
   - Log in as User B
   - Verify User A's data is not visible

2. **Test Friend Requests:**
   - Log in as User A on Device 1
   - Log in as User B on Device 2
   - User A: Go to Family page, search for User B
   - User A: Send friend request
   - User B: Go to Notifications tab, see "Connection Requests"
   - User B: Accept request
   - User A: See notification in "Request Updates"
   - Both users should see each other in Friend/Family circles

3. **Test Account Deletion:**
   - Log in as User A
   - Go to Profile → Delete Account
   - Confirm deletion
   - Try to log back in - should fail
   - Log in as User B and verify User A's data is gone

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MoodBoard App                        │
└─────────────────────────────────────────────────────────┘

LOGOUT FLOW:
  User clicks Logout
    ↓
  Clear AsyncStorage (all user-scoped keys)
    ↓
  Call supabase.auth.signOut()
    ↓
  Clear user & session state
    ↓
  Redirect to /login

FRIEND REQUEST FLOW:
  User A sends request to User B
    ↓
  Create friend_request record (pending)
    ↓
  Create notification for User B
    ↓
  User B sees request in Notifications tab
    ↓
  User B accepts/rejects
    ↓
  Update friend_request status
    ↓
  Create notification for User A
    ↓
  User A sees result in Notifications tab

ACCOUNT DELETION FLOW:
  User clicks "Delete Account"
    ↓
  Show confirmation dialog
    ↓
  Delete all friend_requests
    ↓
  Delete profile record
    ↓
  Delete all mood entries from SQLite
    ↓
  Clear all AsyncStorage keys
    ↓
  Delete auth account
    ↓
  Redirect to /login

DATA ISOLATION:
  Device 1:                  Device 2:
    User A logs in    →→→      User B logs in
    AsyncStorage: uid-A        AsyncStorage: uid-B
    SQLite: uid-A              SQLite: uid-B
    Auth: User A               Auth: User B
       ↓ (logout)                 (no interference)
       ↓ (clear A's cache)
    User B logs in    →→→      User B's data intact
    AsyncStorage: uid-B        Still has their data
    SQLite: uid-B
    Auth: User B
```

---

## 🔐 Security Considerations

### RLS Policies

- **Profiles:** Public read (for friend discovery), write protected
- **Friend Requests:** Only sender/receiver can view, receiver can respond
- **Notifications:** Only the recipient can read their notifications
- **Mood Data:** Never synced to server, stays in local SQLite

### User Data Cleanup

- Account deletion removes ALL associated data from Supabase
- Orphaned foreign keys are automatically handled with `ON DELETE CASCADE`
- Local SQLite data is cleared during logout and account deletion

### Multi-Device Safety

- AsyncStorage keys are user-scoped to prevent data leakage
- Each user account has isolated mood data
- Friend/Family circles are stored per-user

---

## 📝 Future Enhancements

1. **Push Notifications:** Currently using in-app notifications. Could add Firebase Cloud Messaging for push notifications.

2. **Notification Preferences:** Users could choose which types of notifications they want to receive.

3. **Notification Archiving:** Instead of deleting notifications, mark them as archived.

4. **Batch Notifications:** Group multiple requests into summary notifications.

5. **Notification Scheduling:** Quiet hours for notifications.

---

## 🐛 Troubleshooting

### Issue: User A can see User B's data

**Solution:** Run DATABASE_SETUP.sql to ensure RLS policies are correctly configured

### Issue: Notifications not appearing

**Solution:**

1. Verify `notifications` table exists: `SELECT COUNT(*) FROM public.notifications;`
2. Check RLS policies are enabled
3. Verify notification creation calls are being made in friendRequestService.ts

### Issue: User can't delete account

**Solution:**

1. Check that user is authenticated
2. Verify Supabase auth service role key has delete permissions
3. Check browser console for error messages

### Issue: Data persists after logout

**Solution:**

1. Clear app cache: Settings → Apps → MoodBoard → Clear Cache
2. Verify AsyncStorage cleanup is happening in signOut()
3. Check that all AsyncStorage keys include user ID

---

## 📞 Support

For issues or questions:

1. Check Supabase error logs in the dashboard
2. Check browser console for error messages
3. Verify RLS policies are correctly set up
4. Test with the provided SQL setup script

---

## Files Changed

### Modified Files:

- [store/AuthContext.tsx](store/AuthContext.tsx) - Logout cleanup & account deletion
- [services/friendRequestService.ts](services/friendRequestService.ts) - Notification integration
- [app/(tabs)/profile.tsx](<app/(tabs)/profile.tsx>) - Full account deletion

### New Files:

- [services/notificationService.ts](services/notificationService.ts) - Notification management
- [DATABASE_SETUP.sql](DATABASE_SETUP.sql) - Database schema & RLS setup

---

## Files Changed

### Modified Files:

- [store/AuthContext.tsx](store/AuthContext.tsx) - Logout cleanup & account deletion (kept for future use)
- [services/friendRequestService.ts](services/friendRequestService.ts) - Notification integration & removal notifications
- [app/(tabs)/profile.tsx](<app/(tabs)/profile.tsx>) - Reverted to local data clearing only
- [app/(tabs)\family.tsx](<app/(tabs)\family.tsx>) - Fixed sync logic to prevent re-adding removed users
- [app/(tabs)\notifications.tsx](<app/(tabs)\notifications.tsx>) - Added social notifications display

### New Files:

- [services/notificationService.ts](services/notificationService.ts) - Complete notification management
- [DATABASE_SETUP.sql](DATABASE_SETUP.sql) - Database schema & RLS policies (updated with new notification types)

---

## Version History

**v1.0 - Initial Fixes**

- Fixed logout data leakage issue
- Implemented account deletion
- Added notification system for friend requests
- Implemented RLS policies for multi-user isolation

**v1.1 - Removal & Local Data Fixes**

- Fixed automatic re-adding of removed friends/family
- Added removal notifications
- Changed profile page to clear local data only (not delete account)
- Improved sync logic to prevent stale connections
- Added social notifications display in notifications tab
