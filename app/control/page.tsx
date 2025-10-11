"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus, Play, Pause, RotateCcw, ArrowUpDown, ExternalLink, AlertTriangle, Wifi } from "lucide-react"

interface GameState {
  scoreLocal: number
  scoreVisitante: number
  nombreLocal: string
  nombreVisitante: string
  currentQuarter: number
  timeRemaining: number
  chronoTime: number
  timerRunning: boolean
  countUpMode: boolean
  durationMinutes: number
  bordeRojo: boolean
  lastUpdated: number
  version: number
}

export default function ControlPanel() {
  const [gameState, setGameState] = useState<GameState>({
    scoreLocal: 0,
    scoreVisitante: 0,
    nombreLocal: "LOCAL",
    nombreVisitante: "VISITANTE",
    currentQuarter: 1,
    timeRemaining: 600,
    chronoTime: 0,
    timerRunning: false,
    countUpMode: false,
    durationMinutes: 10,
    bordeRojo: false,
    lastUpdated: Date.now(),
    version: 1,
  })

  const [connectedDisplays, setConnectedDisplays] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const publicWindowRef = useRef<Window | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)

  const quarters = ["1ER CUARTO", "2DO CUARTO", "3ER CUARTO", "4TO CUARTO", "TIEMPO EXTRA"]

  const getTimerText = () => {
    const time = gameState.countUpMode ? gameState.chronoTime : gameState.timeRemaining
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0")
    const seconds = (time % 60).toString().padStart(2, "0")
    return `${minutes}:${seconds}`
  }

  // Simplified broadcast function
  const broadcastGameState = useCallback((newState: GameState) => {
    const stateWithTimestamp = {
      ...newState,
      lastUpdated: Date.now(),
      version: Date.now(), // Use timestamp as version for uniqueness
    }

    try {
      // Primary method: localStorage
      localStorage.setItem("sportsScoreboard", JSON.stringify(stateWithTimestamp))

      // Trigger a custom event instead of StorageEvent
      window.dispatchEvent(
        new CustomEvent("scoreboardUpdate", {
          detail: stateWithTimestamp,
        }),
      )

      // Direct message to public window if open
      if (publicWindowRef.current && !publicWindowRef.current.closed) {
        publicWindowRef.current.postMessage(
          {
            type: "SCOREBOARD_UPDATE",
            data: stateWithTimestamp,
          },
          "*",
        )
      }

      console.log("State broadcasted successfully:", stateWithTimestamp.version)
    } catch (error) {
      console.error("Error broadcasting state:", error)
    }
  }, [])

  const updateGameState = useCallback(
    (updates: Partial<GameState>) => {
      setGameState((prev) => {
        const newState = { ...prev, ...updates }
        broadcastGameState(newState)
        return newState
      })
    },
    [broadcastGameState],
  )

  // Heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }

    heartbeatRef.current = setInterval(() => {
      // Send heartbeat with current state
      broadcastGameState(gameState)

      // Check for connected displays
      const displays = localStorage.getItem("connectedDisplays")
      if (displays) {
        try {
          const displayData = JSON.parse(displays)
          const now = Date.now()
          const activeDisplays = displayData.filter((d: any) => now - d.lastSeen < 10000) // 10 seconds
          setConnectedDisplays(activeDisplays.length)
        } catch (e) {
          setConnectedDisplays(0)
        }
      }
    }, 2000) // Every 2 seconds
  }, [gameState, broadcastGameState])

  const startTimer = () => {
    if (gameState.timerRunning) return

    updateGameState({ timerRunning: true })

    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        const newState = { ...prev }

        if (prev.countUpMode) {
          newState.chronoTime = prev.chronoTime + 1
          if (newState.chronoTime >= 100 * 60) {
            newState.timerRunning = false
            clearInterval(timerRef.current!)
          }
        } else {
          newState.timeRemaining = prev.timeRemaining - 1

          if (newState.timeRemaining === 1) {
            const audio = new Audio("/alarm.mp3")
            audio.play().catch(() => {
              console.log("Alarm sound would play here")
            })
          }

          if (newState.timeRemaining <= 0) {
            newState.timerRunning = false
            newState.bordeRojo = true
            clearInterval(timerRef.current!)

            setTimeout(() => {
              setGameState((current) => {
                const updated = { ...current, bordeRojo: false }
                broadcastGameState(updated)
                return updated
              })
            }, 5000)

            alert("¡Fin del cuarto!")
          }
        }

        broadcastGameState(newState)
        return newState
      })
    }, 1000)
  }

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    updateGameState({ timerRunning: false })
  }

  const resetTimer = () => {
    pauseTimer()
    const newTime = gameState.countUpMode ? 0 : gameState.durationMinutes * 60
    updateGameState({
      timeRemaining: gameState.countUpMode ? gameState.timeRemaining : newTime,
      chronoTime: gameState.countUpMode ? newTime : gameState.chronoTime,
    })
  }

  const openPublicDisplay = () => {
    if (!publicWindowRef.current || publicWindowRef.current.closed) {
      publicWindowRef.current = window.open("/display", "PublicDisplay", "width=1200,height=800")

      // Send initial state after a delay
      setTimeout(() => {
        if (publicWindowRef.current && !publicWindowRef.current.closed) {
          broadcastGameState(gameState)
        }
      }, 1000)
    } else {
      publicWindowRef.current.focus()
      broadcastGameState(gameState)
    }
  }

  // Initialize
  useEffect(() => {
    // Initial broadcast
    broadcastGameState(gameState)

    // Start heartbeat
    startHeartbeat()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
    }
  }, [])

  // Update heartbeat when gameState changes
  useEffect(() => {
    startHeartbeat()
  }, [startHeartbeat])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-4">
              Panel de Control - Tablero Deportivo
              <div className="flex items-center gap-2">
                <Badge variant="default" className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  {connectedDisplays} Pantalla{connectedDisplays !== 1 ? "s" : ""} Conectada
                  {connectedDisplays !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Names */}
          <Card>
            <CardHeader>
              <CardTitle>Equipos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nombreLocal">Equipo Local</Label>
                <Input
                  id="nombreLocal"
                  value={gameState.nombreLocal}
                  onChange={(e) => updateGameState({ nombreLocal: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nombreVisitante">Equipo Visitante</Label>
                <Input
                  id="nombreVisitante"
                  value={gameState.nombreVisitante}
                  onChange={(e) => updateGameState({ nombreVisitante: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timer Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Control de Tiempo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="duration">Duración del cuarto (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="60"
                  value={gameState.durationMinutes}
                  onChange={(e) => {
                    const duration = Number.parseInt(e.target.value) || 10
                    updateGameState({
                      durationMinutes: duration,
                      timeRemaining: duration * 60,
                    })
                  }}
                />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 font-mono">{getTimerText()}</div>
                <div className="text-lg mb-4">{quarters[Math.min(gameState.currentQuarter - 1, 4)]}</div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    onClick={gameState.timerRunning ? pauseTimer : startTimer}
                    className="flex items-center gap-2"
                  >
                    {gameState.timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {gameState.timerRunning ? "Pausar" : "Iniciar"}
                  </Button>
                  <Button onClick={resetTimer} variant="outline" className="flex items-center gap-2 bg-transparent">
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                  <Button
                    onClick={() => updateGameState({ countUpMode: !gameState.countUpMode })}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    {gameState.countUpMode ? "Cuenta Regresiva" : "Cronómetro"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Local Team Score */}
          <Card>
            <CardHeader>
              <CardTitle>{gameState.nombreLocal}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-6xl font-bold mb-4 font-mono">{gameState.scoreLocal}</div>
                <Input
                  type="number"
                  min="0"
                  value={gameState.scoreLocal}
                  onChange={(e) => updateGameState({ scoreLocal: Number.parseInt(e.target.value) || 0 })}
                  className="text-center text-xl font-mono"
                />
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  onClick={() => updateGameState({ scoreLocal: Math.max(0, gameState.scoreLocal - 1) })}
                  variant="destructive"
                  size="sm"
                >
                  <Minus className="w-4 h-4" />1
                </Button>
                <Button onClick={() => updateGameState({ scoreLocal: gameState.scoreLocal + 1 })} size="sm">
                  <Plus className="w-4 h-4" />1
                </Button>
                <Button onClick={() => updateGameState({ scoreLocal: gameState.scoreLocal + 2 })} size="sm">
                  <Plus className="w-4 h-4" />2
                </Button>
                <Button onClick={() => updateGameState({ scoreLocal: gameState.scoreLocal + 3 })} size="sm">
                  <Plus className="w-4 h-4" />3
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Visiting Team Score */}
          <Card>
            <CardHeader>
              <CardTitle>{gameState.nombreVisitante}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-6xl font-bold mb-4 font-mono">{gameState.scoreVisitante}</div>
                <Input
                  type="number"
                  min="0"
                  value={gameState.scoreVisitante}
                  onChange={(e) => updateGameState({ scoreVisitante: Number.parseInt(e.target.value) || 0 })}
                  className="text-center text-xl font-mono"
                />
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  onClick={() => updateGameState({ scoreVisitante: Math.max(0, gameState.scoreVisitante - 1) })}
                  variant="destructive"
                  size="sm"
                >
                  <Minus className="w-4 h-4" />1
                </Button>
                <Button onClick={() => updateGameState({ scoreVisitante: gameState.scoreVisitante + 1 })} size="sm">
                  <Plus className="w-4 h-4" />1
                </Button>
                <Button onClick={() => updateGameState({ scoreVisitante: gameState.scoreVisitante + 2 })} size="sm">
                  <Plus className="w-4 h-4" />2
                </Button>
                <Button onClick={() => updateGameState({ scoreVisitante: gameState.scoreVisitante + 3 })} size="sm">
                  <Plus className="w-4 h-4" />3
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quarter and Display Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Control de Cuartos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-xl mb-4">{quarters[Math.min(gameState.currentQuarter - 1, 4)]}</div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() =>
                      updateGameState({
                        currentQuarter: gameState.currentQuarter > 1 ? gameState.currentQuarter - 1 : 4,
                      })
                    }
                    variant="outline"
                  >
                    Anterior
                  </Button>
                  <Button
                    onClick={() =>
                      updateGameState({
                        currentQuarter: gameState.currentQuarter < 4 ? gameState.currentQuarter + 1 : 1,
                      })
                    }
                    variant="outline"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Controles de Pantalla</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={openPublicDisplay} className="w-full flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Abrir Pantalla Pública
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => updateGameState({ bordeRojo: true })}
                  variant="destructive"
                  className="flex-1 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Activar Alarma
                </Button>
                <Button onClick={() => updateGameState({ bordeRojo: false })} variant="outline" className="flex-1">
                  Desactivar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Data Display */}
        <Card>
          <CardHeader>
            <CardTitle>Estado Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-2">
              Última actualización: {new Date(gameState.lastUpdated).toLocaleTimeString()}
            </div>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40">
              {JSON.stringify(gameState, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
