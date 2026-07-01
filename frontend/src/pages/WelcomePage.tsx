import Sidebar from '../components/layout/Sidebar';

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 flex flex-col bg-black">
        <header className="px-4 lg:px-8 py-6 lg:py-8 border-b border-zinc-800/50">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-space font-bold text-3xl lg:text-5xl xl:text-6xl tracking-tight mb-3">
              <span className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] bg-clip-text text-transparent">
                Master Your Interview
              </span>
            </h1>
            <p className="text-gray-300 text-base lg:text-lg font-light">
              Ace Your Technical Interviews with AI-Powered Practice and Feedback
            </p>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-zinc-700/30 shadow-[0_0_30px_rgba(102,126,234,0.2)]">
              <i className="fas fa-microphone text-3xl lg:text-4xl text-zinc-400" />
            </div>
            <h2 className="font-space text-xl lg:text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-3">
              Ready to Practice?
            </h2>
            <p className="text-gray-400 text-sm lg:text-base">Select a topic from the sidebar to begin</p>
          </div>
        </div>
      </main>
    </div>
  );
}
