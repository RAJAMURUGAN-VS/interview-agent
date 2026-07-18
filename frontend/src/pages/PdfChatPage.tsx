import { useState }             from 'react';
import { usePdfChatContext }     from '../context/PdfChatContext';
import { useLivePdfChatHistory } from '../hooks/useHistory';
import PdfTabBar                 from '../components/pdfchat/PdfTabBar';
import UploadArea                from '../components/pdfchat/UploadArea';
import ChatWindow                from '../components/pdfchat/ChatWindow';
import PdfChatSidebar            from '../components/pdfchat/PdfChatSidebar';

export default function PdfChatPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { closedEntries, deleteClosedEntry } = useLivePdfChatHistory();

  const {
    tabs, activeThreadId, activeTab,
    showUploadPanel, uploadProgress,
    mode, textInput, isAsking, isSpeaking, isPaused, isRecording, recordedBlob,
    setMode, setTextInput,
    handleUpload, handleSelectTab, handleCloseTab, handleShowUploadPanel,
    handleAskText, handleSubmitSpeech,
    startRecording, stopRecording,
    pauseAudio, resumeAudio, stopAudio,
    markMessageStreamingComplete,
    restoreFromHistory,
  } = usePdfChatContext();

  return (
    <div
      className="animate-fade-in flex"
      style={{ minHeight: 'calc(100vh - 64px)' }}
    >
      {/* ── Left sidebar: Chat History ────────────────────────────────── */}
      <PdfChatSidebar
        closedEntries={closedEntries}
        onDeleteClosed={deleteClosedEntry}
        onRestoreEntry={restoreFromHistory}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 px-4 sm:px-6 pt-8 pb-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* Page header */}
          <div className="mb-4">
            <p className="text-xs uppercase tracking-widest text-[#4f46e5] font-medium mb-1">
              Document Assistant
            </p>
            <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight">PDF Chat</h1>
            <p className="text-sm text-[#8b8ba8] mt-1">
              Upload PDFs and chat with each one independently
            </p>
          </div>

          {/* Tab bar */}
          <PdfTabBar
            tabs={tabs}
            activeThreadId={activeThreadId}
            showUploadPanel={showUploadPanel}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onAddPdf={handleShowUploadPanel}
          />

          {/* Panel */}
          <div
            className="border border-t-0 border-[#2a2a3d] rounded-b-2xl
              rounded-tr-2xl bg-[#13131a] p-5 flex flex-col gap-5"
          >
            {/* Upload area — shown when uploading OR when showUploadPanel is true */}
            {(showUploadPanel || uploadProgress.active) && (
              <UploadArea
                onFileSelect={handleUpload}
                isUploading={uploadProgress.active}
                uploadError={uploadProgress.error}
                fileName={uploadProgress.active ? uploadProgress.fileName : null}
                onReset={() => {}}
                uploadStage={uploadProgress.stage}
                uploadMessage={uploadProgress.message}
                uploadPct={uploadProgress.progress}
              />
            )}

            {/* Chat window */}
            {activeTab && !showUploadPanel && !uploadProgress.active && (
              <ChatWindow
                messages={activeTab.messages}
                mode={mode}
                textInput={textInput}
                isAsking={isAsking}
                isSpeaking={isSpeaking}
                isPaused={isPaused}
                isRecording={isRecording}
                recordedBlob={recordedBlob}
                onModeChange={setMode}
                onTextChange={setTextInput}
                onAskText={handleAskText}
                onSubmitSpeech={handleSubmitSpeech}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onPauseAudio={pauseAudio}
                onResumeAudio={resumeAudio}
                onStopAudio={stopAudio}
                onStreamingComplete={(msgId) =>
                  markMessageStreamingComplete(activeTab.threadId, msgId)
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
