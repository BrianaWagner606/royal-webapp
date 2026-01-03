import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState("Checking...")
  
  // 1. New State Variables
  const [file, setFile] = useState(null)          // Stores the PDF the user picked
  const [quiz, setQuiz] = useState(null)          // Stores the questions we get back
  const [loading, setLoading] = useState(false)   // Are we waiting for the AI?

  // System Health Check (Keep this!)
  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus("Disconnected ❌"))
  }, [])

  // 2. The "Courier" Function
  const handleGenerateQuiz = async () => {
    if (!file) {
      alert("Please select a Royal Scroll (PDF) first!")
      return
    }

    setLoading(true) // Start the spinning wheel

    try {
      // A. Create the Package
      const formData = new FormData()
      formData.append("file", file) // "file" must match the name in Python (@app.post)

      // B. Send the Courier
      const response = await fetch("http://127.0.0.1:8000/quiz/generate", {
        method: "POST",
        body: formData, // No "Content-Type" header needed; browser adds it automatically!
      })

      // C. Open the Package
      const data = await response.json()
      console.log("Quiz received:", data) // Helpful for debugging
      setQuiz(data) // Save the questions to State

    } catch (error) {
      console.error("Error generating quiz:", error)
      alert("The Royal Scribe failed to read the scroll.")
    } finally {
      setLoading(false) // Stop the spinning wheel
    }
  }

  return (
    <div className="app-container">
      <header>
        <h1>🏰 Citadel of Wisdom</h1>
        <p>System Status: <strong>{status}</strong></p>
      </header>
      
      <main>
        {/* VIEW 1: The Upload Station */}
        {!quiz && (
          <div className="card">
            <h2>upload Study Material</h2>
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

        {/* VIEW 2: The Quiz Arena */}
        {quiz && (
          <div className="quiz-container">
            <h2>⚔️ Knowledge Challenge</h2>
            {quiz.map((q) => (
              <div key={q.id} className="card question-card">
                <h3>{q.question}</h3>
                <div className="options-grid">
                  {q.options.map((option, index) => (
                    <button key={index} className="option-btn">
                      {option}
                    </button>
                  ))}
                </div>
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