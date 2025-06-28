import { useState, useEffect } from 'react'
import './App.css'
import { auth, provider, db } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { GoogleAuthProvider } from 'firebase/auth'
import logo from './assets/logo.png'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [userType, setUserType] = useState('student')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard') // 'dashboard', 'create-quiz', 'edit-quiz', 'results'
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'student'
  })
  const [user, setUser] = useState(null)
  const [quizData, setQuizData] = useState([])
  const [showAddQuiz, setShowAddQuiz] = useState(false)
  const [showEditQuiz, setShowEditQuiz] = useState(false)
  const [showQuizResults, setShowQuizResults] = useState(false)
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    questions: []
  })
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  })
  const [quizResults, setQuizResults] = useState([])
  const [currentQuizSession, setCurrentQuizSession] = useState({
    quizId: null,
    answers: [],
    score: 0,
    totalQuestions: 0
  })

  const handleLogin = (e) => {
    e.preventDefault()
    // Here you would typically make an API call to authenticate
    console.log('Login attempt:', { ...loginForm, userType })
    // For now, just close the modal - implement actual authentication later
    setShowLogin(false)
  }

  const handleRegister = (e) => {
    e.preventDefault()
    if (registerForm.password !== registerForm.confirmPassword) {
      alert('Passwords do not match!')
      return
    }
    // Here you would typically make an API call to register
    console.log('Register attempt:', registerForm)
    // For now, just close the modal - implement actual authentication later
    setShowRegister(false)
  }

  const handleGoogleLogin = async (userType) => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Save userType to localStorage for session persistence
      localStorage.setItem('userType', userType)
      setUserType(userType)
      
      // Close modals
      setShowLogin(false)
      setShowRegister(false)
      
      // The auth state listener will handle setting the user and fetching data
      
    } catch (error) {
      console.error('Google login failed:', error)
      alert('Google login failed: ' + error.message)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      // The auth state listener will handle clearing the user and login state
      setLoginForm({ email: '', password: '' })
      setRegisterForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        userType: 'student'
      })
      // Reset quiz-related state
      setShowAddQuiz(false)
      setShowEditQuiz(false)
      setShowQuizResults(false)
      setCurrentQuiz(null)
      setQuizForm({ title: '', description: '', questions: [] })
      setCurrentQuestion({ question: '', options: ['', '', '', ''], correctAnswer: 0 })
      setCurrentQuizSession({ quizId: null, answers: [], score: 0, totalQuestions: 0 })
    } catch (error) {
      alert('Logout failed: ' + error.message)
    }
  }

  const handleInputChange = (e, formType) => {
    if (formType === 'login') {
      setLoginForm({
        ...loginForm,
        [e.target.name]: e.target.value
      })
    } else {
      setRegisterForm({
        ...registerForm,
        [e.target.name]: e.target.value
      })
    }
  }

  const openLogin = () => {
    setShowLogin(true)
    setShowRegister(false)
  }

  const openRegister = () => {
    setShowRegister(true)
    setShowLogin(false)
  }

  const switchToRegister = () => {
    setShowLogin(false)
    setShowRegister(true)
  }

  const switchToLogin = () => {
    setShowRegister(false)
    setShowLogin(true)
  }

  // Page navigation functions
  const goToDashboard = () => {
    setCurrentPage('dashboard')
    setShowAddQuiz(false)
    setShowEditQuiz(false)
    setShowQuizResults(false)
  }

  const goToCreateQuiz = () => {
    setCurrentPage('create-quiz')
    setQuizForm({ title: '', description: '', questions: [] })
    setCurrentQuestion({ 
      question: '', 
      options: ['', '', '', ''], 
      correctAnswer: 0 
    })
  }

  const goToResults = () => {
    setCurrentPage('results')
    // Refresh quiz results when accessing the results page
    fetchQuizResults()
  }

  const goToEditQuiz = (quiz) => {
    setCurrentPage('edit-quiz')
    setCurrentQuiz(quiz)
    setQuizForm({
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions || []
    })
  }

  // Firestore: Add a quiz
  const addQuiz = async (quiz) => {
    try {
      if (!user?.uid) {
        throw new Error('User not authenticated')
      }
      
      const quizData = {
        ...quiz,
        createdBy: user.uid,
        createdAt: new Date(),
        isActive: true,
        userType: userType // Store the user type for reference
      }
      
      const docRef = await addDoc(collection(db, 'quizzes'), quizData)
      
      // Add the new quiz to the local state
      const newQuiz = {
        id: docRef.id,
        ...quizData
      }
      setQuizData(prevQuizzes => [...prevQuizzes, newQuiz])
      
      // Reset form and go back to dashboard
      setQuizForm({ title: '', description: '', questions: [] })
      setCurrentQuestion({ question: '', options: ['', '', '', ''], correctAnswer: 0 })
      goToDashboard()
      
      alert('Quiz created successfully!')
      
    } catch (error) {
      console.error('Failed to add quiz:', error)
      
      let errorMessage = 'Failed to create quiz: '
      if (error.code === 'permission-denied') {
        errorMessage += 'Permission denied. Please check your authentication.'
      } else if (error.code === 'unavailable') {
        errorMessage += 'Database is unavailable. Please check your internet connection.'
      } else {
        errorMessage += error.message
      }
      
      alert(errorMessage)
    }
  }

  // Firestore: Update a quiz
  const updateQuiz = async (quizId, updatedQuiz) => {
    try {
      const quizRef = doc(db, 'quizzes', quizId)
      await updateDoc(quizRef, {
        ...updatedQuiz,
        updatedAt: new Date()
      })
      alert('Quiz updated successfully!')
      goToDashboard()
      setCurrentQuiz(null)
      fetchQuizzes()
    } catch (error) {
      console.error('Failed to update quiz:', error)
      alert('Failed to update quiz: ' + error.message)
    }
  }

  // Firestore: Delete quiz results for a specific quiz
  const deleteQuizResults = async (quizId) => {
    try {
      const resultsQuery = query(collection(db, 'quizResults'), where('quizId', '==', quizId))
      const querySnapshot = await getDocs(resultsQuery)
      
      // Delete all results for this quiz
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      
      // Also remove from local state immediately
      setQuizResults(prev => prev.filter(result => result.quizId !== quizId))
      
      console.log(`Deleted ${querySnapshot.docs.length} results for quiz ${quizId}`)
    } catch (error) {
      console.error('Failed to delete quiz results:', error)
      throw error
    }
  }

  const deleteQuiz = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz? This will also delete all results for this quiz.')) {
      try {
        // First delete all results for this quiz
        await deleteQuizResults(quizId)
        
        // Then delete the quiz
        await deleteDoc(doc(db, 'quizzes', quizId))
        
        // Remove from local quiz data immediately
        setQuizData(prev => prev.filter(quiz => quiz.id !== quizId))
        
        // Clear any current quiz session if it's for this quiz
        if (currentQuizSession.quizId === quizId) {
          resetQuizSession()
        }
        
        // Clear current quiz if it's the one being deleted
        if (currentQuiz && currentQuiz.id === quizId) {
          setCurrentQuiz(null)
        }
        
        alert('Quiz and all its results deleted!')
        
        // Refresh data to ensure everything is updated
        fetchQuizzes()
        fetchQuizResults()
        
      } catch (error) {
        console.error('Failed to delete quiz:', error)
        alert('Failed to delete quiz: ' + error.message)
      }
    }
  }

  // Firestore: Fetch all quizzes
  const fetchQuizzes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'quizzes'))
      const quizzes = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }))
      
      setQuizData(quizzes)
      
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
      
      let errorMessage = 'Failed to fetch quizzes: '
      if (error.code === 'permission-denied') {
        errorMessage += 'Permission denied. Please check your authentication.'
      } else if (error.code === 'unavailable') {
        errorMessage += 'Database is unavailable. Please check your internet connection.'
      } else {
        errorMessage += error.message
      }
      
      alert(errorMessage)
      setQuizData([]) // Set empty array on error
    }
  }

  // Firestore: Fetch quiz results
  const fetchQuizResults = async (quizId = null) => {
    try {
      let q = collection(db, 'quizResults')
      if (quizId) {
        q = query(q, where('quizId', '==', quizId))
      }
      const querySnapshot = await getDocs(q)
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Clean up orphaned results (results for quizzes that no longer exist)
      if (!quizId && quizData.length > 0) {
        const validQuizIds = quizData.map(quiz => quiz.id)
        const orphanedResults = results.filter(result => !validQuizIds.includes(result.quizId))
        
        if (orphanedResults.length > 0) {
          console.log(`Found ${orphanedResults.length} orphaned results, cleaning up...`)
          // Delete orphaned results from Firestore
          const deletePromises = orphanedResults.map(result => 
            deleteDoc(doc(db, 'quizResults', result.id))
          )
          await Promise.all(deletePromises)
          
          // Remove orphaned results from the results array
          const cleanResults = results.filter(result => validQuizIds.includes(result.quizId))
          setQuizResults(cleanResults)
          console.log('Cleaned up orphaned results:', cleanResults)
        } else {
          setQuizResults(results)
        }
      } else {
        setQuizResults(results)
      }
      
    } catch (error) {
      alert('Failed to fetch results: ' + error.message)
    }
  }

  // Firestore: Save quiz result
  const saveQuizResult = async (result) => {
    try {
      await addDoc(collection(db, 'quizResults'), {
        ...result,
        userId: user?.uid,
        userName: user?.displayName || user?.email,
        completedAt: new Date()
      })
    } catch (error) {
      console.error('Failed to save result:', error)
    }
  }

  const handleAddQuiz = (e) => {
    e.preventDefault()
    
    if (!quizForm.title || !quizForm.description) {
      alert('Please fill in all fields')
      return
    }
    if (quizForm.questions.length === 0) {
      alert('Please add at least one question')
      return
    }
    
    addQuiz(quizForm)
  }

  const handleEditQuiz = (e) => {
    e.preventDefault()
    if (!quizForm.title || !quizForm.description) {
      alert('Please fill in all fields')
      return
    }
    if (quizForm.questions.length === 0) {
      alert('Please add at least one question')
      return
    }
    updateQuiz(currentQuiz.id, quizForm)
  }

  const handleQuizFormChange = (e) => {
    setQuizForm({
      ...quizForm,
      [e.target.name]: e.target.value
    })
  }

  const addQuestion = () => {
    if (!currentQuestion.question || currentQuestion.options.some(opt => !opt)) {
      alert('Please fill in all question fields')
      return
    }
    
    const newQuestion = { ...currentQuestion }
    
    setQuizForm({
      ...quizForm,
      questions: [...quizForm.questions, newQuestion]
    })
    
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    })
  }

  const removeQuestion = (index) => {
    const newQuestions = quizForm.questions.filter((_, i) => i !== index)
    setQuizForm({
      ...quizForm,
      questions: newQuestions
    })
  }

  const editQuiz = (quiz) => {
    setCurrentQuiz(quiz)
    setQuizForm({
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions || []
    })
    setShowEditQuiz(true)
  }

  // Check if student has already taken a quiz
  const hasStudentTakenQuiz = (quizId) => {
    return quizResults.some(result => 
      result.quizId === quizId && result.userId === user?.uid
    )
  }

  // Validate if a quiz still exists in the quiz data
  const isQuizValid = (quizId) => {
    return quizData.some(quiz => quiz.id === quizId)
  }

  const startQuiz = (quiz) => {
    // Check if the quiz still exists
    if (!isQuizValid(quiz.id)) {
      alert('This quiz is no longer available.')
      // Refresh data to ensure we have the latest state
      fetchQuizzes()
      fetchQuizResults()
      return
    }
    
    // Check if student has already taken this quiz
    if (userType === 'student' && hasStudentTakenQuiz(quiz.id)) {
      alert('You have already taken this quiz. You can only take each quiz once.')
      return
    }
    
    setCurrentQuizSession({
      quizId: quiz.id,
      answers: [],
      score: 0,
      totalQuestions: quiz.questions?.length || 0,
      currentQuestionIndex: 0
    })
    setCurrentQuiz(quiz)
  }

  const submitQuizAnswer = (answerIndex) => {
    const { currentQuestionIndex } = currentQuizSession
    const question = currentQuiz.questions[currentQuestionIndex]
    const isCorrect = answerIndex === question.correctAnswer
    
    const newAnswers = [...currentQuizSession.answers, { 
      questionIndex: currentQuestionIndex, 
      selectedAnswer: answerIndex, 
      isCorrect 
    }]
    
    const newScore = isCorrect ? currentQuizSession.score + 1 : currentQuizSession.score
    
    if (currentQuestionIndex + 1 < currentQuiz.questions.length) {
      // Move to next question
      setCurrentQuizSession({
        ...currentQuizSession,
        answers: newAnswers,
        score: newScore,
        currentQuestionIndex: currentQuestionIndex + 1
      })
    } else {
      // Last question - save the answer but don't complete yet
      setCurrentQuizSession({
        ...currentQuizSession,
        answers: newAnswers,
        score: newScore,
        currentQuestionIndex: currentQuestionIndex + 1
      })
    }
  }

  const submitQuiz = () => {
    // Quiz completed - save result and redirect to dashboard
    const finalScore = currentQuizSession.score
    const percentage = (finalScore / currentQuiz.questions.length) * 100
    
    // Save the result to database
    saveQuizResult({
      quizId: currentQuiz.id,
      quizTitle: currentQuiz.title,
      score: finalScore,
      totalQuestions: currentQuiz.questions.length,
      percentage: percentage,
      answers: currentQuizSession.answers
    })
    
    // Update local results
    setQuizResults(prev => [...prev, {
      quizId: currentQuiz.id,
      quizTitle: currentQuiz.title,
      score: finalScore,
      totalQuestions: currentQuiz.questions.length,
      percentage: percentage,
      completedAt: new Date()
    }])
    
    // Reset session and go to dashboard
    resetQuizSession()
    goToDashboard()
  }

  const resetQuizSession = () => {
    setCurrentQuizSession({
      quizId: null,
      answers: [],
      score: 0,
      totalQuestions: 0,
      currentQuestionIndex: 0
    })
    setCurrentQuiz(null)
    setShowQuizResults(false)
  }

  // Auth state listener to maintain login persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user)
        setIsLoggedIn(true)
        
        // Restore userType from localStorage with better error handling
        const savedUserType = localStorage.getItem('userType')
        if (savedUserType && (savedUserType === 'student' || savedUserType === 'teacher')) {
          setUserType(savedUserType)
        } else {
          // Default to student if no valid userType is found
          setUserType('student')
          localStorage.setItem('userType', 'student')
        }
        
        // Fetch quizzes and results when user is authenticated
        // Add a small delay to ensure state is properly set
        setTimeout(() => {
          fetchQuizzes()
          fetchQuizResults()
        }, 100)
      } else {
        setUser(null)
        setIsLoggedIn(false)
        setUserType('student') // Reset to default
        // Clear quiz data when user logs out
        setQuizData([])
        setQuizResults([])
        // Clear userType from localStorage
        localStorage.removeItem('userType')
      }
      // Set loading to false after auth state is determined
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Add a separate effect to refetch quizzes when userType changes
  useEffect(() => {
    if (isLoggedIn && user) {
      fetchQuizzes()
      fetchQuizResults()
    }
  }, [userType, isLoggedIn, user])

  // Debug effect to log quiz results changes
  useEffect(() => {
    if (quizResults.length > 0) {
      console.log('Quiz results updated:', quizResults)
    }
  }, [quizResults])

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo-container">
            <img src={logo} alt="QuizMaster Logo" className="logo-image" />
            <h1 className="logo-text">QuizMaster</h1>
          </div>
          <nav className="nav">
            {!isLoading && !isLoggedIn ? (
              <div className="auth-buttons">
                <button 
                  className="login-btn"
                  onClick={openLogin}
                >
                  Login
                </button>
                <button 
                  className="register-btn"
                  onClick={openRegister}
                >
                  Register
                </button>
              </div>
            ) : !isLoading && isLoggedIn ? (
              <div className="user-section">
                <span className="welcome-text">Welcome back, {user.displayName}!</span>
                <button 
                  className="logout-btn"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="main">
        {isLoading ? (
          <div className="loading-section">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          </div>
        ) : !isLoggedIn ? (
          <div className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">Test Your Knowledge</h1>
              <p className="hero-subtitle">
                Challenge yourself with our interactive quizzes on various topics. 
                Learn, compete, and improve your skills! Join as a student or teacher.
              </p>
              <div className="cta-buttons">
                <button 
                  className="cta-primary"
                  onClick={openLogin}
                >
                  Get Started
                </button>
                {/* <button className="cta-secondary">
                  Learn More
                </button> */}
              </div>
            </div>
            <div className="hero-image">
              <div className="quiz-illustration">
                <div className="quiz-card">
                  <img src={logo} alt="QuizMaster Logo" className="floating-logo" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Page */}
            {currentPage === 'dashboard' && (
              <div className="dashboard">
                <div className="page-header">
                  <h2>Welcome to QuizMaster, {user.displayName}!</h2>
                </div>
                
                {userType === 'teacher' ? (
                  <div className="teacher-dashboard">
                    <div className="teacher-actions">
                      <button 
                        className="add-quiz-btn"
                        onClick={goToCreateQuiz}
                      >
                        + Add New Quiz
                      </button>
                      <button 
                        className="view-results-btn"
                        onClick={goToResults}
                      >
                        📊 View Results
                      </button>
                    </div>
                    
                    <div className="quiz-categories">
                      {quizData.length > 0 ? (
                        quizData.filter(quiz => quiz.createdBy === user?.uid).map((quiz) => (
                          <div key={quiz.id} className="category-card">
                            <h3>{quiz.title}</h3>
                            <p>{quiz.description}</p>
                            <div className="quiz-stats">
                              <span>Questions: {quiz.questions?.length || 0}</span>
                              <span>Status: {quiz.isActive !== false ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="quiz-actions">
                              <button 
                                className="edit-quiz-btn"
                                onClick={() => goToEditQuiz(quiz)}
                              >
                                Edit
                              </button>
                              <button 
                                className="delete-quiz-btn"
                                onClick={() => deleteQuiz(quiz.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-quizzes">
                          <p>No quizzes found. Create your first quiz!</p>
                        </div>
                      )}
                      {quizData.filter(quiz => quiz.createdBy === user?.uid).length === 0 && quizData.length > 0 && (
                        <div className="no-quizzes">
                          <p>No quizzes created by you yet. Create your first quiz!</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="student-dashboard">
                    <div className="student-actions">
                      <button 
                        className="view-results-btn"
                        onClick={goToResults}
                      >
                        📊 View My Results
                      </button>
                    </div>
                    <div className="quiz-categories">
                      {quizData.length > 0 ? (
                        quizData.filter(quiz => quiz.isActive !== false).map((quiz) => {
                          const hasTaken = hasStudentTakenQuiz(quiz.id)
                          const studentResult = hasTaken ? quizResults.find(r => r.quizId === quiz.id && r.userId === user?.uid) : null
                          
                          return (
                            <div key={quiz.id} className={`category-card ${hasTaken ? 'completed-quiz' : ''}`}>
                              <h3>{quiz.title}</h3>
                              <p>{quiz.description}</p>
                              <div className="quiz-stats">
                                <span>Questions: {quiz.questions?.length || 0}</span>
                                {hasTaken && studentResult && (
                                  <span className="completion-status">
                                    ✅ Completed - Score: {studentResult.score}/{studentResult.totalQuestions} ({studentResult.percentage}%)
                                  </span>
                                )}
                              </div>
                              {hasTaken ? (
                                <button 
                                  className="completed-quiz-btn"
                                  disabled
                                >
                                  Quiz Completed
                                </button>
                              ) : (
                                <button 
                                  className="start-quiz-btn"
                                  onClick={() => startQuiz(quiz)}
                                >
                                  Start Quiz
                                </button>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="no-quizzes">
                          <p>No quizzes available at the moment.</p>
                        </div>
                      )}
                      {quizData.filter(quiz => quiz.isActive !== false).length === 0 && quizData.length > 0 && (
                        <div className="no-quizzes">
                          <p>No active quizzes available at the moment.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Create Quiz Page */}
            {currentPage === 'create-quiz' && (
              <div className="page-container">
                <div className="page-header">
                  <button className="back-btn" onClick={goToDashboard}>
                    ← Back to Dashboard
                  </button>
                  <h2>Create New Quiz</h2>
                </div>
                <div className="page-content">
                  <form className="quiz-form" onSubmit={handleAddQuiz}>
                    <div className="form-group">
                      <label htmlFor="quiz-title">Quiz Title</label>
                      <input
                        type="text"
                        id="quiz-title"
                        name="title"
                        value={quizForm.title}
                        onChange={handleQuizFormChange}
                        required
                        placeholder="Enter quiz title"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="quiz-description">Description</label>
                      <textarea
                        id="quiz-description"
                        name="description"
                        value={quizForm.description}
                        onChange={handleQuizFormChange}
                        required
                        placeholder="Enter quiz description"
                        rows="3"
                      />
                    </div>

                    {/* Question Management */}
                    <div className="questions-section">
                      <h3>Questions ({quizForm.questions.length})</h3>
                      
                      {/* Add Question Form */}
                      <div className="add-question-form">
                        <div className="form-group">
                          <label>Question</label>
                          <input
                            type="text"
                            value={currentQuestion.question}
                            onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
                            placeholder="Enter your question"
                          />
                        </div>
                        <div className="options-group">
                          <label>Options</label>
                          {currentQuestion.options.map((option, index) => (
                            <div key={index} className="option-input">
                              <input
                                type="radio"
                                name="correctAnswer"
                                checked={currentQuestion.correctAnswer === index}
                                onChange={() => setCurrentQuestion({...currentQuestion, correctAnswer: index})}
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...currentQuestion.options]
                                  newOptions[index] = e.target.value
                                  setCurrentQuestion({...currentQuestion, options: newOptions})
                                }}
                                placeholder={`Option ${index + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                        <button 
                          type="button" 
                          className="add-question-btn"
                          onClick={addQuestion}
                        >
                          Add Question
                        </button>
                      </div>

                      {/* Existing Questions */}
                      <div className="existing-questions">
                        {quizForm.questions.map((question, index) => (
                          <div key={index} className="question-item">
                            <div className="question-header">
                              <span>Question {index + 1}</span>
                              <button 
                                type="button"
                                className="remove-question-btn"
                                onClick={() => removeQuestion(index)}
                              >
                                ×
                              </button>
                            </div>
                            <p>{question.question}</p>
                            <div className="question-options">
                              {question.options.map((option, optIndex) => (
                                <span 
                                  key={optIndex} 
                                  className={`option ${optIndex === question.correctAnswer ? 'correct' : ''}`}
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="button" className="cancel-btn" onClick={goToDashboard}>
                        Cancel
                      </button>
                      <button type="submit" className="submit-btn">
                        Create Quiz
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Quiz Page */}
            {currentPage === 'edit-quiz' && (
              <div className="page-container">
                <div className="page-header">
                  <button className="back-btn" onClick={goToDashboard}>
                    ← Back to Dashboard
                  </button>
                  <h2>Edit Quiz</h2>
                </div>
                <div className="page-content">
                  <form className="quiz-form" onSubmit={handleEditQuiz}>
                    <div className="form-group">
                      <label htmlFor="edit-quiz-title">Quiz Title</label>
                      <input
                        type="text"
                        id="edit-quiz-title"
                        name="title"
                        value={quizForm.title}
                        onChange={handleQuizFormChange}
                        required
                        placeholder="Enter quiz title"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-quiz-description">Description</label>
                      <textarea
                        id="edit-quiz-description"
                        name="description"
                        value={quizForm.description}
                        onChange={handleQuizFormChange}
                        required
                        placeholder="Enter quiz description"
                        rows="3"
                      />
                    </div>

                    {/* Question Management for Edit */}
                    <div className="questions-section">
                      <h3>Questions ({quizForm.questions.length})</h3>
                      
                      {/* Add Question Form */}
                      <div className="add-question-form">
                        <div className="form-group">
                          <label>Question</label>
                          <input
                            type="text"
                            value={currentQuestion.question}
                            onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
                            placeholder="Enter your question"
                          />
                        </div>
                        <div className="options-group">
                          <label>Options</label>
                          {currentQuestion.options.map((option, index) => (
                            <div key={index} className="option-input">
                              <input
                                type="radio"
                                name="correctAnswer"
                                checked={currentQuestion.correctAnswer === index}
                                onChange={() => setCurrentQuestion({...currentQuestion, correctAnswer: index})}
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...currentQuestion.options]
                                  newOptions[index] = e.target.value
                                  setCurrentQuestion({...currentQuestion, options: newOptions})
                                }}
                                placeholder={`Option ${index + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                        <button 
                          type="button" 
                          className="add-question-btn"
                          onClick={addQuestion}
                        >
                          Add Question
                        </button>
                      </div>

                      {/* Existing Questions */}
                      <div className="existing-questions">
                        {quizForm.questions.map((question, index) => (
                          <div key={index} className="question-item">
                            <div className="question-header">
                              <span>Question {index + 1}</span>
                              <button 
                                type="button"
                                className="remove-question-btn"
                                onClick={() => removeQuestion(index)}
                              >
                                ×
                              </button>
                            </div>
                            <p>{question.question}</p>
                            <div className="question-options">
                              {question.options.map((option, optIndex) => (
                                <span 
                                  key={optIndex} 
                                  className={`option ${optIndex === question.correctAnswer ? 'correct' : ''}`}
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="button" className="cancel-btn" onClick={goToDashboard}>
                        Cancel
                      </button>
                      <button type="submit" className="submit-btn">
                        Update Quiz
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Results Page */}
            {currentPage === 'results' && (
              <div className="page-container">
                <div className="page-header">
                  <button className="back-btn" onClick={goToDashboard}>
                    ← Back to Dashboard
                  </button>
                  <h2>Quiz Results</h2>
                </div>
                <div className="page-content">
                  <div className="results-content">
                    {userType === 'teacher' ? (
                      <div className="teacher-results">
                        <div className="results-summary">
                          <div className="summary-card">
                            <h3>📊 Overall Statistics</h3>
                            <div className="summary-stats">
                              <div className="stat-item">
                                <span className="stat-number">{quizData.length}</span>
                                <span className="stat-label">Total Quizzes</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-number">{quizResults.length}</span>
                                <span className="stat-label">Total Attempts</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="quiz-results-grid">
                          {quizData.map(quiz => {
                            const quizResultsForQuiz = quizResults.filter(r => r.quizId === quiz.id)
                            const highestScore = quizResultsForQuiz.length > 0 ? Math.max(...quizResultsForQuiz.map(r => r.percentage)) : 0
                            const lowestScore = quizResultsForQuiz.length > 0 ? Math.min(...quizResultsForQuiz.map(r => r.percentage)) : 0
                            
                            return (
                              <div key={quiz.id} className="quiz-result-card">
                                <div className="quiz-result-header">
                                  <h3>{quiz.title}</h3>
                                  <div className="quiz-meta">
                                    <span className="attempts-badge">{quizResultsForQuiz.length} attempts</span>
                                  </div>
                                </div>
                                
                                {quizResultsForQuiz.length > 0 ? (
                                  <>
                                    <div className="quiz-stats-grid">
                                      <div className="stat-card">
                                        <div className="stat-value">{highestScore}%</div>
                                        <div className="stat-label">Highest</div>
                                      </div>
                                      <div className="stat-card">
                                        <div className="stat-value">{lowestScore}%</div>
                                        <div className="stat-label">Lowest</div>
                                      </div>
                                    </div>
                                    
                                    <div className="individual-results">
                                      <h4>📋 Student Results</h4>
                                      <div className="results-table">
                                        <div className="table-header">
                                          <span>Student</span>
                                          <span>Score</span>
                                          <span>Percentage</span>
                                          <span>Date</span>
                                        </div>
                                        {quizResultsForQuiz.map((result, index) => (
                                          <div key={index} className="table-row">
                                            <span className="student-name">{result.userName || 'Anonymous'}</span>
                                            <span className="score">{result.score}/{result.totalQuestions}</span>
                                            <span className={`percentage ${result.percentage >= 80 ? 'excellent' : result.percentage >= 60 ? 'good' : 'needs-improvement'}`}>
                                              {result.percentage}%
                                            </span>
                                            <span className="date">{result.completedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="no-attempts">
                                    <p>No students have taken this quiz yet.</p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="student-results">
                        <div className="student-results-header">
                          <h3>📈 My Quiz Performance</h3>
                          <div className="student-summary">
                            <div className="summary-stat">
                              <span className="stat-number">{quizResults.filter(r => r.userId === user?.uid).length}</span>
                              <span className="stat-label">Quizzes Taken</span>
                            </div>
                          </div>
                        </div>
                        
                        {quizResults.filter(r => r.userId === user?.uid).length > 0 ? (
                          <div className="student-results-grid">
                            {quizResults.filter(r => r.userId === user?.uid).map((result, index) => (
                              <div key={index} className="result-card">
                                <div className="result-header">
                                  <h4>{result.quizTitle}</h4>
                                  <div className={`score-badge ${result.percentage >= 80 ? 'excellent' : result.percentage >= 60 ? 'good' : 'needs-improvement'}`}>
                                    {result.percentage}%
                                  </div>
                                </div>
                                <div className="result-details">
                                  <p><strong>Score:</strong> {result.score}/{result.totalQuestions}</p>
                                  <p><strong>Completed:</strong> {result.completedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
                                </div>
                                <div className="performance-indicator">
                                  {result.percentage >= 80 ? (
                                    <span className="performance excellent">🌟 Excellent Performance!</span>
                                  ) : result.percentage >= 60 ? (
                                    <span className="performance good">👍 Good Work!</span>
                                  ) : (
                                    <span className="performance needs-improvement">💪 Keep Practicing!</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-results">
                            <div className="no-results-content">
                              <div className="no-results-icon">📝</div>
                              <h3>No Quiz Results Yet</h3>
                              <p>You haven't taken any quizzes yet. Start taking quizzes to see your results here!</p>
                              <button className="start-learning-btn" onClick={goToDashboard}>
                                Browse Available Quizzes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Quiz Taking Interface */}
      {currentQuiz && !showQuizResults && currentQuizSession.quizId && (
        <div className="quiz-taking-overlay">
          <div className="quiz-taking-modal">
            <div className="quiz-header">
              <h2>{currentQuiz.title}</h2>
              <div className="quiz-progress">
                Question {currentQuizSession.currentQuestionIndex + 1} of {currentQuiz.questions.length}
              </div>
            </div>
            
            {currentQuizSession.currentQuestionIndex < currentQuiz.questions.length ? (
              // Show question
              <div className="question-container">
                <h3>{currentQuiz.questions[currentQuizSession.currentQuestionIndex].question}</h3>
                <div className="answer-options">
                  {currentQuiz.questions[currentQuizSession.currentQuestionIndex].options.map((option, index) => (
                    <button
                      key={index}
                      className="answer-option"
                      onClick={() => submitQuizAnswer(index)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Show submit section for last question
              <div className="submit-container">
                <h3>Quiz Complete!</h3>
                <p>You have answered all {currentQuiz.questions.length} questions.</p>
                <p>Click submit to finish the quiz and return to your dashboard.</p>
                <div className="submit-actions">
                  <button 
                    className="submit-quiz-btn"
                    onClick={submitQuiz}
                  >
                    Submit Quiz
                  </button>
                  <button 
                    className="exit-quiz-btn"
                    onClick={resetQuizSession}
                  >
                    Exit Without Submitting
                  </button>
                </div>
              </div>
            )}
            
            {currentQuizSession.currentQuestionIndex < currentQuiz.questions.length && (
              <button 
                className="exit-quiz-btn"
                onClick={resetQuizSession}
              >
                Exit Quiz
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Results Modal */}
      {showQuizResults && (
        <div className="modal-overlay" onClick={() => setShowQuizResults(false)}>
          <div className="modal results-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quiz Results</h2>
              <button 
                className="close-btn"
                onClick={() => setShowQuizResults(false)}
              >
                ×
              </button>
            </div>
            <div className="results-content">
              {userType === 'teacher' ? (
                <div className="teacher-results">
                  {quizData.map(quiz => {
                    const quizResultsForQuiz = quizResults.filter(r => r.quizId === quiz.id)
                    return (
                      <div key={quiz.id} className="quiz-result-item">
                        <h3>{quiz.title}</h3>
                        <p>Total Attempts: {quizResultsForQuiz.length}</p>
                        {quizResultsForQuiz.length > 0 && (
                          <div className="result-stats">
                            <p>Highest Score: {Math.max(...quizResultsForQuiz.map(r => r.percentage))}%</p>
                            <p>Lowest Score: {Math.min(...quizResultsForQuiz.map(r => r.percentage))}%</p>
                          </div>
                        )}
                        {quizResultsForQuiz.length > 0 && (
                          <div className="individual-results">
                            <h4>Individual Results:</h4>
                            {quizResultsForQuiz.map((result, index) => (
                              <div key={index} className="individual-result">
                                <p>Student: {result.userName || 'Anonymous'}</p>
                                <p>Score: {result.score}/{result.totalQuestions} ({result.percentage}%)</p>
                                <p>Completed: {result.completedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="student-results">
                  {quizResults.filter(r => r.userId === user?.uid).map((result, index) => (
                    <div key={index} className="result-item">
                      <h3>{result.quizTitle}</h3>
                      <p>Score: {result.score}/{result.totalQuestions}</p>
                      <p>Percentage: {result.percentage}%</p>
                      <p>Completed: {result.completedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
login ans register               <h2 style={{color: 'white'}}>Login to QuizMaster</h2>
              <button 
                className="close-btn"
                onClick={() => setShowLogin(false)}
              >
                ×
              </button>
            </div>
            <form className="login-form" onSubmit={handleLogin}>
              <div className="user-type-selector">
                <label>Login as:</label>
                <div className="user-type-buttons">
                  <button
                    type="button"
                    className={`user-type-btn ${userType === 'student' ? 'active' : ''}`}
                    onClick={() => setUserType('student')}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    className={`user-type-btn ${userType === 'teacher' ? 'active' : ''}`}
                    onClick={() => setUserType('teacher')}
                  >
                    Teacher
                  </button>
                </div>
              </div>
              
              {/* Google Login Button */}
              <div className="google-login-section">
                <button
                  type="button"
                  className="google-login-btn"
                  onClick={() => handleGoogleLogin(userType)}
                >
                  <svg className="google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="divider">
                <span>or</span>
              </div>

              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  value={loginForm.email}
                  onChange={(e) => handleInputChange(e, 'login')}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  value={loginForm.password}
                  onChange={(e) => handleInputChange(e, 'login')}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <button type="submit" className="submit-btn">
                Login as {userType}
              </button>
            </form>
            <div className="modal-footer">
              <p><span style={{color: 'white'}} >Don't have an account? </span> <button onClick={switchToRegister} className="switch-link">Sign up</button></p>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="modal-overlay" onClick={() => setShowRegister(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{color: 'white'}}>Register for QuizMaster</h2>
              <button 
                className="close-btn"
                onClick={() => setShowRegister(false)}
              >
                ×
              </button>
            </div>
            <form className="register-form" onSubmit={handleRegister}>
              <div className="user-type-selector">
                <label>Register as:</label>
                <div className="user-type-buttons">
                  <button
                    type="button"
                    className={`user-type-btn ${registerForm.userType === 'student' ? 'active' : ''}`}
                    onClick={() => setRegisterForm({...registerForm, userType: 'student'})}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    className={`user-type-btn ${registerForm.userType === 'teacher' ? 'active' : ''}`}
                    onClick={() => setRegisterForm({...registerForm, userType: 'teacher'})}
                  >
                    Teacher
                  </button>
                </div>
              </div>

              {/* Google Register Button */}
              <div className="google-login-section">
                <button
                  type="button"
                  className="google-login-btn"
                  onClick={() => handleGoogleLogin(registerForm.userType)}
                >
                  <svg className="google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="divider">
                <span>or</span>
              </div>

              <div className="form-group">
                <label htmlFor="register-name">Full Name</label>
                <input
                  type="text"
                  id="register-name"
                  name="name"
                  value={registerForm.name}
                  onChange={(e) => handleInputChange(e, 'register')}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-email">Email</label>
                <input
                  type="email"
                  id="register-email"
                  name="email"
                  value={registerForm.email}
                  onChange={(e) => handleInputChange(e, 'register')}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-password">Password</label>
                <input
                  type="password"
                  id="register-password"
                  name="password"
                  value={registerForm.password}
                  onChange={(e) => handleInputChange(e, 'register')}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-confirm-password">Confirm Password</label>
                <input
                  type="password"
                  id="register-confirm-password"
                  name="confirmPassword"
                  value={registerForm.confirmPassword}
                  onChange={(e) => handleInputChange(e, 'register')}
                  required
                  placeholder="Confirm your password"
                />
              </div>
              <button type="submit" className="submit-btn">
                Register as {registerForm.userType}
              </button>
            </form>
            <div className="modal-footer">
              <p><span style={{color: 'white'}} >Already have an account? </span> <button onClick={switchToLogin} className="switch-link">Login</button></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
