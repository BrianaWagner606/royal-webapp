// frontend/src/components/BattleArena.jsx
import { useState, useEffect, useRef } from 'react'
import '../App.css'

export default function BattleArena({ defense, onBattleEnd }) {
  const [gameState, setGameState] = useState('playing') // playing, won, lost
  const [zombies, setZombies] = useState([])
  const [bullets, setBullets] = useState([])
  const [localWallHp, setLocalWallHp] = useState(defense.wall_health)
  const [timeLeft, setTimeLeft] = useState(30) // Survive for 30 seconds

  // Refs for game loop (so we don't have stale state issues)
  const stateRef = useRef({
    zombies: [],
    bullets: [],
    lastShot: 0,
    wallHp: defense.wall_health,
    gameOver: false
  })

  // --- 1. SPAWN ZOMBIES ---
  useEffect(() => {
    const spawnInterval = setInterval(() => {
      if (stateRef.current.gameOver) return
      
      const newZombie = {
        id: Date.now(),
        x: 100, // Starts at 100% (Right side)
        hp: 100 + (Math.random() * 50), // Random HP
        speed: 0.2 + (Math.random() * 0.3) // Random speed
      }
      
      stateRef.current.zombies.push(newZombie)
    }, 2000) // New zombie every 2 seconds

    return () => clearInterval(spawnInterval)
  }, [])

  // --- 2. GAME TIMER ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (stateRef.current.gameOver) return
      
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame('won')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // --- 3. THE PHYSICS LOOP (60 FPS) ---
  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (stateRef.current.gameOver) return

      const now = Date.now()
      const { zombies, bullets, lastShot } = stateRef.current

      // A. ARCHERS SHOOT
      // Fire rate depends on archer count (more archers = faster shooting)
      const fireRate = Math.max(200, 2000 / (defense.archers || 1))
      
      if (now - lastShot > fireRate && defense.archers > 0) {
        stateRef.current.bullets.push({ id: now, x: 10 }) // Start at 10% (Left)
        stateRef.current.lastShot = now
      }

      // B. MOVE BULLETS & CHECK HITS
      const nextBullets = []
      stateRef.current.bullets.forEach(b => {
        b.x += 2 // Bullet speed
        
        // Hit detection
        let hit = false
        stateRef.current.zombies.forEach(z => {
          if (!hit && b.x >= z.x && b.x < z.x + 10) {
            z.hp -= 35 // Damage per shot
            hit = true // Bullet destroys itself
          }
        })

        if (!hit && b.x < 100) nextBullets.push(b)
      })
      stateRef.current.bullets = nextBullets

      // C. MOVE ZOMBIES & ATTACK WALL
      const nextZombies = []
      stateRef.current.zombies.forEach(z => {
        if (z.hp > 0) {
          // If zombie reached wall (x < 5), damage wall
          if (z.x <= 5) {
            stateRef.current.wallHp -= 0.5
            setLocalWallHp(Math.floor(stateRef.current.wallHp))
            if (stateRef.current.wallHp <= 0) endGame('lost')
          } else {
            z.x -= z.speed // Move left
          }
          nextZombies.push(z)
        }
      })
      stateRef.current.zombies = nextZombies

      // D. SYNC VISUALS
      setZombies([...stateRef.current.zombies])
      setBullets([...stateRef.current.bullets])

    }, 16) // ~60 FPS

    return () => clearInterval(gameLoop)
  }, [])

  const endGame = (result) => {
    stateRef.current.gameOver = true
    setGameState(result)
    // Send updated HP back to main app
    onBattleEnd(result, Math.floor(stateRef.current.wallHp))
  }

  return (
    <div className="battle-arena">
      <div className="arena-header">
        <span>🛡️ Wall: {localWallHp}</span>
        <span className="timer">⏰ {timeLeft}s</span>
      </div>

      <div className="battle-field">
        {/* THE WALL */}
        <div className="wall-visual">🏰</div>

        {/* ARCHERS */}
        <div className="archers-visual">
            {Array.from({ length: Math.min(defense.archers, 5) }).map((_, i) => (
                <div key={i}>🔫</div>
            ))}
        </div>

        {/* BULLETS */}
        {bullets.map(b => (
          <div 
            key={b.id} 
            className="bullet" 
            style={{ left: `${b.x}%` }}
          />
        ))}

        {/* ZOMBIES */}
        {zombies.map(z => (
          <div 
            key={z.id} 
            className="zombie" 
            style={{ left: `${z.x}%` }}
          >
            🧟
            <div className="hp-bar">
                <div className="hp-fill" style={{width: `${(z.hp/150)*100}%`}}></div>
            </div>
          </div>
        ))}
        
        {/* GAME OVER OVERLAY */}
        {gameState !== 'playing' && (
          <div className="battle-overlay">
            <h2>{gameState === 'won' ? "VICTORY! 🏆" : "DEFEAT 💀"}</h2>
            <p>{gameState === 'won' ? "You defended the base!" : "The zombies broke through!"}</p>
            <button onClick={() => onBattleEnd(gameState, localWallHp)}>
              Return to Base
            </button>
          </div>
        )}
      </div>
    </div>
  )
}