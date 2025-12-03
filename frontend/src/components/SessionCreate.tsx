import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSessionStore } from '../store/sessionStore';

function SessionCreate() {
  const [title, setTitle] = useState('');
  const [startingPrompt, setStartingPrompt] = useState('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const { createSession } = useWebSocket();
  const currentSession = useSessionStore((state) => state.currentSession);

  // Navigate to session view when session is created
  useEffect(() => {
    if (currentSession) {
      navigate(`/session/${currentSession.id}`);
    }
  }, [currentSession, navigate]);

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('Please enter a story title');
      return;
    }

    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }

    // Create session via WebSocket
    createSession(title, userName, startingPrompt || undefined);
  };

  return (
    <div className="session-create">
      <h2>Create New Story</h2>
      <div className="form-group">
        <label htmlFor="userName">Your Name:</label>
        <input
          id="userName"
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter your name..."
          maxLength={50}
        />
      </div>
      <div className="form-group">
        <label htmlFor="title">Story Title:</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a spooky title..."
          maxLength={100}
        />
      </div>
      <div className="form-group">
        <label htmlFor="prompt">Starting Prompt (optional):</label>
        <textarea
          id="prompt"
          value={startingPrompt}
          onChange={(e) => setStartingPrompt(e.target.value)}
          placeholder="Once upon a midnight dreary..."
          maxLength={500}
          rows={4}
        />
      </div>
      <button onClick={handleCreate} className="btn-primary">
        Create Story
      </button>
    </div>
  );
}

export default SessionCreate;
