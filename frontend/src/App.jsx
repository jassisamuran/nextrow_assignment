import { useState } from 'react'
import './App.css'
import StatsPage from './pages/statsPage'
import CachePage from './pages/CachePage'
import ChatPage from './pages/ChatPage'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <ChatPage/>
      {/* <CachePage/> */}
  {/* <StatsPage/> */}
    </>
  )
}

export default App
