import { usePdfChat } from '../hooks/usePdfChat';
import UploadArea from '../components/pdfchat/UploadArea';
import ChatWindow from '../components/pdfchat/ChatWindow';

export default function PdfChatPage() {
  const {
    sessionId, isUploading, uploadError, messages, mode, textInput,
    isAsking, isSpeaking, isRecording, recordedBlob, fileName,
    setMode, setTextInput,
    handleUpload, handleAskText, handleSubmitSpeech,
    startRecording, stopRecording, handleReset,
  } = usePdfChat();

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 pt-8 pb-12">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-[#4f46e5]
          font-medium mb-2">
          Document Assistant
        </p>
        <h1 className="text-2xl font-bold text-[#f0f0ff] tracking-tight mb-1">
          PDF Chat
        </h1>
        <p className="text-sm text-[#8b8ba8]">
          Upload any PDF and ask questions by typing or speaking
        </p>
      </div>

      {/* Upload area — always visible */}
      <div className="mb-6">
        <UploadArea
          onFileSelect={handleUpload}
          isUploading={isUploading}
          uploadError={uploadError}
          fileName={fileName}
          onReset={handleReset}
        />
      </div>

      {/* Chat — only shown once PDF is uploaded and processed */}
      {sessionId && (
        <ChatWindow
          messages={messages}
          mode={mode}
          textInput={textInput}
          isAsking={isAsking}
          isSpeaking={isSpeaking}
          isRecording={isRecording}
          recordedBlob={recordedBlob}
          onModeChange={setMode}
          onTextChange={setTextInput}
          onAskText={handleAskText}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onSubmitSpeech={handleSubmitSpeech}
        />
      )}
    </div>
  );
}
