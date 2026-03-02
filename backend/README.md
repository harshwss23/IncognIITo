# IncognIITo Backend - Authentication System

Backend authentication system for IncognIITo using **Node.js**, **Express**, **PostgreSQL**, **JWT**, and **SMTP** (Gmail).

---

## File Structure & What Each File Does

### **Configuration Files** (`src/config/`)

#### 1. `database.ts`
- **Purpose**: PostgreSQL database connection
- **What it does**: 
  - Creates a connection pool to your PostgreSQL database
  - Reads DB credentials from `.env` file
  - Provides a `query()` function for executing SQL queries
  - Monitors connection health

#### 2. `smtp.ts`
- **Purpose**: Email server configuration
- **What it does**:
  - Configures nodemailer with Gmail SMTP settings
  - Uses your Gmail app password from `.env`
  - Verifies SMTP connection on startup
  - Used by emailService to send emails

---

### **Services** (`src/services/`)

#### 3. `emailService.ts`
- **Purpose**: Email sending functionality (from Shopio's EmailNotificationService)
- **What it does**:
  - `sendOTP(email, otp)` - Sends OTP verification email
  - `sendWelcomeEmail(email, name)` - Sends welcome email after verification
  - `sendPasswordResetEmail(email, token)` - Sends password reset link
  - Uses HTML templates for professional emails

#### 4. `otpService.ts`
- **Purpose**: OTP generation and verification (from Shopio's EmailOtpService)
- **What it does**:
  - Generates 6-digit random OTP
  - Validates IITK email domain (`@iitk.ac.in`)
  - Stores OTP in database with 5-minute expiry
  - Invalidates old OTPs when new one is requested
  - Verifies OTP and marks user as verified
  - Prevents spam with rate limiting (max 3 OTPs per hour)

#### 5. `tokenService.ts`
- **Purpose**: JWT token management (from Shopio's JwtUtil)
- **What it does**:
  - Generates access tokens (15 min expiry)
  - Generates refresh tokens (7 days expiry)
  - Validates and decodes tokens
  - Stores tokens in database for session management
  - Cleans up expired sessions
  - Handles token refresh

---

### **Controllers** (`src/controllers/`)

#### 6. `authController.ts`
- **Purpose**: Authentication business logic (from Shopio's AuthController)
- **What it does**:
  - `requestOTP()` - Sends OTP to IITK email
  - `verifyOTPAndSetPassword()` - Verifies OTP and creates account
  - `login()` - Login with email/password
  - `logout()` - Invalidates session
  - `refreshToken()` - Refreshes access token
  - `resendOTP()` - Resends OTP with cooldown
  - `getCurrentUser()` - Gets logged-in user info

---

### **Middleware** (`src/middleware/`)

#### 7. `authMiddleware.ts`
- **Purpose**: JWT authentication (from Shopio's JwtAuthenticationFilter)
- **What it does**:
  - Extracts JWT from `Authorization: Bearer <token>` header
  - Validates the token
  - Attaches user info to `req.user`
  - Protects routes requiring authentication
  - `requireVerified()` - Ensures email is verified

#### 8. `errorHandler.ts`
- **Purpose**: Centralized error handling
- **What it does**:
  - Catches all errors in the app
  - Formats error responses consistently
  - Logs errors for debugging
  - Hides sensitive details in production

---

### **Routes** (`src/routes/`)

#### 9. `authRoutes.ts`
- **Purpose**: Authentication API endpoints
- **Defines these routes**:
  - `POST /api/auth/request-otp` - Send OTP
  - `POST /api/auth/verify-otp` - Verify OTP & set password
  - `POST /api/auth/login` - Login
  - `POST /api/auth/logout` - Logout (protected)
  - `POST /api/auth/refresh` - Refresh token
  - `POST /api/auth/resend-otp` - Resend OTP
  - `GET /api/auth/me` - Get current user (protected)

#### 10. `userRoutes.ts`
- **Purpose**: User profile management
- **Defines these routes**:
  - `GET /api/users/profile` - Get user profile (protected)
  - `PUT /api/users/profile` - Update profile (protected)
  - `DELETE /api/users/account` - Delete account (protected)

---

### **Utilities** (`src/utils/`)

#### 11. `validation.ts`
- **Purpose**: Input validation helpers
- **What it does**:
  - `isValidEmail()` - Checks email format
  - `isIITKEmail()` - Checks if email ends with `@iitk.ac.in`
  - `isValidPassword()` - Checks password strength (min 8 chars, letters + numbers)
  - `isValidOTP()` - Checks if OTP is 6 digits
  - `sanitizeEmail()` - Lowercase and trim email

---

### **Main Server** (`src/`)

#### 12. `server.ts`
- **Purpose**: Express app setup (from Shopio's main class)
- **What it does**:
  - Initializes Express app
  - Configures CORS for frontend communication
  - Sets up JSON parsing
  - Registers all routes
  - Starts server on port 5000
  - Schedules cleanup jobs (expired sessions)
  - Handles graceful shutdown

---

## Authentication Flow

### **Registration Flow** (IITK Email Only)

```
1. User enters IITK email (@iitk.ac.in)
   ↓
2. POST /api/auth/request-otp { email }
   ↓
3. Backend sends 6-digit OTP to email (expires in 5 min)
   ↓
4. User enters OTP + password
   ↓
5. POST /api/auth/verify-otp { email, otp, password }
   ↓
6. Backend verifies OTP, sets password, returns JWT tokens
   ↓
7. User is logged in ✅
```

### **Login Flow** (Existing Users)

```
1. User enters email + password
   ↓
2. POST /api/auth/login { email, password }
   ↓
3. Backend checks:
   - User exists?
   - Email verified?
   - Password correct?
   ↓
4. Returns JWT tokens
   ↓
5. User is logged in
```

---

## 🚀 How to Run the Backend

### **1. Make sure PostgreSQL is running**

```bash
pg_lsclusters  # Check status
sudo pg_ctlcluster 14 main start  # Start if needed
```

### **2. Make sure .env is configured**

Your `.env` file should have:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=incogniito_db
DB_USER=incogniito_user
DB_PASSWORD=CS253_69_7

# Server
PORT=5000

# JWT
JWT_SECRET=motherfucking_secret_key69

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=joel.yt987@gmail.com
SMTP_PASS=epfv ceni dwsu nacl
EMAIL_FROM=joel.yt987@gmail.com

# Frontend
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
```

### **3. Start the server**

```bash
cd /home/joelb23/IncognIITo/UI-flow/backend

# Development mode (auto-reload on file changes)
npm run dev

# Production build
npm run build
npm start
```

### **4. Test the server**

```bash
# Health check
curl http://localhost:5000/health

# Should return:
# {"success":true,"message":"Server is running","timestamp":"..."}
```

---

## 🧪 Testing the API

### **Test OTP Request**

```bash
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your@iitk.ac.in"}'
```

### **Test OTP Verification**

```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your@iitk.ac.in",
    "otp":"123456",
    "password":"MyPassword123"
  }'
```

### **Test Login**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your@iitk.ac.in",
    "password":"MyPassword123"
  }'
```

### **Test Protected Route**

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 📊 Database Schema (Your Actual Schema)

### **users**
- `id` - Primary key
- `email` - Unique, IITK email
- `password_hash` - Bcrypt hashed password
- `display_name` - User's display name (default: empty)
- `verified` - Email verification status

### **verification_tokens**
- `id` - Primary key
- `user_id` - Foreign key to users
- `token` - 6-digit OTP
- `token_type` - 'email_verify' or 'password_reset'
- `expires_at` - Expiry timestamp (5 min)
- `used` - Single-use flag

### **sessions**
- `id` - Primary key
- `session_id` - JWT refresh token
- `user_id` - Foreign key to users
- `expires_at` - 7 days from creation
- `last_activity` - Last API call timestamp

### **user_profiles**
- `id` - Primary key
- `user_id` - Foreign key to users (unique)
- `interests` - Array of interests
- `avatar_url` - Profile picture URL
- `total_chats` - Chat count
- `total_reports` - Report count
- `rating` - User rating (0-5)
- `is_banned` - Ban status

---

## 🔧 What Logic Was Taken from Shopio (Java Backend)

✅ **OTP Generation** - 6-digit random number  
✅ **Email Validation** - Only `@iitk.ac.in` allowed  
✅ **OTP Expiry** - 5 minutes timeout  
✅ **Single-use OTP** - Mark as `used` after verification  
✅ **Old OTP Invalidation** - Prevent multiple active OTPs  
✅ **JWT Authentication** - Access + Refresh token pattern  
✅ **Verification Required** - Must verify email before login  
✅ **Rate Limiting** - Max 3 OTPs per hour per email  
✅ **Session Cleanup** - Scheduled job to remove expired sessions  
✅ **Password Hashing** - Bcrypt with 10 rounds  

---

## 📝 Next Steps (Frontend Integration - You'll Learn This)

1. **Create API client** in `src/app/api/authApi.ts`
2. **Create Auth Context** in `src/app/contexts/AuthContext.tsx`
3. **Update existing components**:
   - `RegistrationScreen.tsx` → Call `/api/auth/request-otp`
   - `OTPVerificationScreen.tsx` → Call `/api/auth/verify-otp`
   - `DedicatedLoginScreen.tsx` → Call `/api/auth/login`
4. **Add Protected Routes** using `authMiddleware`
5. **Store tokens** in localStorage or httpOnly cookies

---

## Common Issues & Solutions

### **SMTP Error: "Invalid login"**
→ Make sure you're using a Gmail **App Password**, not your regular password

### **Database Connection Refused**
→ Check if PostgreSQL is running: `pg_lsclusters`

### **CORS Error from Frontend**
→ Make sure `FRONTEND_URL` in `.env` matches your Vite dev server

### **"Only IITK emails allowed"**
→ Email must end with `@iitk.ac.in`

---

**Your backend is ready! All files are in place and match your database schema. Next step is to integrate with your React frontend.**
