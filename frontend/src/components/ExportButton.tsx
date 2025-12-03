import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useWebSocket } from '../hooks/useWebSocket';

type ExportFormat = 'text' | 'html';

function ExportButton() {
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const currentSession = useSessionStore((state) => state.currentSession);
  const { exportSession } = useWebSocket();

  const handleExport = async (format: ExportFormat) => {
    if (!currentSession) {
      setExportStatus('No active session to export');
      setTimeout(() => setExportStatus(null), 3000);
      return;
    }

    setIsExporting(true);
    setShowFormatMenu(false);
    setExportStatus('Preparing export...');

    try {
      // Export via WebSocket - the download will be handled by the event handler
      exportSession(currentSession.id, format);
      
      // Show success message
      setTimeout(() => {
        setExportStatus('Export complete!');
        setTimeout(() => setExportStatus(null), 2000);
      }, 500);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('Export failed. Please try again.');
      setTimeout(() => setExportStatus(null), 3000);
    } finally {
      // Reset after a short delay to allow the export to complete
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  return (
    <div className="export-button-container">
      <button onClick={() => setShowFormatMenu(!showFormatMenu)} disabled={isExporting} className="export-button">
        {isExporting ? 'Exporting...' : 'Export Story'}
      </button>

      {exportStatus && (
        <div className="export-status">
          {exportStatus}
        </div>
      )}

      {showFormatMenu && (
        <div className="format-menu">
          <button onClick={() => handleExport('text')} className="format-option">
            Plain Text (.txt)
          </button>
          <button onClick={() => handleExport('html')} className="format-option">
            HTML (.html)
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
