
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, ChatHistory, AppMode } from './types';
import { sendMessageToGemini } from './services/geminiService';
import ChatBubble from './components/ChatBubble';
import FriendsLogo from './components/FriendsLogo';
import { GoogleGenAI, Modality } from '@google/genai';

// --- Audio Utilities ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Yo! I'm buddyfor_life. I've been upgraded. Now I can see your ugly photos, hear your whining in real-time, and think deeper than your middle-school poetry. What's up?",
      isRoast: true
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AppMode>('balanced');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Live Voice State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isLiveActive]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startLiveSession = async () => {
    if (isLiveActive) {
      sessionRef.current?.close();
      setIsLiveActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg) => {
            const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioBase64) {
              const outCtx = audioContextsRef.current!.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioBase64), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: (e) => console.error("Live API Error:", e)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are buddyfor_life in voice form. Be comic, roast the user's stress, but keep it flowing and natural. Speak with a witty and slightly sarcastic but warm tone.",
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      });

      sessionRef.current = await sessionPromise;
      setIsLiveActive(true);
    } catch (err) {
      console.error("Failed to start Live API:", err);
      alert("Microphone access denied or Live API failed. Check your life choices.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const currentImage = selectedImage;
    const currentInput = input;
    
    const userMessage: Message = { 
      role: 'user', 
      content: currentInput || (currentImage ? "Look at this image..." : ""),
      image: currentImage || undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const history: ChatHistory[] = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await sendMessageToGemini(currentInput, history, mode, currentImage || undefined);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        sources: response.sources,
        isRoast: response.isRoast,
        image: response.image
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Error 404: My patience not found. Actually, the API just choked. Try again.",
        isRoast: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Dynamic Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-20 gap-4">
        <div className="flex items-center gap-4">
          <FriendsLogo />
          <div>
            <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-slate-400 uppercase">buddyfor_life</h1>
            <p className="text-[10px] text-indigo-400/80 uppercase tracking-[0.3em] font-bold">The Existential Upgrade</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
          {(['fast', 'balanced', 'thinking'] as AppMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                mode === m 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button 
          onClick={startLiveSession}
          className={`flex items-center gap-2 px-5 py-2 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
            isLiveActive 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isLiveActive ? (
            <><div className="w-2 h-2 bg-white rounded-full" /> Stop Live</>
          ) : (
            <><svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/><path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/></svg> Live Voice</>
          )}
        </button>
      </header>

      {/* Main Chat Area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-12 py-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map((msg, idx) => (
            <div key={idx} className={`animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              {msg.image && (
                <div className={`flex w-full mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <img src={msg.image} className="max-w-[300px] rounded-2xl border-2 border-white/10 shadow-2xl" alt="Gemini Content" />
                </div>
              )}
              <ChatBubble message={msg} />
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-6">
              <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-6 border border-white/5 shadow-2xl">
                <div className="flex gap-3">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* UI Overlay for Live Mode */}
      {isLiveActive && (
        <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-64 h-64 bg-indigo-600/10 rounded-full animate-ping opacity-20" />
          <div className="absolute bottom-32 bg-slate-900/90 border border-white/10 px-6 py-3 rounded-full backdrop-blur-xl pointer-events-auto">
            <span className="text-indigo-400 font-bold uppercase tracking-[0.4em] text-xs">Listening...</span>
          </div>
        </div>
      )}

      {/* Footer / Input */}
      <footer className="p-6 bg-slate-900/90 backdrop-blur-2xl border-t border-white/5">
        <div className="max-w-4xl mx-auto space-y-4">
          {selectedImage && (
            <div className="relative inline-block animate-in zoom-in-95">
              <img src={selectedImage} className="w-20 h-20 object-cover rounded-xl border-2 border-indigo-500" alt="Preview" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
              >
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
              </button>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="relative group">
            <label className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-white transition-colors">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'thinking' ? "Ask something deep and prepare to get roasted..." : "Roast me or ask me facts..."}
              className="w-full bg-slate-950 border border-white/10 text-slate-100 pl-14 pr-16 py-5 rounded-3xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-2xl placeholder:text-slate-600 font-medium"
            />
            
            <button
              type="submit"
              disabled={(!input.trim() && !selectedImage) || isLoading}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-3.5 rounded-2xl transition-all ${
                (!input.trim() && !selectedImage) || isLoading 
                  ? 'text-slate-700' 
                  : 'text-white bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/20 active:scale-95'
              }`}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default App;
