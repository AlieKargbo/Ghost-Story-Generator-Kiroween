import type { Participant } from '../../../shared/types';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSessionStore } from '../store/sessionStore';

interface ParticipantListProps {
  participants: Participant[];
}

function ParticipantList({ participants }: ParticipantListProps) {
  const { generateInviteLink } = useWebSocket();
  const currentSession = useSessionStore((state) => state.currentSession);

  const formatJoinTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleGenerateInvite = () => {
    if (currentSession) {
      generateInviteLink(currentSession.id);
    }
  };

  return (
    <div className="participant-list">
      <h3>Participants ({participants.length})</h3>
      <button onClick={handleGenerateInvite} className="invite-button" title="Generate and copy invite link">
        📋 Invite Others
      </button>
      <ul className="participants">
        {participants.map((participant) => (
          <li key={participant.id} className="participant-item">
            <span className="participant-name">{participant.name}</span>
            <span className="participant-joined" title={`Joined at ${formatJoinTime(participant.joinedAt)}`}>
              {formatJoinTime(participant.joinedAt)}
            </span>
          </li>
        ))}
      </ul>
      {participants.length === 0 && <p className="no-participants">No participants yet</p>}
    </div>
  );
}

export default ParticipantList;
