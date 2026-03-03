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
    questions.forEach((q, idx) => {
      const userAnswer = selectedAnswers[idx]
      
      // For FillInTheBlank questions (type = 4)
      if (q.type === 4 || q.questionType === 4) {
        const correctText = q.correctAnswerText || q.correctAnswer
        if (typeof userAnswer === 'string' && typeof correctText === 'string') {
          if (userAnswer.trim().toLowerCase() === correctText.trim().toLowerCase()) {
            correct++
          }
        }
      } 
      // For multiple choice, single choice, true/false questions
      else {
        if (userAnswer === q.correctAnswer) {
          correct++
        }
      }
    })
    return { correct, total: questions.length }
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
                      typeof selectedAnswer === 'string' && 
                      (selectedAnswer.trim().toLowerCase() === (currentQuestion.correctAnswerText || currentQuestion.correctAnswer || '').toString().trim().toLowerCase())
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <p className="font-semibold text-sm mb-1">
                        {typeof selectedAnswer === 'string' && 
                         (selectedAnswer.trim().toLowerCase() === (currentQuestion.correctAnswerText || currentQuestion.correctAnswer || '').toString().trim().toLowerCase())
                          ? '✅ Correct!'
                          : '❌ Incorrect'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Correct answer:</span> {currentQuestion.correctAnswerText || currentQuestion.correctAnswer}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Multiple choice, Single choice, True/False options
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, idx) => {
                  const isSelected = selectedAnswer === idx
                  const isCorrect = idx === currentQuestion.correctAnswer
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
