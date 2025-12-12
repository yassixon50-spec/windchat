# Implementation Plan

- [x] 1. Backend asosiy strukturani yaratish

  - [x] 1.1 Server entry point va Express konfiguratsiyasi


    - Express app, CORS, JSON parser sozlash
    - Environment variables yuklash
    - _Requirements: 7.1, 7.2_

  - [x] 1.2 Prisma client va database ulanishini sozlash

    - Prisma client instance yaratish
    - Database connection utility
    - _Requirements: 1.1_

  - [x] 1.3 API response helper funksiyalarini yaratish

    - Success va error response formatlari
    - _Requirements: 7.1, 7.2, 7.3_

- [-] 2. Authentication backend implementatsiyasi

  - [x] 2.1 Validation schemas yaratish (Zod)

    - Phone number validation (+998XXXXXXXXX)
    - Password validation (min 8 chars)
    - Register va Login request schemas
    - _Requirements: 1.3, 1.4, 6.4_
  - [ ] 2.2 Property test: Invalid phone format rejection
    - **Property 4: Invalid Phone Format Rejection**
    - **Validates: Requirements 1.4**
  - [ ] 2.3 Property test: Short password rejection
    - **Property 3: Short Password Rejection**
    - **Validates: Requirements 1.3, 6.4**


  - [ ] 2.4 User service implementatsiyasi
    - createUser, findByPhone, findById funksiyalari
    - Password hashing (bcrypt, cost 10)
    - Online status update
    - _Requirements: 1.1, 1.5, 2.4, 6.1_
  - [x] 2.5 Property test: Password hashing


    - **Property 5: Password Hashing**
    - **Validates: Requirements 1.5, 6.1**
  - [x] 2.6 Auth middleware yaratish


    - JWT token generation
    - Token verification
    - Request authentication
    - _Requirements: 2.1, 2.5, 3.1_
  - [ ] 2.7 Auth routes implementatsiyasi
    - POST /api/auth/register
    - POST /api/auth/login
    - GET /api/auth/me
    - POST /api/auth/logout
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.3, 3.4_
  - [ ] 2.8 Property test: Registration va Login
    - **Property 1: Valid Registration Creates User and Returns Token**
    - **Property 2: Duplicate Phone Registration Rejection**
    - **Property 6: Valid Login Returns Token**
    - **Property 7: Wrong Password Rejection**
    - **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
  - [x] 2.9 Property test: User DTO excludes password

    - **Property 11: User DTO Excludes Password**


    - **Validates: Requirements 7.4**



- [ ] 3. Checkpoint - Backend testlarni tekshirish
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 4. Frontend asosiy strukturani yaratish
  - [ ] 4.1 Vite + React + TypeScript loyihasini sozlash
    - Tailwind CSS konfiguratsiyasi


    - Router sozlash (react-router-dom)
    - _Requirements: 4.1, 5.1_


  - [ ] 4.2 API client va Auth service yaratish
    - Axios instance
    - Token management (localStorage)

    - Auth API calls

    - _Requirements: 3.1, 3.2, 3.3_

  - [-] 4.3 Auth Context yaratish

    - User state management
    - Login, register, logout funksiyalari

    - Auto-authentication on load

    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Frontend UI komponentlarini yaratish

  - [ ] 5.1 Reusable UI komponentlari
    - InputField komponenti (validation, error display)
    - Button komponenti (loading state)
    - LoadingSpinner komponenti
    - _Requirements: 4.2, 4.3, 4.4, 5.2, 5.3, 5.4_
  - [ ] 5.2 AuthLayout komponenti
    - Professional dizayn (Telegram style)
    - Responsive layout
    - _Requirements: 4.1, 5.1_
  - [ ] 5.3 RegisterPage implementatsiyasi
    - Form fields: phone, firstName, lastName, password
    - Real-time validation
    - Submit handling va redirect
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 5.4 LoginPage implementatsiyasi
    - Form fields: phone, password
    - Password show/hide toggle
    - Error display va redirect
    - Link to register page
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3_
  - [ ] 5.5 Protected routes va navigation
    - Auth guard komponenti
    - Redirect logic
    - _Requirements: 3.2, 4.5, 5.5_

- [ ] 6. Final Checkpoint - Barcha testlarni tekshirish
  - Ensure all tests pass, ask the user if questions arise.
