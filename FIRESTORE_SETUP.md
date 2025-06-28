# Firestore Database Setup Guide

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