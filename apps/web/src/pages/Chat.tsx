import { Navigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useVoice } from "@/hooks/useVoice";
import { useSpeech } from "@/hooks/useSpeech";
import { useConversations } from "@/hooks/useConversationHistory";
import ChatWindow from "@/components/Chat/ChatWindow";
import InputBar from "@/components/Chat/InputBar";
import ConversationList from "@/components/Sidebar/ConversationList";
import ProfilePanel from "@/components/Sidebar/ProfilePanel";
import KeySetup from "@/components/Onboarding/KeySetup";
import LubnaAvatar from "@/components/LubnaAvatar";
import { getUserProfile, updateUserPreferences } from "@/lib/gemini";
import { MODULE_LABELS } from "@lubna/shared/constants";
import type { AppModule } from "@lubna/shared/types";

export default function ChatPage() {
  const { session, loading: authLoading, logout } = useAuth();
  const { messages, loading, sendMessage, module, setModule, conversationId, loadConversation, startNewChat } = useChat();
  const voice = useVoice();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: getUserProfile,
    enabled: Boolean(session)
  });
  const speech = useSpeech({
    userLocale: profileQuery.data?.prefs.language && profileQuery.data.prefs.language !== "auto" ? profileQuery.data.prefs.language : navigator.language,
    voiceId: profileQuery.data?.prefs.voiceId ?? null
  });
  const conversationsQuery = useConversations();
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lastSpokenIdRef = useRef<string | null>(null);

  const prefsMutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    }
  });

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages]
  );

  const handleVoiceStopAndSend = async () => {
    speech.stop();
    const spoken = (await voice.stop()).trim();
    if (spoken) {
      await sendMessage(spoken);
      voice.clearTranscript();
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    speech.stop();
    await sendMessage(prompt);
    setSidebarOpen(false);
  };

  const handleConversationSelect = async (selectedConversationId?: string) => {
    speech.stop();
    await loadConversation(selectedConversationId);
    setSidebarOpen(false);
  };

  const handleNewChat = async () => {
    speech.stop();
    await startNewChat();
    setSidebarOpen(false);
  };

  const handleSpeakMessage = (message: (typeof messages)[number]) => {
    if (message.role !== "assistant") return;
    void speech.speak(message.content);
    lastSpokenIdRef.current = message.id;
  };

  const handleStopSpeaking = () => {
    speech.stop();
  };

  useEffect(() => {
    if (!latestAssistantMessage) return;
    if (latestAssistantMessage.id === lastSpokenIdRef.current) return;
    if (loading) return;
    if (voice.isListening) return;
    if (!autoSpeak) return;
    if (!speech.isSupported) return;
    void speech.speak(latestAssistantMessage.content);
    lastSpokenIdRef.current = latestAssistantMessage.id;
  }, [latestAssistantMessage, loading, speech, voice.isListening, autoSpeak]);

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  if (!session) return <Navigate to="/" replace />;

  const showKeySetup = window.location.search.includes("needs_access=1");

  if (showKeySetup) {
    return <KeySetup onGrantAccess={() => window.open("https://aistudio.google.com/apikey", "_blank")} />;
  }

  const moduleKeys: AppModule[] = ["fashion", "relationships", "health", "career"];
  const showSidebarPrompts = messages.length === 0 && !conversationId;

  return (
    <main className="mx-auto flex h-[100dvh] max-w-[1600px] gap-4 px-3 py-3 md:px-4">
      <div className="relative hidden h-full w-[320px] shrink-0 lg:block">
        <aside className="flex h-full flex-col gap-4">
          <div className="min-h-0 flex-1">
            <ConversationList
              conversations={conversationsQuery.data?.conversations ?? []}
              activeConversationId={conversationId}
              onSelectConversation={handleConversationSelect}
              onNewChat={handleNewChat}
              onSelectPrompt={handleQuickPrompt}
              showQuickPrompts={showSidebarPrompts}
            />
          </div>
          <ProfilePanel session={session} onLogout={logout} />
        </aside>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/55 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <aside
            className="h-full w-[88vw] max-w-[340px] p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col gap-4">
              <div className="min-h-0 flex-1">
                <ConversationList
                  conversations={conversationsQuery.data?.conversations ?? []}
                  activeConversationId={conversationId}
                  onSelectConversation={handleConversationSelect}
                  onNewChat={handleNewChat}
                  onSelectPrompt={handleQuickPrompt}
                  showQuickPrompts={showSidebarPrompts}
                />
              </div>
              <ProfilePanel session={session} onLogout={logout} />
            </div>
          </aside>
        </div>
      )}

      <section className="chat-main glass-card min-w-0 flex-1 rounded-[32px] px-4 py-4 md:px-5 md:py-5">
        <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-accent-rose/15 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-accent-rose/15 bg-bg-elevated text-text-primary lg:hidden"
              aria-label="Open sidebar"
            >
              <span className="space-y-1">
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
              </span>
            </button>
            <LubnaAvatar size={48} />
            <div>
              <h1 className="text-2xl font-semibold leading-none tracking-tight md:text-3xl">Lubna</h1>
              <p className="text-sm text-text-secondary">Your AI bestie who always has your back</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-full border border-accent-rose/15 bg-bg-elevated px-3 py-2 text-xs uppercase tracking-[0.14em] text-text-secondary">
              <span>Voice</span>
              <select
                value={profileQuery.data?.prefs.voiceId ?? ""}
                onChange={(event) => {
                  void prefsMutation.mutateAsync({ voiceId: event.target.value || null });
                }}
                className="max-w-[180px] bg-transparent text-[11px] uppercase tracking-[0.14em] text-text-primary outline-none"
              >
                <option value="">Auto</option>
                {speech.voices.map((voiceOption) => (
                  <option key={voiceOption.voiceURI} value={voiceOption.voiceURI}>
                    {voiceOption.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={speech.stop}
              className="rounded-full border border-accent-rose/20 bg-bg-elevated px-3 py-2 text-xs uppercase tracking-[0.18em] text-text-secondary transition hover:border-accent-rose/40 hover:text-text-primary"
            >
              Stop voice
            </button>
            <span className="rounded-full border border-accent-rose/15 bg-bg-elevated px-3 py-2 text-xs uppercase tracking-[0.18em] text-text-muted">
              {speech.isSpeaking ? "Speaking" : "Voice idle"}
            </span>
          </div>
        </header>

        <div className="mb-4 flex shrink-0 flex-wrap gap-2">
          {moduleKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setModule(key)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                module === key ? "bg-accent-rose text-bg-primary" : "border border-accent-rose/25 bg-bg-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              {MODULE_LABELS[key]}
            </button>
          ))}
        </div>

        <ChatWindow
          messages={messages}
          loading={loading}
          onSpeakMessage={handleSpeakMessage}
          onStopSpeaking={handleStopSpeaking}
          speakingMessageId={speech.isSpeaking ? lastSpokenIdRef.current ?? undefined : undefined}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={() => setAutoSpeak((value) => !value)}
          onQuickPrompt={handleQuickPrompt}
        />

        <div className="input-area mt-4">
          <InputBar
            onSend={sendMessage}
            voiceActive={voice.isListening}
            onVoiceToggle={() => {
              if (voice.isListening) {
                void handleVoiceStopAndSend();
                return;
              }
              speech.stop();
              void voice.start();
            }}
            liveTranscript={voice.transcript}
          />
        </div>
      </section>

      {voice.isListening && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/95"
          onClick={() => {
            void handleVoiceStopAndSend();
          }}
        >
          <span className="h-40 w-40 animate-pulseRose rounded-full bg-gradient-to-br from-accent-gold to-accent-rose shadow-glow" />
          <p className="mt-8 max-w-lg px-6 text-center text-lg text-text-secondary">
            {voice.transcript || "Listening... tap anywhere to end voice mode"}
          </p>
        </button>
      )}
    </main>
  );
}
