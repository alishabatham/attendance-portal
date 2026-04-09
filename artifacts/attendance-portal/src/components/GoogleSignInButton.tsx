import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            }
          ) => void;
        };
      };
    };
  }
}

interface Props {
  onCredential: (credential: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function GoogleSignInButton({ onCredential, text = "signin_with" }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID || !buttonRef.current) return;

    function init() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: (response) => {
          onCredential(response.credential);
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: buttonRef.current.offsetWidth || 400,
        text,
        shape: "rectangular",
      });
    }

    if (window.google) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          init();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [onCredential, text]);

  if (!CLIENT_ID) return null;

  return (
    <div className="w-full">
      <div className="relative flex items-center my-4">
        <div className="flex-grow border-t border-border" />
        <span className="mx-3 text-xs text-muted-foreground">or</span>
        <div className="flex-grow border-t border-border" />
      </div>
      <div ref={buttonRef} className="w-full flex justify-center" />
    </div>
  );
}
