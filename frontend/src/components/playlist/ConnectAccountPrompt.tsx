import { useState } from 'react';

interface Props {
  isPolling: boolean;
  onConnect: (popupWindow?: Window | null) => void;
}

export default function ConnectAccountPrompt({ isPolling, onConnect }: Props) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    // We must open the popup SYNCHRONOUSLY here, inside the click handler
    // — that is the only moment the browser treats window.open as a
    // user gesture and allows it without blocking. We open the popup
    // immediately (with 'about:blank' as a safe placeholder) and let the
    // hook navigate it to the Pipedream URL once the connect token
    // request resolves.
    const popup = window.open(
      'about:blank',
      'pipedream_connect',
      'width=620,height=720,left=200,top=100,menubar=no,toolbar=no,location=no',
    );
    setClicked(true);
    onConnect(popup ?? undefined);
  };

  return (
    <div className="animate-fade-in flex flex-col items-center text-center space-y-6">
      {/* Icon */}
      <div
        className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
          boxShadow: '0 0 40px rgba(255,0,0,0.25)',
        }}
      >
        <i className="fab fa-youtube text-white text-3xl" />
        {!clicked && (
          <span
            className="absolute inset-0 rounded-2xl animate-ping opacity-30"
            style={{ background: 'rgba(255,0,0,0.4)' }}
          />
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Connect Your YouTube Account
        </h2>
        <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          To create the playlist on your account, we need to connect via
          Google OAuth. Your credentials are stored securely — we only
          request playlist creation permission.
        </p>
      </div>

      {/* Benefits list */}
      <div className="card w-full text-left space-y-3">
        {[
          { icon: 'fa-lock',     text: 'OAuth only — we never see your password' },
          { icon: 'fa-list',     text: 'Playlist created directly on your YouTube channel' },
          { icon: 'fa-eye-slash', text: 'Only playlist write scope is requested' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(79,70,229,0.15)' }}
            >
              <i className={`fas ${icon} text-xs`} style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {text}
            </span>
          </div>
        ))}
      </div>

      {/* CTA button */}
      {!clicked ? (
        <button
          id="btn-connect-youtube"
          onClick={handleClick}
          className="btn-primary w-full py-3 text-base font-semibold gap-2"
          style={{ boxShadow: '0 0 24px rgba(79,70,229,0.4)' }}
        >
          <i className="fab fa-youtube" />
          Connect YouTube Account
        </button>
      ) : (
        <div className="w-full space-y-4">
          <div
            className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <i className="fas fa-external-link-alt" />
            Sign-in popup opened — complete authorisation there
          </div>

          {isPolling && (
            <div
              className="flex items-center justify-center gap-2 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <i className="fas fa-spinner fa-spin" style={{ color: 'var(--accent)' }} />
              Waiting for connection…
            </div>
          )}

          <button
            id="btn-retry-connect"
            onClick={() => setClicked(false)}
            className="text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Didn't see the popup? Click here to try again
          </button>
        </div>
      )}
    </div>
  );
}
