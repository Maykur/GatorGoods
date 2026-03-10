import logo from './logo.svg';
import { SignUp } from "./pages/signup"
import { DashBoard } from "./pages/dashboard"
import { HashRouter as Router, Routes, Route} from 'react-router-dom'
import './App.css';

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/" element={<SignUp/>}/>
          <Route path="/home" element={<DashBoard/>}/>
        </Routes>
    </Router>
  );
}

export default App;
