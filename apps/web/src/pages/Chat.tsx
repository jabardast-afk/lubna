import { Navigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useVoice } from "@/hooks/useVoice";
import { useSpeech } from "@/hooks/useSpeech";
import { useMemory } from "@/hooks/useMemory";
import { useConversations } from "@/hooks/useConversationHistory";
import ChatWindow from "@/components/Chat/ChatWindow";
import InputBar from "@/components/Chat/InputBar";
import ConversationList from "@/components/Sidebar/ConversationList";
import ProfilePanel from "@/components/Sidebar/ProfilePanel";
import KeySetup from "@/components/Onboarding/KeySetup";
import { MODULE_LABELS } from "@lubna/shared/constants";
import type { AppModule } from "@lubna/shared/types";

function RoseAvatar() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-rose/30 bg-bg-elevated text-accent-gold">
      ✦
    </div>
  );
}

export default function ChatPage() {
  const { session, loading: authLoading, logout } = useAuth();
  const { messages, loading, sendMessage, module, setModule, conversationId, loadConversation, startNewChat } = useChat();
  const voice = useVoice();
  const speech = useSpeech();
  const memory = useMemory();
  const conversationsQuery = useConversations();
  const [autoSpeak, setAutoSpeak] = useState(() => {
    const stored = window.localStorage.getItem("lubna_auto_speak");
    return stored ? stored === "true" : false;
  });
  const lastSpokenIdRef = useRef<string | null>(null);

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
  };

  const handleConversationSelect = async (selectedConversationId?: string) => {
    speech.stop();
    await loadConversation(selectedConversationId);
  };

  const handleNewChat = () => {
    speech.stop();
    startNewChat();
  };

  const handleSpeakMessage = (message: (typeof messages)[number]) => {
    if (message.role !== "assistant") return;
    speech.speak(message.content);
    lastSpokenIdRef.current = message.id;
  };

  const handleStopSpeaking = () => {
    speech.stop();
  };

  useEffect(() => {
    window.localStorage.setItem("lubna_auto_speak", String(autoSpeak));
  }, [autoSpeak]);

  useEffect(() => {
    if (!latestAssistantMessage) return;
    if (latestAssistantMessage.id === lastSpokenIdRef.current) return;
    if (loading) return;
    if (voice.isListening) return;
    if (!autoSpeak) return;
    if (!speech.isSupported) return;
    speech.speak(latestAssistantMessage.content);
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

  return (
    <main className="mx-auto grid h-[100dvh] max-h-[100dvh] max-w-7xl grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[320px_1fr]">
      <aside className="hidden h-full flex-col gap-4 overflow-hidden lg:flex">
        <ConversationList
          conversations={conversationsQuery.data?.conversations ?? []}
          activeConversationId={conversationId}
          onSelectConversation={handleConversationSelect}
          onNewChat={handleNewChat}
          onSelectPrompt={handleQuickPrompt}
        />
        <ProfilePanel session={session} onLogout={logout} />
        <section className="glass-card flex-1 overflow-hidden rounded-2xl p-4">
          <h3 className="font-display text-2xl">Memory</h3>
          <div className="mt-3 max-h-[28vh] space-y-2 overflow-y-auto pr-1 text-sm text-text-secondary">
            {memory.data?.facts?.length ? (
              memory.data.facts.slice(0, 6).map((fact) => <p key={`${fact.key}:${fact.value}`}>{fact.key}: {fact.value}</p>)
            ) : (
              <p className="text-text-muted">Lubna is getting to know you.</p>
            )}
          </div>
        </section>
      </aside>

      <section className="glass-card flex h-full min-h-0 flex-col rounded-3xl p-4 md:p-5">
        <header className="mb-4 flex shrink-0 items-center justify-between border-b border-accent-rose/15 pb-4">
          <div className="flex items-center gap-3">
            <RoseAvatar />
            <div>
              <h1 className="font-display text-3xl leading-none">Lubna</h1>
              <p className="text-sm text-text-secondary">Your AI bestie who always has your back</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="min-h-0 flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            loading={loading}
            onSpeakMessage={handleSpeakMessage}
            onStopSpeaking={handleStopSpeaking}
            speakingMessageId={speech.isSpeaking ? lastSpokenIdRef.current ?? undefined : undefined}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={() => setAutoSpeak((value) => !value)}
          />
        </div>
        <div className="mt-4 shrink-0">
          <InputBar
            onSend={sendMessage}
            voiceActive={voice.isListening}
            onVoiceToggle={() => {
              if (voice.isListening) {
                handleVoiceStopAndSend();
                return;
              }
              speech.stop();
              voice.start();
            }}
            liveTranscript={voice.transcript}
          />
        </div>
      </section>

      {voice.isListening && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/95"
          onClick={handleVoiceStopAndSend}
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
