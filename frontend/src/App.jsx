import { useState, useEffect } from 'react'
import BattleArena from './components/BattleArena'
import './App.css'

function App() {
  const [status, setStatus] = useState("Checking Radar...")
  
  // Game State
  const [energy, setEnergy] = useState(0) 
  const [defense, setDefense] = useState({ tower_level: 1, archers: 0, wall_health: 100 })
  const [isBattling, setIsBattling] = useState(false)
  
  // NEW: STREAK SYSTEM 🩸
  const [streak, setStreak] = useState(0)
  
  // NEW: RADIO MESSAGE (Replaces Alert) 📻
  const [radioMsg, setRadioMsg] = useState(null) // { title: "...", body: "..." }
  
  // Quiz State
  const [file, setFile] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [feedback, setFeedback] = useState({})
  
  // Loading State
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState("")

  // --- HELPER FUNCTIONS ---
  const updateDefenseStatus = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/shop/status")
      const data = await res.json()
      setDefense(data)
    } catch (e) { console.error("Could not fetch base status") }
  }

  // --- STARTUP ---
  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus("Offline 💀"))

    fetch("http://127.0.0.1:8000/quiz/energy")
      .then(res => res.json())
      .then(data => setEnergy(data.energy))

    updateDefenseStatus() 
  }, [])

  // --- HANDLERS ---
  const showRadio = (title, body) => {
    setRadioMsg({ title, body })
  }

  const handleBuy = async (itemType) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType })
      })
      
      if (!res.ok) {
        showRadio("❌ Access Denied", "Not enough Brains! Scavenge more intel.")
        return
      }
      const data = await res.json()
      setEnergy(data.energy)
      setDefense({ tower_level: data.tower_level, archers: data.archers, wall_health: data.wall_health })
    } catch (error) { console.error("Shop Error:", error) }
  }

  const handleGenerateQuiz = async () => {
    if (!file) return showRadio("⚠️ No Intel", "Upload a document first!")
    
    setFeedback({}) 
    setLoading(true); setProgress(0); setLoadingText("Scanning for Fresh Brains...")
    
    const interval = setInterval(() => {
      setProgress((old) => {
        if (old >= 90) return old;
        return Math.min(old + Math.random() * 10, 90);
      })
    }, 800)

    try {
      const formData = new FormData()
      formData.append("file", file) 
      const response = await fetch("http://127.0.0.1:8000/quiz/generate", { method: "POST", body: formData })
      const data = await response.json()
      
      clearInterval(interval); setProgress(100); setLoadingText("Horde Incoming! 🧟")
      setTimeout(() => { setQuiz(data); setLoading(false) }, 500)

    } catch (error) {
      clearInterval(interval); setLoading(false)
      showRadio("💀 Signal Lost", "The AI is a Zombie today (Error).")
    }
  }

  const handleRefresh = () => {
    setQuiz(null); 
    setStreak(0); // Reset streak on new round
    handleGenerateQuiz(); 
  }

  // --- ANSWER HANDLER WITH STREAK LOGIC ---
  const handleAnswerClick = async (questionId, option, correctAnswer) => {
    const cleanOption = option.toString().trim()
    const cleanAnswer = correctAnswer.toString().trim()
    
    // Fuzzy Matching
    let isCorrect = cleanOption === cleanAnswer
    if (!isCorrect) {
      if (cleanAnswer.length === 1 && cleanOption.startsWith(cleanAnswer)) isCorrect = true
      else if (cleanOption.length === 1 && cleanAnswer.startsWith(cleanOption)) isCorrect = true
    }

    if (isCorrect) {
      setFeedback({ ...feedback, [questionId]: "correct" }) 
      
      // STREAK MATH
      const newStreak = streak + 1
      setStreak(newStreak)
      
      let points = 100
      let msg = ""
      
      // Combo Multipliers
      if (newStreak >= 3) { points = 200; msg = " (RAMPAGE! 2x)" }
      if (newStreak >= 5) { points = 300; msg = " (GODLIKE! 3x)" }

      try {
        await fetch("http://127.0.0.1:8000/quiz/earn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ energy: points })
        })
        setEnergy(prev => prev + points)
      } catch(e) { console.error(e) }
      
    } else {
      setFeedback({ ...feedback, [questionId]: "incorrect" }) 
      setStreak(0) // Reset streak on fail
    }
  }

  const handleBattleEnd = (result, remainingWallHp) => {
    setIsBattling(false)
    if (result === 'won') {
        showRadio("🏆 VICTORY", "Night Survived! +500 Brains!")
        fetch("http://127.0.0.1:8000/quiz/earn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ energy: 500 })
        }).then(() => setEnergy(prev => prev + 500))
    } else {
        showRadio("💀 DEFEAT", "Base Overrun! Repair your walls!")
    }
    setDefense(prev => ({...prev, wall_health: remainingWallHp}))
  }

  return (
    <div className="app-container">
      {/* 1. RADIO OVERLAY (Replaces Alerts) */}
      {radioMsg && (
        <div className="radio-overlay">
            <div className="radio-message">
                <h2>{radioMsg.title}</h2>
                <p>{radioMsg.body}</p>
                <button onClick={() => setRadioMsg(null)}>ACKNOWLEDGED</button>
            </div>
        </div>
      )}

      {/* 2. STREAK DISPLAY */}
      {streak >= 2 && (
        <div className="streak-counter">
            🔥 COMBO x{streak >= 5 ? 3 : (streak >= 3 ? 2 : 1)}
        </div>
      )}

      <header>
        <h1>🧟 Zombies Like Brains</h1>
        <div className="stats-bar">
             <p>System: {status}</p>
             <p className="energy-display">🧠 Brains: {energy}</p>
        </div>
      </header>
      
      <main>
        {isBattling ? (
            <BattleArena defense={defense} onBattleEnd={handleBattleEnd} />
        ) : (
            <div className="castle-dashboard">
            <div className="castle-stats">
                <h3>🛡️ Survivor Base</h3>
                <div className="stat-row">🏘️ Base Level: <strong>{defense.tower_level}</strong></div>
                <div className="stat-row">🧱 Wall Health: <strong>{defense.wall_health}</strong></div>
                <div className="stat-row">🔫 Snipers: <strong>{defense.archers}</strong></div>
                
                <button 
                    className="start-battle-btn"
                    onClick={() => setIsBattling(true)}
                    disabled={defense.wall_health <= 0}
                    style={{marginTop: 20, width: '100%', background: '#ef4444'}}
                >
                    {defense.wall_health > 0 ? "⚔️ SURVIVE THE NIGHT" : "💀 REPAIR WALLS FIRST"}
                </button>
            </div>
            
            <div className="shop-section">
                <h3>🛒 Scavenger Shop</h3>
                <div className="shop-grid">
                <button className="shop-btn" onClick={() => handleBuy("upgrade_tower")} disabled={energy < 200}>
                    <span>Upgrade Base</span> <span className="cost">200 🧠</span>
                </button>
                <button className="shop-btn" onClick={() => handleBuy("hire_archer")} disabled={energy < 100}>
                    <span>Hire Sniper</span> <span className="cost">100 🧠</span>
                </button>
                <button className="shop-btn" onClick={() => handleBuy("repair_wall")} disabled={energy < 50}>
                    <span>Repair Wall</span> <span className="cost">50 🧠</span>
                </button>
                </div>
            </div>
            </div>
        )}

        {!isBattling && !quiz && (
          <div className="card">
            <h2>📁 Upload Intel (PDF)</h2>
            {!loading && (
                <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
            )}
            <br /><br />
            {!loading ? (
                <button onClick={handleGenerateQuiz}>Analyze Intel 🧠</button>
            ) : (
                <div className="loading-section">
                    <div className="progress-container">
                        <div className="progress-bar" style={{width: `${progress}%`}}></div>
                    </div>
                    <p className="loading-text">{loadingText}</p>
                </div>
            )}
          </div>
        )}

        {!isBattling && quiz && (
          <div className="quiz-container">
            <h2>⚔️ Fight for Knowledge</h2>
            {quiz.map((q) => (
              <div key={q.id} className={`card question-card ${feedback[q.id]}`}>
                <h3>{q.question}</h3>
                <div className="options-grid">
                  {q.options.map((option, index) => (
                    <button key={index} className="option-btn" onClick={() => handleAnswerClick(q.id, option, q.answer)} disabled={feedback[q.id]}>
                      {option}
                    </button>
                  ))}
                </div>
                {feedback[q.id] && (
                    <div className={`explanation-box ${feedback[q.id]}`}>
                        <h4>{feedback[q.id] === "correct" ? "✅ Correct!" : "❌ Incorrect"}</h4>
                        <p className="answer-reveal"><strong>Correct Answer:</strong> {q.answer}</p>
                        <p className="explanation-text">🎓 <strong>Why:</strong> {q.explanation}</p>
                    </div>
                )}
              </div>
            ))}
            <div className="action-buttons">
                <button className="refresh-btn" onClick={handleRefresh}>🔄 Scavenge Again</button>
                <button className="secondary-btn" onClick={() => {setQuiz(null); setFile(null)}}>📁 New File</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App