import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState("Checking...")
  
  // State for the PDF Upload
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // State for the Game
  const [quiz, setQuiz] = useState(null)
  const [energy, setEnergy] = useState(0)      
  const [feedback, setFeedback] = useState({}) 

  // 1. SYSTEM HEALTH CHECK (Runs on startup)
  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus("Disconnected ❌"))
  }, [])

  // 2. GENERATE QUIZ (Uploads the PDF)
  const handleGenerateQuiz = async () => {
    if (!file) {
      alert("Please select a Royal Scroll (PDF) first!")
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file) 

      const response = await fetch("http://127.0.0.1:8000/quiz/generate", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      setQuiz(data) 

    } catch (error) {
      console.error("Error generating quiz:", error)
      alert("The Royal Scribe failed to read the scroll.")
    } finally {
      setLoading(false)
    }
  }

  // 3. SUBMIT ANSWER (The Game Logic)
  const handleAnswerClick = async (questionId, option) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          selected_option: option
        }),
      })

      const result = await response.json()
      
      if (result.result === "Correct") {
        setEnergy(energy + result.energy_earned) 
        setFeedback({ ...feedback, [questionId]: "correct" }) 
      } else {
        setFeedback({ ...feedback, [questionId]: "incorrect" }) 
      }

    } catch (error) {
      console.error("Network Error:", error)
    }
  }

  return (
    <div className="app-container">
      <header>
        <h1>🏰 Citadel of Wisdom</h1>
        <div className="stats-bar">
             <p>Status: {status}</p>
             <p className="energy-display">⚡ Energy: {energy}</p>
        </div>
      </header>
      
      <main>
        {/* VIEW 1: Upload Station */}
        {!quiz && (
          <div className="card">
            <h2>Upload Study Material</h2>
            <p>Upload a PDF to generate a challenge.</p>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setFile(e.target.files[0])} 
            />
            <br /><br />
            <button onClick={handleGenerateQuiz} disabled={loading}>
              {loading ? "Consulting the Scribes..." : "Generate Quiz ✨"}
            </button>
          </div>
        )}

        {/* VIEW 2: The Game Arena */}
        {quiz && (
          <div className="quiz-container">
            <h2>⚔️ Knowledge Challenge</h2>
            {quiz.map((q) => (
              <div 
                key={q.id} 
                className={`card question-card ${feedback[q.id]}`} 
              >
                <h3>{q.question}</h3>
                <div className="options-grid">
                  {q.options.map((option, index) => (
                    <button 
                      key={index} 
                      className="option-btn"
                      onClick={() => handleAnswerClick(q.id, option)}
                      disabled={feedback[q.id]} 
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {feedback[q.id] === "correct" && <p className="success-msg">✨ Correct! +100 Energy</p>}
                {feedback[q.id] === "incorrect" && <p className="error-msg">❌ Incorrect</p>}
              </div>
            ))}
            <br />
            <button onClick={() => setQuiz(null)}>Upload Another Scroll</button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App