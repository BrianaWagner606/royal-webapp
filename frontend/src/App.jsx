// frontend/src/App.jsx
// MODE: HARDCORE GRIND 🩸
// ECONOMY: STARVATION (Forces studying)

import { useState, useEffect } from 'react'
import BattleArena from './components/BattleArena'
import './App.css'

function App() {
  const [status, setStatus] = useState("Checking Radar...")
  
  // --- SURVIVOR STATS ---
  const [energy, setEnergy] = useState(0) 
  const [defense, setDefense] = useState({ tower_level: 1, archers: 0, wall_health: 100 })
  const [isBattling, setIsBattling] = useState(false)
  
  // --- STREAKS ---
  const [quizStreak, setQuizStreak] = useState(0) // Combo for questions
  const [survivalStreak, setSurvivalStreak] = useState(0) // Consecutive nights survived (For Boss)
  const [leaderboard, setLeaderboard] = useState([])

  // --- GRIMOIRE & INTEL ---
  const [mistakes, setMistakes] = useState([])
  const [viewingGrimoire, setViewingGrimoire] = useState(false)
  const [radioMsg, setRadioMsg] = useState(null)
  const [file, setFile] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [feedback, setFeedback] = useState({})
  
  // --- LOADING ---
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState("")

  const API_URL = "http://127.0.0.1:8000"

  // --- COSTS (Visual Only - Backend verifies) ---
  const COST_UPGRADE = 500
  const COST_ARCHER = 300
  const COST_REPAIR = 100

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetch(API_URL).then(res => res.json()).then(d => setStatus(d.status)).catch(() => setStatus("Offline 💀"))
    fetch(`${API_URL}/quiz/energy`).then(res => res.json()).then(d => setEnergy(d.energy))
    updateDefenseStatus() 
    updateLeaderboard() 
    updateMistakes() 
  }, [])

  const updateDefenseStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/shop/status`)
      const data = await res.json()
      setDefense(data)
    } catch (e) { console.error("Base status error") }
  }

  const updateLeaderboard = async () => {
    try {
        const res = await fetch(`${API_URL}/quiz/leaderboard`)
        const data = await res.json()
        setLeaderboard(data)
    } catch (e) { console.error("Leaderboard error") }
  }

  const updateMistakes = async () => {
    try {
        const res = await fetch(`${API_URL}/quiz/mistakes`)
        const data = await res.json()
        setMistakes(data)
    } catch (e) { console.error("Grimoire error") }
  }

  // --- TEXT NORMALIZER ---
  const normalizeText = (text) => {
    return String(text).toLowerCase().replace(/^[a-zA-Z0-9][\)\.]\s*/, "").trim()
  }

  // --- HANDLERS ---
  const showRadio = (title, body) => setRadioMsg({ title, body })

  const handleBuy = async (itemType) => {
    // Note: We need to update backend costs to match these visual costs later!
    try {
      const res = await fetch(`${API_URL}/shop/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType })
      })
      if (!res.ok) return showRadio("❌ Access Denied", "Not enough Brains! Study harder.")
      
      const data = await res.json()
      setEnergy(data.energy)
      setDefense({ tower_level: data.tower_level, archers: data.archers, wall_health: data.wall_health })
    } catch (error) { console.error("Shop Error:", error) }
  }

  const handleGenerateQuiz = async () => {
    if (!file) return showRadio("⚠️ No Intel", "Upload a document first!")
    setFeedback({}); setViewingGrimoire(false)
    setLoading(true); setProgress(0); setLoadingText("Scanning for Fresh Brains...")
    const interval = setInterval(() => setProgress((old) => Math.min(old + Math.random() * 10, 90)), 800)

    try {
      const formData = new FormData()
      formData.append("file", file) 
      const response = await fetch(`${API_URL}/quiz/generate`, { method: "POST", body: formData })
      const data = await response.json()
      clearInterval(interval); setProgress(100); setLoadingText("Horde Incoming! 🧟")
      setTimeout(() => { setQuiz(data); setLoading(false) }, 500)
    } catch (error) {
      clearInterval(interval); setLoading(false); showRadio("💀 Signal Lost", "AI Error.")
    }
  }

  const handleAnswerClick = async (questionId, option, correctAnswer, isRedemption = false, mistakeId = null) => {
    const userNorm = normalizeText(option)
    const truthNorm = normalizeText(correctAnswer)
    
    let isCorrect = userNorm === truthNorm || userNorm.includes(truthNorm) || truthNorm.includes(userNorm)

    if (isCorrect) {
      setFeedback({ ...feedback, [questionId]: "correct" }) 
      const newStreak = quizStreak + 1
      setQuizStreak(newStreak)
      
      // --- THE GRIND ECONOMY 🩸 ---
      // Base reward dropped to 20. Studying is mandatory.
      let points = 20 
      if (newStreak >= 3) points = 30; // Small combo bonus
      if (newStreak >= 5) points = 40; 

      if (isRedemption && mistakeId) {
        await fetch(`${API_URL}/quiz/mistake/${mistakeId}`, { method: "DELETE" })
        points = 10 // Pitance for redemption
        updateMistakes() 
        showRadio("🔥 REDEEMED", "Mistake burned.")
      }

      try {
        await fetch(`${API_URL}/quiz/earn`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ energy: points })
        })
        setEnergy(prev => prev + points)
      } catch(e) { console.error(e) }
      
    } else {
      setFeedback({ ...feedback, [questionId]: "incorrect" }) 
      setQuizStreak(0) 

      if (!isRedemption) {
        const qObj = quiz.find(q => q.id === questionId)
        if (qObj) {
            fetch(`${API_URL}/quiz/mistake`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: qObj.question,
                    answer: qObj.answer,
                    explanation: qObj.explanation,
                    options: qObj.options
                })
            }).then(() => updateMistakes())
        }
      }
    }
  }

  const handleBattleEnd = (result, remainingWallHp) => {
    setIsBattling(false)
    if (result === 'won') {
        // INCREMENT SURVIVAL STREAK (This triggers Boss)
        setSurvivalStreak(prev => prev + 1)
        
        showRadio("🏆 VICTORY", `Night Survived! Streak: ${survivalStreak + 1}`)
        fetch(`${API_URL}/quiz/earn`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ energy: 100 }) // Victory reward reduced
        }).then(() => setEnergy(prev => prev + 100))

        fetch(`${API_URL}/quiz/survive`, { method: "POST" })
            .then(() => updateLeaderboard())
    } else {
        setSurvivalStreak(0) // Reset streak on death
        showRadio("💀 DEFEAT", "Base Overrun! Streak Reset.")
    }
    setDefense(prev => ({...prev, wall_health: remainingWallHp}))
  }

  const retryMistake = (mistake) => {
    setViewingGrimoire(false); setFeedback({})
    setQuiz([{
        id: "redemption-" + mistake.id,
        question: mistake.question,
        options: mistake.options, 
        answer: mistake.answer,
        explanation: mistake.explanation,
        mistakeId: mistake.id, 
        isRedemption: true
    }])
  }

  return (
    <div className="app-container">
      {radioMsg && (
        <div className="radio-overlay">
            <div className="radio-message">
                <h2>{radioMsg.title}</h2>
                <p>{radioMsg.body}</p>
                <button onClick={() => setRadioMsg(null)}>ACKNOWLEDGED</button>
            </div>
        </div>
      )}

      {quizStreak >= 2 && <div className="streak-counter">🔥 KNOWLEDGE STREAK x{quizStreak}</div>}

      <header>
        <h1>🧟 Zombies Like Brains (Hardcore)</h1>
        <div className="stats-bar">
             <p>Streak: {survivalStreak} Nights</p>
             <p className="energy-display">🧠 Brains: {energy}</p>
        </div>
      </header>
      
      <main>
        {isBattling ? (
            <BattleArena 
                defense={defense} 
                onBattleEnd={handleBattleEnd} 
                streak={survivalStreak} // Passing the REAL survival streak now
            />
        ) : (
            <>
            {!quiz && !viewingGrimoire && (
            <div className="castle-dashboard">
                <div className="castle-stats">
                    <h3>🛡️ Survivor Base</h3>
                    <div className="stat-row">🏘️ Base Level: <strong>{defense.tower_level}</strong></div>
                    <div className="stat-row">🧱 Wall Health: <strong>{defense.wall_health}</strong></div>
                    <div className="stat-row">🔫 Snipers: <strong>{defense.archers}</strong></div>
                    
                    <button className="start-battle-btn" onClick={() => setIsBattling(true)} disabled={defense.wall_health <= 0} style={{marginTop: 20, width: '100%', background: '#ef4444'}}>
                        {defense.wall_health > 0 ? "⚔️ SURVIVE THE NIGHT" : "💀 REPAIR WALLS FIRST"}
                    </button>
                </div>
                
                <div className="shop-section">
                    <h3>🛒 Scavenger Shop</h3>
                    <div className="shop-grid">
                        
                    <button className="shop-btn" onClick={() => handleBuy("upgrade_tower")} disabled={energy < COST_UPGRADE}>
                        <span>Upgrade Base</span> <span className="cost">{COST_UPGRADE} 🧠</span>
                    </button>

                    {/* SNIPER LOCK LOGIC */}
                    {(() => {
                        const sniperLimit = Math.floor(defense.tower_level / 3) + 1
                        const isMaxed = defense.archers >= sniperLimit
                        return (
                            <button className="shop-btn" onClick={() => handleBuy("hire_archer")} disabled={energy < COST_ARCHER || isMaxed} style={{ opacity: isMaxed ? 0.5 : 1 }}>
                                <span>Hire Sniper</span> 
                                {isMaxed ? (
                                    <span className="cost" style={{color: 'orange', fontSize:'0.7rem'}}>Need Lv {defense.tower_level + (3 - (defense.tower_level % 3))}</span>
                                ) : (
                                    <span className="cost">{COST_ARCHER} 🧠</span>
                                )}
                            </button>
                        )
                    })()}

                    <button className="shop-btn" onClick={() => handleBuy("repair_wall")} disabled={energy < COST_REPAIR}>
                        <span>Repair Wall</span> <span className="cost">{COST_REPAIR} 🧠</span>
                    </button>
                    </div>
                </div>
            </div>
            )}

            {!quiz && !viewingGrimoire && (
            <div className="castle-dashboard" style={{ marginTop: '20px' }}>
                <div style={{ width: '100%' }}>
                    <h3>🏆 Global Survivors</h3>
                    {leaderboard.map((user, index) => (
                        <div key={user.id} style={{display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #333'}}>
                             <span>#{index + 1} {user.username}</span>
                             <span style={{color:'var(--accent-brain)'}}>{user.days_survived} Days</span>
                        </div>
                    ))}
                </div>
            </div>
            )}
            </>
        )}

        {!isBattling && !quiz && !viewingGrimoire && (
          <div className="card" style={{marginTop: 20}}>
            <h2>📁 Intel & Archives</h2>
            <div style={{display:'flex', gap: '10px', alignItems:'center', justifyContent:'center'}}>
                 {!loading && <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />}
                 {!loading && <button onClick={handleGenerateQuiz}>Analyze Intel 🧠</button>}
            </div>
            {loading && (
                <div className="loading-section">
                   <p className="loading-text">{loadingText}</p>
                </div>
            )}
            <hr style={{borderColor: '#333', margin: '20px 0'}}/>
            <button className="secondary-btn" onClick={() => setViewingGrimoire(true)} style={{width: '100%'}}>
                📖 Open The Grimoire ({mistakes.length} Failed)
            </button>
          </div>
        )}

        {viewingGrimoire && (
            <div className="card">
                <h2>📖 The Grimoire</h2>
                <div className="mistake-grid" style={{display:'grid', gap:'10px'}}>
                    {mistakes.map(m => (
                        <div key={m.id} className="mistake-card" style={{border:'1px solid #444', padding:'10px', background:'rgba(0,0,0,0.3)'}}>
                            <p><strong>{m.question}</strong></p>
                            <button onClick={() => retryMistake(m)} style={{background:'var(--accent-toxic)', color:'#000'}}>Redeem</button>
                        </div>
                    ))}
                </div>
                <button className="secondary-btn" onClick={() => setViewingGrimoire(false)} style={{marginTop:'20px'}}>Back</button>
            </div>
        )}

        {!isBattling && quiz && (
          <div className="quiz-container">
            <h2>{quiz[0].isRedemption ? "🩸 Redemption" : "⚔️ Scavenge"}</h2>
            {quiz.map((q) => (
              <div key={q.id} className={`card question-card ${feedback[q.id]}`}>
                <h3>{q.question}</h3>
                <div className="options-grid">
                  {q.options.map((option, index) => (
                    <button key={index} className="option-btn" onClick={() => handleAnswerClick(q.id, option, q.answer, q.isRedemption, q.mistakeId)} disabled={feedback[q.id]}>{option}</button>
                  ))}
                </div>
                {feedback[q.id] && (
                    <div className={`explanation-box ${feedback[q.id]}`}>
                        <h4>{feedback[q.id] === "correct" ? "Correct" : "Incorrect"}</h4>
                        <p>{q.explanation}</p>
                    </div>
                )}
              </div>
            ))}
            <div className="action-buttons">
                {!quiz[0].isRedemption && <button className="refresh-btn" onClick={() => {setQuiz(null); handleGenerateQuiz()}}>Next File</button>}
                <button className="secondary-btn" onClick={() => {setQuiz(null); setFile(null)}}>Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App