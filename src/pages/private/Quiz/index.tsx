import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { requestQuizQuestions } from '../../../services/SignalR'

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

const QuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const location = useLocation() as any
  
  const quizTitle = location.state?.quizTitle || 'Quiz'
  const skeleton = location.state?.skeleton
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | string>>({})
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (!quizId) return

    let disposed = false
    const fetchQuestions = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await requestQuizQuestions(quizId, () => {
          if (!disposed) setLoading(true)
        })
        
        if (disposed) return

        // Handle different response formats (similar to Goals API)
        let questionList: any[] = []
        if (Array.isArray(data)) {
          questionList = data
        } else if (Array.isArray(data?.items)) {
          questionList = data.items
        } else if (Array.isArray(data?.questions)) {
          questionList = data.questions
        } else if (Array.isArray(data?.value)) {
          questionList = data.value
        } else if (Array.isArray(data?.data)) {
          questionList = data.data
        } else if (Array.isArray(data?.data?.items)) {
          questionList = data.data.items
        }
        
        setQuestions(questionList)
      } catch (e: any) {
        if (disposed) return
        setError(e?.message || 'Unable to load quiz questions.')
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    fetchQuestions()
    return () => { disposed = true }
  }, [quizId])

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults) return
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answerIndex
    }))
  }

  const handleTextAnswer = (text: string) => {
    if (showResults) return
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: text
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = () => {
    setShowResults(true)
    setCurrentQuestionIndex(0)
  }

  const calculateScore = () => {
    let correct = 0
    
    console.log('=== CALCULATING QUIZ SCORE ===')
    console.log('Total questions:', questions.length)
    console.log('Selected answers:', selectedAnswers)
    
    questions.forEach((q, idx) => {
      const userAnswer = selectedAnswers[idx]
      
      console.log(`\nQuestion ${idx + 1}:`)
      console.log('Question data:', q)
      console.log('User answer:', userAnswer)
      
      // Try to find correct answer from various possible field names
      const correctAnswer = q.correctAnswer ?? q.correctAnswerIndex ?? q.answer ?? q.correctOption ?? q.correct
      console.log('Correct answer (found):', correctAnswer)
      console.log('Question type:', q.type || q.questionType)
      
      // Skip if no answer provided
      if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
        console.log('❌ Skipped - No answer provided')
        return
      }
      
      // For FillInTheBlank questions (type = 4)
      if (q.type === 4 || q.questionType === 4) {
        const correctText = (q.correctAnswerText || correctAnswer || '').toString()
        if (typeof userAnswer === 'string') {
          // Case-insensitive comparison, trim whitespace
          if (userAnswer.trim().toLowerCase() === correctText.trim().toLowerCase()) {
            correct++
            console.log('✅ CORRECT (Fill-in-the-blank)')
          } else {
            console.log('❌ WRONG (Fill-in-the-blank)')
            console.log('Expected:', correctText.trim().toLowerCase())
            console.log('Got:', userAnswer.trim().toLowerCase())
          }
        }
      } 
      // For multiple choice, single choice, true/false questions
      else {
        // Backend returns correctAnswer as TEXT, not INDEX
        // So we need to compare the selected option text with correctAnswer
        if (typeof userAnswer === 'number' && q.options && q.options[userAnswer]) {
          const selectedOptionText = q.options[userAnswer]
          const correctAnswerText = String(correctAnswer || '')
          
          console.log('Selected option text:', selectedOptionText)
          console.log('Correct answer text:', correctAnswerText)
          
          // Compare the text values (case-insensitive, trimmed)
          if (selectedOptionText.trim().toLowerCase() === correctAnswerText.trim().toLowerCase()) {
            correct++
            console.log('✅ CORRECT (Multiple choice)')
          } else {
            console.log('❌ WRONG (Multiple choice)')
          }
        } else if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
          // Direct string comparison for cases where userAnswer is already text
          if (userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
            correct++
            console.log('✅ CORRECT (Direct text match)')
          } else {
            console.log('❌ WRONG (Direct text match)')
          }
        } else {
          console.log('❌ Invalid answer format or missing options')
          console.log('User answer type:', typeof userAnswer)
          console.log('Correct answer type:', typeof correctAnswer)
        }
      }
    })
    
    console.log('\n=== FINAL SCORE ===')
    console.log('Correct:', correct)
    console.log('Total:', questions.length)
    console.log('Percentage:', Math.round((correct / questions.length) * 100) + '%')
    
    return { correct, total: questions.length }
  }

  // Helper function to check if current answer is correct
  const isAnswerCorrect = () => {
    if (!currentQuestion) return false
    const userAnswer = selectedAnswers[currentQuestionIndex]
    
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      return false
    }
    
    const correctAnswer = currentQuestion.correctAnswer ?? currentQuestion.correctAnswerIndex ?? currentQuestion.answer ?? currentQuestion.correctOption ?? currentQuestion.correct
    
    // For FillInTheBlank questions (type = 4)
    if (currentQuestion.type === 4 || currentQuestion.questionType === 4) {
      const correctText = (currentQuestion.correctAnswerText || correctAnswer || '').toString()
      if (typeof userAnswer === 'string') {
        return userAnswer.trim().toLowerCase() === correctText.trim().toLowerCase()
      }
      return false
    }
    
    // For multiple choice
    if (typeof userAnswer === 'number' && currentQuestion.options && currentQuestion.options[userAnswer]) {
      const selectedOptionText = currentQuestion.options[userAnswer]
      const correctAnswerText = String(correctAnswer || '')
      return selectedOptionText.trim().toLowerCase() === correctAnswerText.trim().toLowerCase()
    } else if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
      // Direct string comparison for cases where userAnswer is already text
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    }
    
    return false
  }

  const currentQuestion = questions[currentQuestionIndex]
  const selectedAnswer = selectedAnswers[currentQuestionIndex]
  const isAnswered = selectedAnswer !== undefined && selectedAnswer !== '' && selectedAnswer !== null
  const allAnswered = questions.every((_, idx) => {
    const answer = selectedAnswers[idx]
    return answer !== undefined && answer !== '' && answer !== null
  })

  if (loading) {
    return (
      <div className="layout min-h-screen bg-blue-50">
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading quiz questions...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="layout min-h-screen bg-blue-50">
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Go Back
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="layout min-h-screen bg-blue-50">
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-gray-600 mb-4">No questions available for this quiz.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Go Back
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const { correct, total } = showResults ? calculateScore() : { correct: 0, total: 0 }
  const percentage = showResults ? Math.round((correct / total) * 100) : 0

  return (
    <div className="layout min-h-screen bg-blue-50">
      <Header />
      <main className="page-main py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 mb-6 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          {/* Quiz Header */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{quizTitle}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {showResults && (
            <div className={`rounded-2xl border-2 shadow-sm p-6 mb-6 ${
              percentage >= 70 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
                <p className="text-4xl font-bold mb-2" style={{ color: percentage >= 70 ? '#059669' : '#ea580c' }}>
                  {percentage}%
                </p>
                <p className="text-gray-700">
                  You got {correct} out of {total} questions correct
                </p>
              </div>
            </div>
          )}

          {/* Question Card */}
          {currentQuestion && (
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {currentQuestion.questionText || currentQuestion.question || 'Question text not available'}
              </h2>

              {/* Check question type: 4 = FillInTheBlank */}
              {(currentQuestion.type === 4 || currentQuestion.questionType === 4) ? (
                // Fill-in-the-blank input
                <div className="space-y-4">
                  <input
                    type="text"
                    value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                    onChange={(e) => handleTextAnswer(e.target.value)}
                    disabled={showResults}
                    placeholder="Type your answer here..."
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 text-gray-900 disabled:bg-gray-50"
                  />
                  
                  {/* Show correct answer after submission */}
                  {showResults && (
                    <div className={`p-4 rounded-xl border-2 ${
                      (() => {
                        const correctText = (currentQuestion.correctAnswerText || currentQuestion.correctAnswer || '').toString()
                        const userText = typeof selectedAnswer === 'string' ? selectedAnswer : ''
                        return userText.trim().toLowerCase() === correctText.trim().toLowerCase()
                          ? 'bg-green-50 border-green-500'
                          : 'bg-red-50 border-red-500'
                      })()
                    }`}>
                      <p className="font-semibold text-sm mb-1">
                        {(() => {
                          const correctText = (currentQuestion.correctAnswerText || currentQuestion.correctAnswer || '').toString()
                          const userText = typeof selectedAnswer === 'string' ? selectedAnswer : ''
                          return userText.trim().toLowerCase() === correctText.trim().toLowerCase()
                            ? '✅ Correct!'
                            : '❌ Incorrect'
                        })()}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Correct answer:</span> {currentQuestion.correctAnswerText || currentQuestion.correctAnswer}
                      </p>
                      {typeof selectedAnswer === 'string' && selectedAnswer.trim() && (
                        <p className="text-sm mt-1">
                          <span className="font-medium">Your answer:</span> {selectedAnswer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Multiple choice, Single choice, True/False options
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, idx) => {
                  const isSelected = selectedAnswer === idx
                  // Compare option text with correctAnswer text (backend returns text, not index)
                  const correctAnswerText = String(currentQuestion.correctAnswer || '')
                  const isCorrect = option.trim().toLowerCase() === correctAnswerText.trim().toLowerCase()
                  const showCorrectAnswer = showResults && isCorrect
                  const showWrongAnswer = showResults && isSelected && !isCorrect

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(idx)}
                      disabled={showResults}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        showCorrectAnswer
                          ? 'bg-green-50 border-green-500'
                          : showWrongAnswer
                          ? 'bg-red-50 border-red-500'
                          : isSelected
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      } ${showResults ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          showCorrectAnswer
                            ? 'bg-green-500 border-green-500'
                            : showWrongAnswer
                            ? 'bg-red-500 border-red-500'
                            : isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {showCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-white" />}
                          {showWrongAnswer && <XCircle className="w-4 h-4 text-white" />}
                          {!showResults && isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <span className="text-gray-900">{option}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              )}

              {/* Show correct answer when user is wrong - for Multiple Choice */}
              {showResults && !isAnswerCorrect() && (currentQuestion.type !== 4 && currentQuestion.questionType !== 4) && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm font-semibold text-red-900 mb-1">❌ Incorrect</p>
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Correct answer:</span> {currentQuestion.correctAnswer}
                  </p>
                  {typeof selectedAnswer === 'number' && currentQuestion.options && currentQuestion.options[selectedAnswer] && (
                    <p className="text-sm text-red-800 mt-1">
                      <span className="font-semibold">Your answer:</span> {currentQuestion.options[selectedAnswer]}
                    </p>
                  )}
                </div>
              )}

              {/* Explanation */}
              {showResults && currentQuestion.explanation && (
                <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                  <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex gap-2">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-all flex items-center justify-center ${
                    idx === currentQuestionIndex
                      ? 'bg-blue-500 text-white'
                      : selectedAnswers[idx] !== undefined && selectedAnswers[idx] !== '' && selectedAnswers[idx] !== null
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {!showResults ? (
              currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!isAnswered}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )
            ) : (
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
              >
                Back to Lesson
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default QuizPage
