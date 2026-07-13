import { useState } from 'react';
import { usePdfChat } from '../hooks/usePdfChat';
import { usePdfChatHistory } from '../hooks/useHistory';
import PdfTabBar  from '../components/pdfchat/PdfTabBar';
import UploadArea from '../components/pdfchat/UploadArea';
import ChatWindow from '../components/pdfchat/ChatWindow';
import HistoryPanel from '../components/history/HistoryPanel';
import PdfChatHistoryCard from '../components/history/PdfChatHistoryCard';
import HistoryEmpty from '../components/history/HistoryEmpty';

export default function PdfChatPage() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { entries, deleteEntry } = usePdfChatHistory();
  const {
    tabs, activeThreadId, activeTab,
    showUploadPanel, isUploading, uploadError,
    mode, textInput, isAsking, isSpeaking, isPaused, isRecording, recordedBlob,
    setMode, setTextInput,
    handleUpload, handleSelectTab, handleCloseTab, handleShowUploadPanel,
    handleAskText, handleSubmitSpeech,
    startRecording, stopRecording,
    pauseAudio, resumeAudio, stopAudio,
    markMessageStreamingComplete,
  } = usePdfChat();

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-12">

      {/* Page header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#4f46e5]
            font-medium mb-1">
            Document Assistant
          </p>
          <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight">
            PDF Chat
          </h1>
          <p className="text-sm text-[#8b8ba8] mt-1">
            Upload PDFs and chat with each one independently
          </p>
        </div>
        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
            border border-[#2a2a3d] hover:border-[#4f46e5]
            text-[#8b8ba8] hover:text-[#f0f0ff] text-sm font-medium
            transition-all duration-200"
        >
          <i className="fas fa-history" />
          History
          {entries.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-md bg-[#4f46e5]/20
              border border-[#4f46e5]/30 text-[#4f46e5] text-xs font-semibold">
              {entries.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab bar — always visible */}
      <PdfTabBar
        tabs={tabs}
        activeThreadId={activeThreadId}
        showUploadPanel={showUploadPanel}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onAddPdf={handleShowUploadPanel}
      />

      {/* Panel below the tab bar */}
      <div className="border border-t-0 border-[#2a2a3d] rounded-b-2xl
        rounded-tr-2xl bg-[#13131a] p-5 flex flex-col gap-5">

        {/* Upload area — shown when showUploadPanel is true */}
        {showUploadPanel && (
          <UploadArea
            onFileSelect={handleUpload}
            isUploading={isUploading}
            uploadError={uploadError}
            fileName={null}
            onReset={() => {}}
          />
        )}

        {/* Empty state — no tabs yet and upload panel is closed */}
        {tabs.length === 0 && !showUploadPanel && (
          <div className="flex flex-col items-center justify-center
            py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#1c1c27]
              border border-[#2a2a3d] flex items-center justify-center">
              <i className="fas fa-file-pdf text-[#4f46e5] text-2xl" />
            </div>
            <p className="text-sm font-semibold text-[#f0f0ff]">
              No PDFs open
            </p>
            <p className="text-xs text-[#8b8ba8]">
              Click <span className="text-[#4f46e5] font-medium">+ Add PDF</span>
              {' '}above to get started
            </p>
          </div>
        )}

        {/* Chat window — shown when a tab is active */}
        {activeTab && !showUploadPanel && (
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
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onSubmitSpeech={handleSubmitSpeech}
            onPauseAudio={pauseAudio}
            onResumeAudio={resumeAudio}
            onStopAudio={stopAudio}
            onStreamingComplete={(msgId) => {
              if (activeTab.threadId) {
                markMessageStreamingComplete(activeTab.threadId, msgId);
              }
            }}
          />
        )}
      </div>

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="PDF Chat History"
      >
        {entries.length === 0 ? (
          <HistoryEmpty message="Close a PDF chat session to see it in history." />
        ) : (
          entries.map((entry) => (
            <PdfChatHistoryCard
              key={entry.id}
              entry={entry}
              onDelete={deleteEntry}
            />
          ))
        )}
      </HistoryPanel>
    </div>
  );
}
