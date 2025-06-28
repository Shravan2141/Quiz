# Firebase Setup Guide for QuizMaster

## 🔥 **Firebase Configuration**

### **1. Firebase Project Setup**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Enable the following services:

### **2. Authentication Setup**
1. **Go to Authentication → Sign-in method**
2. **Enable Google Sign-in:**
   - Click on "Google"
   - Toggle "Enable" to ON
   - Add your authorized domain (e.g., `localhost` for development)
   - Click "Save"
3. **Enable Email/Password Sign-in:**
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Toggle "Email link (passwordless sign-in)" to OFF (we're using traditional email/password)
   - Click "Save"

### **3. Firestore Database Setup**
1. **Go to Firestore Database**
2. **Create database** (if not already created)
3. **Start in test mode** (for development)
4. **Set up security rules** (see below)

### **4. Security Rules**
Add these rules to your Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read all quizzes
    match /quizzes/{quizId} {
      allow read: if true;
      allow write: if request.auth != null && 
                   (request.auth.uid == resource.data.createdBy || 
                    !('createdBy' in resource.data));
    }
    
    // Allow users to read/write their own quiz results
    match /quizResults/{resultId} {
      allow read, write: if request.auth != null && 
                        (request.auth.uid == resource.data.userId || 
                         !('userId' in resource.data));
    }
    
    // Allow users to read/write their own user data
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                        request.auth.uid == userId;
    }
  }
}
```

### **5. Environment Variables**
Make sure your `firebase.js` file has the correct configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 🚀 **Deployment Setup**

### **For Netlify:**
- **Build command:** `npm run build`
- **Publish directory:** `quiz/dist`
- **Add authorized domain:** `your-site.netlify.app`

### **For Vercel:**
- **Framework preset:** Vite
- **Root directory:** `quiz`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Add authorized domain:** `your-site.vercel.app`

## ✅ **Testing Authentication**

1. **Google Authentication:**
   - Click "Login" or "Register" in the app
   - Select user type (Student/Teacher)
   - Click "Continue with Google"
   - Complete Google sign-in process

2. **Email/Password Authentication:**
   - Click "Register" to create a new account
   - Fill in your details and select user type
   - Click "Register as [UserType]"
   - Or click "Login" to sign in with existing credentials

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"Permission denied" errors:**
   - Check Firestore security rules
   - Ensure user is authenticated

2. **Google sign-in not working:**
   - Check if Google auth is enabled in Firebase
   - Verify authorized domains include your deployment URL
   - Ensure popup blockers are disabled

3. **Email/password sign-in not working:**
   - Check if Email/Password auth is enabled in Firebase
   - Verify email format is valid
   - Ensure password meets minimum requirements (6+ characters)

4. **"Invalid domain" errors:**
   - Add your domain to authorized domains in Firebase Console
   - For development, add `localhost`
   - For production, add your deployed domain

### **Development vs Production:**
- **Development:** Use `localhost` in authorized domains
- **Production:** Add your deployed domain to authorized domains

## 📱 **Features Available**

✅ **Google OAuth Authentication**  
✅ **Email/Password Authentication**  
✅ **Role-based Access (Student/Teacher)**  
✅ **Persistent Sessions**  
✅ **Secure Firestore Access**  
✅ **Quiz Creation & Management**  
✅ **Quiz Taking & Results Tracking**  
✅ **Responsive Design**  
✅ **Loading States & Error Handling**

## Step 1: Enable Firestore Database

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `quiz-bf9e1`
3. In the left sidebar, click on "Firestore Database"
4. Click "Create Database"
5. Choose "Start in test mode" for now (we'll add security rules later)
6. Select a location closest to your users
7. Click "Done"

## Step 2: Set Up Security Rules

1. In the Firestore Database section, click on the "Rules" tab
2. Replace the existing rules with the content from `firestore.rules` file
3. Click "Publish"

## Step 3: Test Database Access

1. Start your React application: `npm run dev`
2. Login as a teacher using Google authentication
3. Click the "🔧 Test DB Access" button on the teacher dashboard
4. Check the browser console for test results
5. If successful, you should see "Firestore access test successful!"

## Step 4: Create Your First Quiz

1. As a teacher, click "+ Add New Quiz"
2. Fill in the quiz details:
   - Title: "Sample Quiz"
   - Description: "A test quiz to verify database access"
3. Add at least one question with 4 options
4. Click "Create Quiz"
5. You should be redirected to the dashboard and see your quiz

## Troubleshooting

### If you get "Permission denied" errors:

1. Check that you're logged in as a teacher
2. Verify the security rules are published in Firebase Console
3. Make sure your Firebase project ID matches the one in `firebase.js`

### If quizzes don't appear on dashboard:

1. Check browser console for any errors
2. Verify the `fetchQuizzes()` function is being called
3. Check that the user UID matches the `createdBy` field in the quiz documents

### Database Structure

The application uses these collections:

- **quizzes**: Stores quiz data
  - `title`: Quiz title
  - `description`: Quiz description
  - `questions`: Array of question objects
  - `createdBy`: User UID of the creator
  - `createdAt`: Timestamp
  - `isActive`: Boolean (true/false)

- **quizResults**: Stores quiz attempt results
  - `quizId`: Reference to the quiz
  - `userId`: User UID
  - `score`: Number of correct answers
  - `totalQuestions`: Total number of questions
  - `percentage`: Score percentage
  - `completedAt`: Timestamp

## Security Rules Explanation

- **Teachers**: Can create, read, update, and delete their own quizzes
- **Students**: Can only read active quizzes and create their own results
- **Authentication**: All operations require user authentication
- **Data Ownership**: Users can only modify their own data

## Next Steps

Once the database is working:

1. Remove the debug information from the dashboard
2. Remove the test button
3. Test the full quiz creation and taking flow
4. Verify that students can see and take quizzes
5. Check that results are being saved correctly 