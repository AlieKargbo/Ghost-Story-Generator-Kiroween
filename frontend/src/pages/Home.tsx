import SessionCreate from '../components/SessionCreate';
import SessionJoin from '../components/SessionJoin';

function Home() {
  return (
    <div className="home-container">
      <h1>Ghost Story Generator</h1>
      <p>Create collaborative ghost stories with friends and AI</p>
      <div className="home-actions">
        <SessionCreate />
        <SessionJoin />
      </div>
    </div>
  );
}

export default Home;
