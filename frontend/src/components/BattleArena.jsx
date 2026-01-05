// frontend/src/components/BattleArena.jsx
import { useState, useEffect, useRef } from 'react'

const GAME_TICK_MS = 40 // Faster Game Loop = Faster Zombies
const BATTLE_DURATION = 30 
const ARROW_SPEED = 4

export default function BattleArena({ defense, onBattleEnd, streak }) {
  const [timeLeft, setTimeLeft] = useState(BATTLE_DURATION)
  const [wallHp, setWallHp] = useState(defense.wall_health)
  
  // Entities
  const [zombies, setZombies] = useState([]) 
  const [arrows, setArrows] = useState([])
  
  const [isShaking, setIsShaking] = useState(false)
  const [flashRed, setFlashRed] = useState(false)
  const [showBossWarning, setShowBossWarning] = useState(false)

  // --- EXPONENTIAL DIFFICULTY ---
  // The game gets significantly harder every level.
  const DIFFICULTY = defense.tower_level || 1
  const SPAWN_RATE = 0.04 + (DIFFICULTY * 0.01) 
  // Level 1 = 1HP. Level 5 = 8HP. Level 10 = 22HP.
  const ZOMBIE_MAX_HP = Math.ceil(Math.pow(DIFFICULTY, 1.3)) 
  const ZOMBIE_SPEED_BASE = 0.7 + (DIFFICULTY * 0.1) 

  // --- BOSS LOGIC ---
  // If you have survived 3+ nights in a row, the Boss comes.
  const IS_BOSS_NIGHT = streak >= 3
  const BOSS_SPAWN_TIME = 15 
  const bossSpawnedRef = useRef(false) 

  const wallHpRef = useRef(wallHp)
  const zombiesRef = useRef([])
  const arrowsRef = useRef([])
  const timeLeftRef = useRef(timeLeft)

  useEffect(() => { wallHpRef.current = wallHp }, [wallHp])
  useEffect(() => { zombiesRef.current = zombies }, [zombies])
  useEffect(() => { arrowsRef.current = arrows }, [arrows])
  useEffect(() => { timeLeftRef.current = timeLeft }, [timeLeft])

  useEffect(() => {
    const loop = setInterval(() => {
      // 1. END CONDITIONS
      if (wallHpRef.current <= 0) { clearInterval(loop); onBattleEnd('lost', 0); return }
      if (timeLeftRef.current <= 0) { clearInterval(loop); onBattleEnd('won', wallHpRef.current); return }

      setTimeLeft(prev => Math.max(0, prev - (GAME_TICK_MS / 1000)))

      // 2. BOSS SPAWNING
      if (IS_BOSS_NIGHT && !bossSpawnedRef.current && timeLeftRef.current < BOSS_SPAWN_TIME) {
        bossSpawnedRef.current = true
        setShowBossWarning(true) 
        setTimeout(() => setShowBossWarning(false), 3000)

        setZombies(prev => [...prev, { 
            id: 'BOSS', x: 100, type: "🧟‍♀️", isBoss: true,
            hp: ZOMBIE_MAX_HP * 20, maxHp: ZOMBIE_MAX_HP * 20, // MASSIVE HP
            speed: ZOMBIE_SPEED_BASE * 0.4
        }])
      }

      // 3. REGULAR SPAWNS
      if (Math.random() < SPAWN_RATE) {
        const isTank = Math.random() > 0.9
        const type = isTank ? "👹" : (Math.random() > 0.5 ? "🧟‍♂️" : "🧟")
        const hp = isTank ? ZOMBIE_MAX_HP * 3 : ZOMBIE_MAX_HP
        const speed = isTank ? ZOMBIE_SPEED_BASE * 0.5 : ZOMBIE_SPEED_BASE
        
        setZombies(prev => [...prev, { 
            id: Date.now() + Math.random(), x: 100, type, hp, maxHp: hp, speed
        }])
      }

      // 4. MOVEMENT & WALL HIT
      setZombies(prev => {
        let next = []
        let hitWall = false
        prev.forEach(z => {
          const newX = z.x - z.speed
          if (newX <= 8) { 
            hitWall = true
            const damage = z.isBoss ? 100 : (10 * DIFFICULTY) // Boss instakills weak walls
            setWallHp(hp => Math.max(0, hp - damage))
          } else {
            next.push({ ...z, x: newX })
          }
        })
        if (hitWall) triggerImpact()
        return next
      })

      // 5. ARROW SPAWN
      if (defense.archers > 0 && Math.random() < 0.08 * defense.archers) {
        setArrows(prev => [...prev, { id: Date.now() + Math.random(), x: 15, y: 25 + Math.random() * 20 }])
      }

      // 6. COLLISION
      setArrows(prev => {
        let nextArrows = []
        let currentZombies = [...zombiesRef.current]
        let zombiesUpdated = false

        prev.forEach(arrow => {
          const newX = arrow.x + ARROW_SPEED
          let arrowHit = false
          
          for (let i = currentZombies.length - 1; i >= 0; i--) {
            const z = currentZombies[i]
            const hitboxSize = z.isBoss ? 15 : 6
            
            if (z.x < newX && z.x > newX - hitboxSize) {
                arrowHit = true
                z.hp -= 1 
                if (!z.isBoss) z.x += 2 // Boss cannot be knocked back
                zombiesUpdated = true
                if (z.hp <= 0) currentZombies.splice(i, 1) 
                break 
            }
          }
          if (!arrowHit && newX < 100) nextArrows.push({ ...arrow, x: newX, y: arrow.y })
        })

        if (zombiesUpdated) setZombies(currentZombies)
        return nextArrows
      })

    }, GAME_TICK_MS)
    return () => clearInterval(loop)
  }, []) 

  const triggerImpact = () => { setIsShaking(true); setFlashRed(true); setTimeout(() => { setIsShaking(false); setFlashRed(false) }, 400) }

  // UI HELPERS
  const getWallEmoji = () => wallHp <= 0 ? "🔥" : wallHp < 30 ? "🏚️" : "🏰"
  const hpPercent = (wallHp / defense.wall_health) * 100
  const hpColor = hpPercent > 60 ? '#22c55e' : hpPercent > 30 ? '#eab308' : '#ef4444'

  return (
    <div className="card" style={{padding: '10px', background: '#000', position:'relative', overflow:'hidden'}}>
      {showBossWarning && (
        <div style={{
            position:'absolute', top:'40%', left:0, width:'100%', 
            textAlign:'center', color:'red', fontSize:'3rem', fontWeight:'bold', 
            zIndex:100, textShadow:'0 0 10px #000', animation:'pulse 0.5s infinite'
        }}>⚠️ BOSS INCOMING ⚠️</div>
      )}

      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px', padding:'0 10px'}}>
        <div style={{fontWeight:'bold', color:'#fff', width:'80px'}}>⏳ {Math.ceil(timeLeft)}s</div>
        <div style={{flex:1, height:'12px', background:'#333', borderRadius:'6px', margin:'0 15px', overflow:'hidden', border:'1px solid #555'}}>
            <div style={{width: `${hpPercent}%`, background: hpColor, height:'100%', transition:'width 0.2s'}}></div>
        </div>
        <div style={{fontWeight:'bold', color: hpColor, width:'80px', textAlign:'right'}}>❤️ {wallHp}</div>
      </div>

      <div className="battle-scene">
        {flashRed && <div className="damage-flash"></div>}
        <div className="moon" style={{background: IS_BOSS_NIGHT ? 'red' : '#fff', boxShadow: IS_BOSS_NIGHT ? '0 0 40px red' : '0 0 40px #fff'}}></div>
        <div className="ground-layer"></div>
        <div className={`wall-container ${isShaking ? 'wall-shake' : ''}`}>{getWallEmoji()}</div>

        {zombies.map(z => (
            <div key={z.id} className="zombie-sprite" style={{
                left: `${z.x}%`, 
                filter: z.isBoss ? "hue-rotate(90deg) drop-shadow(0 0 10px red)" : (z.type === "👹" ? "hue-rotate(300deg)" : "none"),
                fontSize: z.isBoss ? "6rem" : "3.5rem",
                bottom: z.isBoss ? "15px" : "25px", zIndex: z.isBoss ? 20 : 8
            }}>
                {(z.maxHp > 1) && (
                    <div style={{position:'absolute', top: z.isBoss ? 20 : -10, left:0, width:'100%', height: z.isBoss ? '8px' : '4px', background:'red', border:'1px solid #000'}}>
                        <div style={{width: `${(z.hp/z.maxHp)*100}%`, background:'#0f0', height:'100%'}}></div>
                    </div>
                )}
                {z.type}
            </div>
        ))}
        {arrows.map(a => <div key={a.id} className="arrow" style={{left: `${a.x}%`, bottom: `${a.y}%`, width: '20px'}}></div>)}
        
        <div style={{position:'absolute', bottom: '45px', left: '20px', fontSize:'1.2rem', zIndex:11}}>
           {Array(Math.min(defense.archers, 3)).fill("🏹").join(" ")}
           {defense.archers > 3 && <span style={{color:'#fff', fontSize:'0.8rem', background:'#000', padding:'2px'}}>+{defense.archers-3}</span>}
        </div>
      </div>
    </div>
  )
}