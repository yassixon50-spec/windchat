# Requirements Document

## Introduction

Telegram Clone - bu real-time messaging ilovasi bo'lib, foydalanuvchilarga shaxsiy va guruh chatlarida xabar almashish, fayl yuborish, kontaktlarni boshqarish va profil sozlamalarini o'zgartirish imkoniyatini beradi. Ilova Telegram messenjerining asosiy funksiyalarini takrorlaydi.

## Glossary

- **User (Foydalanuvchi)**: Tizimda ro'yxatdan o'tgan va autentifikatsiya qilingan shaxs
- **Chat**: Ikki yoki undan ortiq foydalanuvchi o'rtasidagi xabar almashish sessiyasi
- **Private Chat (Shaxsiy Chat)**: Faqat ikki foydalanuvchi o'rtasidagi chat
- **Group Chat (Guruh Chat)**: Ikki yoki undan ortiq foydalanuvchi ishtirok etadigan chat
- **Message (Xabar)**: Chat ichida yuborilgan matn, rasm yoki fayl
- **Contact (Kontakt)**: Foydalanuvchining saqlangan aloqa ro'yxatidagi boshqa foydalanuvchi
- **Online Status**: Foydalanuvchining hozirda tizimda faol yoki faol emasligini ko'rsatuvchi holat
- **Typing Indicator**: Foydalanuvchi xabar yozayotganini ko'rsatuvchi signal
- **Read Receipt**: Xabar o'qilganligini tasdiqlovchi belgi

## Requirements

### Requirement 1: User Authentication (Foydalanuvchi Autentifikatsiyasi)

**User Story:** As a user, I want to register and login to the application, so that I can securely access my messages and contacts.

#### Acceptance Criteria

1. WHEN a user submits valid phone number and password THEN the System SHALL create a new user account and return authentication token
2. WHEN a user submits invalid or duplicate phone number THEN the System SHALL reject registration and return specific error message
3. WHEN a registered user submits correct credentials THEN the System SHALL authenticate the user and return JWT token
4. WHEN a user submits incorrect credentials THEN the System SHALL reject login attempt and return authentication error
5. WHEN a user logs out THEN the System SHALL invalidate the session and update online status to offline

### Requirement 2: User Profile Management (Profil Boshqaruvi)

**User Story:** As a user, I want to manage my profile information, so that other users can identify me.

#### Acceptance Criteria

1. WHEN a user updates profile fields (firstName, lastName, username, bio) THEN the System SHALL persist changes and return updated profile
2. WHEN a user uploads avatar image THEN the System SHALL store the image and update avatar URL in profile
3. WHEN a user sets unique username THEN the System SHALL validate uniqueness and update profile
4. WHEN a user attempts to set duplicate username THEN the System SHALL reject update and return error message
5. WHEN a user requests profile data THEN the System SHALL return current profile information

### Requirement 3: Contact Management (Kontaktlar Boshqaruvi)

**User Story:** As a user, I want to manage my contacts list, so that I can easily find and message people I know.

#### Acceptance Criteria

1. WHEN a user adds another user as contact THEN the System SHALL create contact relationship and return contact details
2. WHEN a user removes a contact THEN the System SHALL delete contact relationship from database
3. WHEN a user requests contacts list THEN the System SHALL return all contacts with their current online status
4. WHEN a user searches contacts by name or phone THEN the System SHALL return matching contacts
5. WHEN a user sets nickname for contact THEN the System SHALL update contact nickname

### Requirement 4: Private Chat (Shaxsiy Chat)

**User Story:** As a user, I want to have private conversations with other users, so that I can communicate one-on-one.

#### Acceptance Criteria

1. WHEN a user initiates chat with another user THEN the System SHALL create private chat or return existing chat
2. WHEN a user sends message in private chat THEN the System SHALL deliver message to recipient in real-time
3. WHEN a user requests chat history THEN the System SHALL return paginated messages ordered by timestamp
4. WHEN a user deletes private chat THEN the System SHALL remove chat from user's chat list
5. WHEN recipient is offline THEN the System SHALL store message and deliver when recipient connects

### Requirement 5: Group Chat (Guruh Chat)

**User Story:** As a user, I want to create and participate in group conversations, so that I can communicate with multiple people simultaneously.

#### Acceptance Criteria

1. WHEN a user creates group chat with name and participants THEN the System SHALL create group and assign creator as owner
2. WHEN group owner adds participant THEN the System SHALL add user to group and notify all members
3. WHEN group owner removes participant THEN the System SHALL remove user from group and notify all members
4. WHEN group admin updates group info (name, avatar) THEN the System SHALL persist changes and notify members
5. WHEN a user leaves group THEN the System SHALL remove user from participants and notify remaining members
6. WHEN a user sends message in group THEN the System SHALL deliver message to all online participants in real-time

### Requirement 6: Messaging Features (Xabar Funksiyalari)

**User Story:** As a user, I want rich messaging features, so that I can communicate effectively.

#### Acceptance Criteria

1. WHEN a user sends text message THEN the System SHALL store message with timestamp and sender info
2. WHEN a user sends image or file THEN the System SHALL upload file to storage and create message with file URL
3. WHEN a user replies to message THEN the System SHALL create message with reference to original message
4. WHEN a user edits sent message THEN the System SHALL update message content and mark as edited
5. WHEN a user deletes sent message THEN the System SHALL mark message as deleted and hide content
6. WHEN recipient reads message THEN the System SHALL update read receipt and notify sender
7. WHEN serializing message for storage or transmission THEN the System SHALL encode message data as JSON
8. WHEN deserializing message from storage or transmission THEN the System SHALL decode JSON and reconstruct message object

### Requirement 7: Real-time Features (Real-time Funksiyalar)

**User Story:** As a user, I want to see real-time updates, so that I have immediate awareness of new messages and user activity.

#### Acceptance Criteria

1. WHEN a user connects to application THEN the System SHALL establish WebSocket connection and update online status
2. WHEN a user disconnects THEN the System SHALL update online status and last seen timestamp
3. WHEN a user starts typing in chat THEN the System SHALL broadcast typing indicator to chat participants
4. WHEN a user stops typing THEN the System SHALL remove typing indicator for chat participants
5. WHEN new message arrives THEN the System SHALL push notification to recipient via WebSocket
6. WHEN user status changes THEN the System SHALL broadcast status update to user's contacts

### Requirement 8: Search Functionality (Qidiruv)

**User Story:** As a user, I want to search messages and users, so that I can find specific content quickly.

#### Acceptance Criteria

1. WHEN a user searches messages by keyword THEN the System SHALL return matching messages across all chats
2. WHEN a user searches users by username or phone THEN the System SHALL return matching user profiles
3. WHEN displaying search results THEN the System SHALL show message content, sender, chat name, and timestamp
4. WHEN no results found THEN the System SHALL display empty state message

### Requirement 9: Data Persistence (Ma'lumotlar Saqlash)

**User Story:** As a user, I want my data to be reliably stored, so that I don't lose my messages and contacts.

#### Acceptance Criteria

1. WHEN storing user data THEN the System SHALL persist to PostgreSQL database with proper relationships
2. WHEN storing files THEN the System SHALL save to file storage and maintain reference in database
3. WHEN querying large datasets THEN the System SHALL implement pagination to optimize performance
4. WHEN database error occurs THEN the System SHALL handle gracefully and return appropriate error message

