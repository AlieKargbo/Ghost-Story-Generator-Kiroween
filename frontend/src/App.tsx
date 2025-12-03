import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import SessionView from './pages/SessionView';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session/:sessionId" element={<SessionView />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
