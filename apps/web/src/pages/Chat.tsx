import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useVoice } from "@/hooks/useVoice";
import { useMemory } from "@/hooks/useMemory";
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
  const { messages, loading, sendMessage, module, setModule } = useChat();
  const voice = useVoice();
  const memory = useMemory();

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
    <main className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[300px_1fr]">
      <aside className="hidden space-y-4 lg:block">
        <ConversationList />
        <ProfilePanel session={session} onLogout={logout} />
        <section className="glass-card rounded-2xl p-4">
          <h3 className="font-display text-2xl">Memory</h3>
          <div className="mt-3 space-y-2 text-sm text-text-secondary">
            {memory.data?.facts?.length ? (
              memory.data.facts.slice(0, 6).map((fact) => <p key={`${fact.key}:${fact.value}`}>{fact.key}: {fact.value}</p>)
            ) : (
              <p className="text-text-muted">Lubna is getting to know you.</p>
            )}
          </div>
        </section>
      </aside>

      <section className="glass-card flex min-h-[85vh] flex-col rounded-3xl p-4 md:p-5">
        <header className="mb-4 flex items-center justify-between border-b border-accent-rose/15 pb-4">
          <div className="flex items-center gap-3">
            <RoseAvatar />
            <div>
              <h1 className="font-display text-3xl leading-none">Lubna</h1>
              <p className="text-sm text-text-secondary">Your AI bestie who always has your back</p>
            </div>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
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

        <ChatWindow messages={messages} loading={loading} />
        <div className="mt-4">
          <InputBar
            onSend={sendMessage}
            voiceActive={voice.isListening}
            onVoiceToggle={() => (voice.isListening ? voice.stop() : voice.start())}
            liveTranscript={voice.transcript}
          />
        </div>
      </section>

      {voice.isListening && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/95"
          onClick={voice.stop}
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
