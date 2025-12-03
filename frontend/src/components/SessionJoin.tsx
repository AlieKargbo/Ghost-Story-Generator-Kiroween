import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSessionStore } from '../store/sessionStore';

function SessionJoin() {
  const [inviteLink, setInviteLink] = useState('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const { joinSession } = useWebSocket();
  const currentSession = useSessionStore((state) => state.currentSession);

  // Navigate to session view when session is joined
  useEffect(() => {
    if (currentSession) {
      navigate(`/session/${currentSession.id}`);
    }
  }, [currentSession, navigate]);

  const handleJoin = () => {
    if (!inviteLink.trim()) {
      alert('Please enter an invite link');
      return;
    }

    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }

    // Extract session ID from invite link
    // Expected format: http://domain/session/{sessionId} or just the sessionId
    const sessionIdMatch = inviteLink.match(/session\/([a-zA-Z0-9-]+)/);
    const sessionId = sessionIdMatch ? sessionIdMatch[1] : inviteLink.trim();

    if (sessionId) {
      joinSession(sessionId, userName);
    } else {
      alert('Invalid invite link format');
    }
  };

  return (
    <div className="session-join">
      <h2>Join Existing Story</h2>
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
        <label htmlFor="invite">Invite Link or Session ID:</label>
        <input
          id="invite"
          type="text"
          value={inviteLink}
          onChange={(e) => setInviteLink(e.target.value)}
          placeholder="Paste invite link or session ID..."
        />
      </div>
      <button onClick={handleJoin} className="btn-secondary">
        Join Story
      </button>
    </div>
  );
}

export default SessionJoin;
