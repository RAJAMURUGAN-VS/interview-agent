/**
 * GoogleSignInButton.tsx — thin wrapper around @react-oauth/google's GoogleLogin.
 *
 * Uses filled_black theme and pill shape to match the app's dark aesthetic.
 * The parent (LoginPage) handles what to do after success or failure.
 */

import { GoogleLogin } from "@react-oauth/google";

interface Props {
  onSuccess: (credential: string) => void;
  onError: () => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ onSuccess, onError, disabled }: Props) {
  return (
    <div style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <GoogleLogin
        onSuccess={(res) => {
          if (res.credential) onSuccess(res.credential);
          else onError();
        }}
        onError={onError}
        theme="filled_black"
        shape="pill"
        size="large"
        text="continue_with"
        locale="en"
      />
    </div>
  );
}
