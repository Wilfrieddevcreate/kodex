"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerPushSubscription() {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("VAPID key not found");
        return false;
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    // Send subscription to backend
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    return res.ok;
  } catch (err) {
    console.error("Push registration error:", err);
    return false;
  }
}

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const permission = Notification.permission;

    // If already granted, silently register the push subscription
    if (permission === "granted") {
      registerPushSubscription();
      return;
    }

    // If denied, nothing to do
    if (permission === "denied") return;

    // If default, show the prompt (unless dismissed)
    const dismissed = localStorage.getItem("push-prompt-dismissed");
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleAllow() {
    setRegistering(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        const success = await registerPushSubscription();
        if (success) {
          // Show a test notification to confirm it works
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            registration.showNotification("Kodex", {
              body: "Notifications are now enabled! You'll receive alerts for new signals and news.",
              icon: "/assets/images/logo_kodex.png",
            });
          }
        }
      }
    } catch (err) {
      console.error("Push registration error:", err);
    }

    setRegistering(false);
    setShow(false);
  }

  function handleDismiss() {
    localStorage.setItem("push-prompt-dismissed", "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 animate-in slide-in-from-bottom-4">
      <div className="rounded-2xl border border-white/10 bg-[#141419] p-5 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">Enable notifications</h3>
            <p className="text-xs text-white/40 leading-relaxed mb-4">
              Get notified instantly when new trading signals and news are published.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleAllow}
                disabled={registering}
                className="btn-glow rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-hover disabled:opacity-50"
              >
                {registering ? "Enabling..." : "Allow"}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/40 transition-all hover:bg-white/5 hover:text-white/60"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
