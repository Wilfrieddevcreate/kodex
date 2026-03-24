"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface Props {
  botUsername: string;
  onSuccess?: () => void;
  size?: "large" | "medium" | "small";
}

export default function TelegramLoginWidget({ botUsername, onSuccess, size = "large" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Define the global callback
    (window as any).onTelegramAuth = async (user: TelegramUser) => {
      setConnecting(true);
      try {
        const res = await fetch("/api/user/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });

        if (res.ok) {
          toast.success("Telegram connected!");
          onSuccess?.();
        } else {
          const data = await res.json();
          toast.error(data.error || "Failed to connect Telegram");
        }
      } catch {
        toast.error("Connection failed");
      }
      setConnecting(false);
    };

    // Load the Telegram widget script
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?23";
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", size);
      script.setAttribute("data-userpic", "true");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      containerRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [botUsername, size, onSuccess]);

  if (connecting) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="h-5 w-5 border-2 border-[#2AABEE] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-[#2AABEE]">Connecting Telegram...</span>
      </div>
    );
  }

  return <div ref={containerRef} />;
}
