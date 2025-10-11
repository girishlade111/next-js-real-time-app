"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"

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

export default function PublicDisplay() {
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
    version: 0,
  })

  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const displayId = useRef(Math.random().toString(36).substr(2, 9))

  const quarters = ["1ER CUARTO", "2DO CUARTO", "3ER CUARTO", "4TO CUARTO", "TIEMPO EXTRA"]

  const getTimerText = () => {
    const time = gameState.countUpMode ? gameState.chronoTime : gameState.timeRemaining
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, "0")
    const seconds = (time % 60).toString().padStart(2, "0")
    return `${minutes}:${seconds}`
  }

  const updateGameState = (newState: GameState) => {
    if (newState.version > gameState.version) {
      console.log("Updating display with new state:", newState.version)
      setGameState(newState)
      setLastUpdate(new Date())
      setIsConnected(true)
      setReconnectAttempts(0)
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem("sportsScoreboard")
      if (stored) {
        const parsedState = JSON.parse(stored)
        updateGameState(parsedState)
        return true
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    }
    return false
  }

  const registerDisplay = () => {
    try {
      const displays = JSON.parse(localStorage.getItem("connectedDisplays") || "[]")
      const existingIndex = displays.findIndex((d: any) => d.id === displayId.current)

      const displayInfo = {
        id: displayId.current,
        lastSeen: Date.now(),
        userAgent: navigator.userAgent.substring(0, 50),
      }

      if (existingIndex >= 0) {
        displays[existingIndex] = displayInfo
      } else {
        displays.push(displayInfo)
      }

      localStorage.setItem("connectedDisplays", JSON.stringify(displays))
    } catch (error) {
      console.error("Error registering display:", error)
    }
  }

  const startHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }

    heartbeatRef.current = setInterval(() => {
      // Register this display as active
      registerDisplay()

      // Check connection status
      const timeSinceLastUpdate = Date.now() - gameState.lastUpdated
      const wasConnected = isConnected
      const nowConnected = timeSinceLastUpdate < 15000 // 15 seconds tolerance

      setIsConnected(nowConnected)

      // If connection was lost, try to reload from localStorage
      if (!nowConnected && wasConnected) {
        console.log("Connection lost, attempting to reload...")
        setReconnectAttempts((prev) => prev + 1)
        loadFromLocalStorage()
      }
    }, 3000) // Every 3 seconds
  }

  useEffect(() => {
    console.log("Public display initializing with ID:", displayId.current)

    // Load initial state
    loadFromLocalStorage()

    // Register this display
    registerDisplay()

    // Start heartbeat
    startHeartbeat()

    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sportsScoreboard" && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue)
          updateGameState(newState)
        } catch (error) {
          console.error("Error parsing storage event:", error)
        }
      }
    }

    // Listen for custom events (same tab communication)
    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail) {
        updateGameState(e.detail)
      }
    }

    // Listen for direct messages
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "SCOREBOARD_UPDATE" && e.data.data) {
        updateGameState(e.data.data)
      }
    }

    // Add event listeners
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("scoreboardUpdate", handleCustomEvent as EventListener)
    window.addEventListener("message", handleMessage)

    // Cleanup
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("scoreboardUpdate", handleCustomEvent as EventListener)
      window.removeEventListener("message", handleMessage)

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }

      // Unregister display
      try {
        const displays = JSON.parse(localStorage.getItem("connectedDisplays") || "[]")
        const filtered = displays.filter((d: any) => d.id !== displayId.current)
        localStorage.setItem("connectedDisplays", JSON.stringify(filtered))
      } catch (error) {
        console.error("Error unregistering display:", error)
      }
    }
  }, [])

  const handleReconnect = () => {
    console.log("Manual reconnect attempt...")
    loadFromLocalStorage()
    setReconnectAttempts(0)
  }

  return (
    <div
      className={`min-h-screen text-white flex flex-col justify-between p-4 md:p-8 transition-all duration-500 relative ${
        gameState.bordeRojo
          ? "animate-pulse border-8 border-red-500 shadow-red-500/50 shadow-2xl bg-gradient-to-br from-red-600 to-red-800"
          : "bg-gradient-to-br from-blue-500 to-blue-700"
      }`}
    >
      {/* Connection Status */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {isConnected ? (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <Wifi className="w-3 h-3" />
            En Vivo
          </Badge>
        ) : (
          <div className="flex gap-2">
            <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
              <WifiOff className="w-3 h-3" />
              Sin conexión
            </Badge>
            <button
              onClick={handleReconnect}
              className="bg-yellow-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-yellow-700"
            >
              <RefreshCw className="w-3 h-3" />
              Reconectar
            </button>
          </div>
        )}
      </div>

      {/* Team Names */}
      <div className="flex justify-between items-start w-full px-4 md:px-8">
        <div className="text-2xl md:text-4xl lg:text-6xl xl:text-8xl font-bold text-center uppercase tracking-wider w-2/5 break-words drop-shadow-lg">
          {gameState.nombreLocal}
        </div>
        <div className="text-2xl md:text-4xl lg:text-6xl xl:text-8xl font-bold text-center uppercase tracking-wider w-2/5 break-words drop-shadow-lg">
          {gameState.nombreVisitante}
        </div>
      </div>

      {/* Scores */}
      <div className="flex justify-between items-center w-full px-4 md:px-8 my-4 md:my-8">
        <div className="text-6xl md:text-8xl lg:text-9xl xl:text-[12rem] font-bold text-center w-2/5 drop-shadow-2xl font-mono transition-all duration-300">
          {gameState.scoreLocal}
        </div>
        <div className="text-6xl md:text-8xl lg:text-9xl xl:text-[12rem] font-bold text-center w-2/5 drop-shadow-2xl font-mono transition-all duration-300">
          {gameState.scoreVisitante}
        </div>
      </div>

      {/* Center Info - Quarter and Timer */}
      <div className="flex flex-col items-center justify-center space-y-2 md:space-y-4">
        <div className="text-xl md:text-3xl lg:text-5xl xl:text-6xl font-bold text-center drop-shadow-lg">
          {quarters[Math.min(gameState.currentQuarter - 1, 4)]}
        </div>
        <div className="text-4xl md:text-6xl lg:text-8xl xl:text-9xl font-bold text-center drop-shadow-2xl font-mono transition-all duration-300">
          {getTimerText()}
        </div>
        {gameState.timerRunning && (
          <div className="text-sm md:text-lg text-center opacity-75 animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            EN CURSO
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="absolute bottom-2 left-2 text-xs opacity-50 bg-black/20 p-2 rounded">
        <div>Última actualización: {lastUpdate.toLocaleTimeString()}</div>
        <div>Estado: {isConnected ? "Conectado" : `Desconectado (${reconnectAttempts} intentos)`}</div>
        <div>ID: {displayId.current}</div>
      </div>
    </div>
  )
}
