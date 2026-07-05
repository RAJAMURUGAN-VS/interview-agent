import { usePdfChat } from '../hooks/usePdfChat';
import PdfTabBar  from '../components/pdfchat/PdfTabBar';
import UploadArea from '../components/pdfchat/UploadArea';
import ChatWindow from '../components/pdfchat/ChatWindow';

export default function PdfChatPage() {
  const {
    tabs, activeThreadId, activeTab,
    showUploadPanel, isUploading, uploadError,
    mode, textInput, isAsking, isSpeaking, isPaused, isRecording, recordedBlob,
    setMode, setTextInput,
    handleUpload, handleSelectTab, handleCloseTab, handleShowUploadPanel,
    handleAskText, handleSubmitSpeech,
    startRecording, stopRecording,
    pauseAudio, resumeAudio, stopAudio,
  } = usePdfChat();

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 pt-8 pb-12">

      {/* Page header */}
      <div className="mb-4">
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
          />
        )}
      </div>
    </div>
  );
}
