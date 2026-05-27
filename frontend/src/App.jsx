import { useState } from 'react'
import './App.css'
import StatsPage from './pages/statsPage'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      
  <StatsPage/>
    </>
  )
}

export default App
