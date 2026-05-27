import { useState } from 'react'
import './App.css'
import StatsPage from './pages/statsPage'
import CachePage from './pages/CachePage'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <CachePage/>
  {/* <StatsPage/> */}
    </>
  )
}

export default App
