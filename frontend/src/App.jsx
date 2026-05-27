import { useState } from 'react'
import './App.css'
import StatsPage from './components/statsPage'
import CachePage from './components/CachePage'
import ChatPage from './components/ChatPage'

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
