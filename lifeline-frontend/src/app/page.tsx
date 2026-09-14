"use client";

import Image from "next/image";
import "./page.css";
import BottomGlow from "@/components/BottomGlow/BottomGlow";
import ClockUI from "@/components/ClockUI/ClockUI";
import {
  ArrowRight,
  RotateCcw,
  Users,
  Clock,
  PhoneIncoming,
  PhoneOff,
  PhoneMissed,
} from "lucide-react";
import IncomingCall from "@/components/IncomingCall/IncomingCall";
import { useCallback, useEffect, useRef, useState } from "react";
import ActiveCall from "@/components/ActiveCall/ActiveCall";
import { Conversation } from "@elevenlabs/client";
import { motion, AnimatePresence } from "framer-motion";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

const DEFAULT_EMERGENCY_TEXT = `I'm having a really bad asthma attack right now. I'm struggling to breathe and my inhaler isn't helping much. I'm wheezing badly and finding it difficult to talk or even stand properly. I'm at 15 Marina Road, Lagos Island. Please send medical help as soon as possible.`;

type CallPerson = {
  name: string;
  durationMs?: number;
};

type OperationSummary = {
  totalPeopleCalled: number;
  pickedUp: CallPerson[];
  declined: CallPerson[];
  failed: CallPerson[];
  totalCallDurationMs: number;
};

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

const panelVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.98,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25 },
  },
  exit: {
    opacity: 0,
    x: 8,
    transition: { duration: 0.15 },
  },
};

function PersonSection({
  icon,
  label,
  people,
  accentClass,
}: {
  icon: React.ReactNode;
  label: string;
  people: CallPerson[];
  accentClass: string;
}) {
  return (
    <motion.div
      className={`section-card ${accentClass}`}
      variants={itemVariants as any}
    >
      <div className="section-header">
        <div className="section-heading">
          {icon}
          <span>{label}</span>
        </div>

        <span className="section-count">{people.length}</span>
      </div>

      <div className="person-list">
        <AnimatePresence initial={false}>
          {people.length > 0 ? (
            people.map((person, i) => (
              <motion.div
                key={`${person.name}-${i}`}
                className="person-row"
                variants={rowVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <span className="person-name">{person.name}</span>

                {person.durationMs !== undefined && (
                  <span className="person-duration">
                    {formatDuration(person.durationMs)}
                  </span>
                )}
              </motion.div>
            ))
          ) : (
            <motion.p
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              None
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function OperationSummaryPanel({
  summary,
  onReset,
}: {
  summary: OperationSummary;
  onReset: () => void;
}) {
  return (
    <motion.div
      className="operation-summary"
      variants={panelVariants as any}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <motion.div className="summary-topbar" variants={itemVariants as any}>
        <p className="summary-title">Operation Complete</p>

        <motion.button
          className="reset-button"
          onClick={onReset}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          <RotateCcw size={16} />
          Reset
        </motion.button>
      </motion.div>

      <div className="summary-stats-grid">
        <motion.div className="stat-card" variants={itemVariants as any}>
          <div className="stat-icon">
            <Users size={20} />
          </div>

          <div className="stat-text">
            <span className="stat-value">{summary.totalPeopleCalled}</span>

            <span className="stat-label">People called</span>
          </div>
        </motion.div>

        <motion.div className="stat-card" variants={itemVariants as any}>
          <div className="stat-icon">
            <Clock size={20} />
          </div>

          <div className="stat-text">
            <span className="stat-value">
              {formatDuration(summary.totalCallDurationMs)}
            </span>

            <span className="stat-label">Total call time</span>
          </div>
        </motion.div>
      </div>

      <div className="summary-sections-grid">
        <PersonSection
          icon={<PhoneIncoming size={16} />}
          label="Picked up"
          people={summary.pickedUp}
          accentClass="accent-success"
        />

        <PersonSection
          icon={<PhoneOff size={16} />}
          label="Declined"
          people={summary.declined}
          accentClass="accent-warning"
        />

        <PersonSection
          icon={<PhoneMissed size={16} />}
          label="Failed"
          people={summary.failed}
          accentClass="accent-danger"
        />
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [callState, setCallState] = useState<"idle" | "incoming" | "active">(
    "idle",
  );

  const [agentState, setAgentState] = useState<"idle" | "active">("idle");

  const [operation, setOperation] = useState<
    { status: string; message: string }[]
  >([]);

  const [operationSummary, setOperationSummary] =
    useState<OperationSummary | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  const [conversation, setConversation] = useState<any>(null);

  const [text, setText] = useState(DEFAULT_EMERGENCY_TEXT);

  const socketRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const acceptingRef = useRef(false);
  const conversationRef = useRef<any>(null);
  const operationListRef = useRef<HTMLDivElement | null>(null);

  const agentVariable = useRef<any>(null);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    const el = operationListRef.current;

    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [operation]);

  /*
   * WebSocket connection
   */
  useEffect(() => {
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;

      if (
        socketRef.current?.readyState === WebSocket.OPEN ||
        socketRef.current?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      console.log("Connecting to:", SOCKET_URL);

      const socket = new WebSocket(SOCKET_URL);

      socketRef.current = socket;

      socket.onopen = () => {
        console.log("LifeLine WebSocket connected");
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          console.log("WebSocket message:", message);

          if (message.type === "AGENT_STATUS") {
            setOperation((prev) => [
              ...prev,
              {
                status: message.status,
                message: message.message,
              },
            ]);
          }

          if (message.type === "CALL_STARTED") {
            setCallState("active");
          }

          if (message.type === "AGENT_ACTIVE") {
            setAgentState("active");
          }

          if (message.type === "START_CALL") {
            console.log("Incoming responder call:", message.data);

            sessionRef.current = message.session;
            agentVariable.current = message.data;

            setCallState("incoming");
          }

          if (message.type === "OPERATION_COMPLETE") {
            console.log("Operation complete:", message.summary);

            setOperationSummary(message.summary);
            setCallState("idle");
            acceptingRef.current = false;
          }
        } catch (error) {
          console.error("Invalid WebSocket message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("LifeLine WebSocket error:", error);
      };

      socket.onclose = (event) => {
        console.log(
          "LifeLine WebSocket disconnected",
          event.code,
          event.reason,
        );

        socketRef.current = null;
        setIsConnected(false);

        if (!isUnmounted) {
          retryTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      isUnmounted = true;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      if (
        socketRef.current &&
        socketRef.current.readyState !== WebSocket.CLOSED
      ) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }

      socketRef.current = null;
    };
  }, []);

  const sendMessage = useCallback((data: unknown) => {
    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify(data);

      console.log("Sending:", payload);

      socket.send(payload);
    } else {
      console.error(
        "Cannot send — socket not open. readyState:",
        socket?.readyState,
      );
    }
  }, []);

  const handleAgentTrigger = () => {
    const emergency = text.trim();

    if (!emergency) return;

    setOperation([]);
    setOperationSummary(null);

    sendMessage({
      type: "START_INCIDENT",
      emergency,
    });

    setAgentState("active");

    setOperation([
      {
        status: "INITIATING",
        message: "Launching agent",
      },
    ]);
  };

  const handleAccept = async () => {
    if (acceptingRef.current) {
      console.log("⚠️ CALL ALREADY BEING ACCEPTED");
      return;
    }

    acceptingRef.current = true;

    console.log("🔥 ACCEPT CALL");

    setCallState("active");

    sendMessage({
      type: "CALL_ACCEPTED",
    });

    try {
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      console.log("Microphone permission granted");

      if (!sessionRef.current) {
        console.error("No ElevenLabs session");

        acceptingRef.current = false;
        setCallState("idle");

        return;
      }

      const session = await Conversation.startSession({
        signedUrl: sessionRef.current,

        dynamicVariables: agentVariable.current,

        onConnect: () => {
          console.log("ElevenLabs connected");
          setCallState("active");
        },

        onDisconnect: () => {
          console.log("ElevenLabs disconnected");

          if (conversationRef.current) {
            handleEndCall();
          }
        },

        onError: (error) => {
          console.error("ElevenLabs error:", error);
          handleEndCall();
        },

        onModeChange: (mode) => {
          console.log("Agent mode:", mode.mode);
        },
      });

      conversationRef.current = session;
      setConversation(session);
    } catch (error) {
      console.error("Failed to start call:", error);

      acceptingRef.current = false;
      conversationRef.current = null;

      setConversation(null);
      setCallState("idle");

      sendMessage({
        type: "CALL_DECLINED",
      });
    }
  };

  const handleDecline = () => {
    console.log("❌ CALL DECLINED");

    setCallState("idle");

    acceptingRef.current = false;

    sessionRef.current = null;
    agentVariable.current = null;

    sendMessage({
      type: "CALL_DECLINED",
    });
  };

  const handleEndCall = async () => {
    const activeConversation = conversationRef.current;

    if (!activeConversation) {
      return;
    }

    conversationRef.current = null;

    setConversation(null);

    acceptingRef.current = false;

    sessionRef.current = null;
    agentVariable.current = null;

    /*
     * Returning to idle here is intentional.
     *
     * On mobile this makes the logs visible again.
     * On desktop it returns to the normal right-panel
     * operation view.
     */
    setCallState("idle");

    try {
      await activeConversation.endSession();
    } catch (error) {
      console.error("Error ending ElevenLabs session:", error);
    }

    sendMessage({
      type: "CALL_ENDED",
    });
  };

  const handleReset = () => {
    setOperation([]);
    setOperationSummary(null);

    setAgentState("idle");
    setCallState("idle");

    acceptingRef.current = false;
    conversationRef.current = null;

    setConversation(null);

    sessionRef.current = null;
    agentVariable.current = null;

    setText(DEFAULT_EMERGENCY_TEXT);
  };

  /*
   * These classes only affect mobile CSS.
   *
   * Desktop keeps exactly the same layout.
   */
  const mobileCallActive = callState === "incoming" || callState === "active";

  return (
    <div className={`home ${mobileCallActive ? "mobile-call-active" : ""}`}>
      <div className="main">
        {/* ==================================================
            LEFT PHONE PANEL
            Desktop: unchanged
            Mobile: only visible during calls
           ================================================== */}

        <div
          className={`left-panel ${
            mobileCallActive ? "mobile-call-visible" : ""
          }`}
        >
          <div className="phone-screen">
            {callState === "idle" ? (
              <ClockUI />
            ) : callState === "incoming" ? (
              <IncomingCall onAccept={handleAccept} onReject={handleDecline} />
            ) : (
              <ActiveCall onEnd={handleEndCall} />
            )}
          </div>

          <Image
            src="/phone.png"
            alt=""
            width={2189}
            height={4284}
            className=""
          />
        </div>

        {/* ==================================================
            RIGHT PANEL
            Desktop: unchanged
            Mobile:
            - input when idle
            - logs when active
            - hidden during call
           ================================================== */}

        <div
          className={`right-panel ${
            mobileCallActive ? "mobile-call-hidden" : ""
          }`}
        >
          {agentState === "idle" ? (
            <div className="input-wrapper">
              <div className="topBar">
                <p className="title">LifeLine</p>

                <p className="subtext">
                  AI Agent for emergency lifeline handling
                </p>
              </div>

              <p className="subtext">
                Write down your emergency. Let our AI agent call the right
                people for you
              </p>

              <textarea
                className="em-input"
                placeholder="Enter your emergency here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <button onClick={handleAgentTrigger} disabled={!isConnected}>
                {isConnected ? "Trigger Agent" : "Connecting..."}

                <ArrowRight />
              </button>
            </div>
          ) : (
            <div className="agent-action">
              <p className="big-text">Agent Operations</p>

              <AnimatePresence mode="wait">
                {operationSummary ? (
                  <OperationSummaryPanel
                    key="summary"
                    summary={operationSummary}
                    onReset={handleReset}
                  />
                ) : (
                  <motion.div
                    key="live-log"
                    className="operation-list"
                    ref={operationListRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {operation.map((data, i) => (
                      <div key={i} className="operation">
                        <div className="circle" />

                        <p className="status">{data.status}</p>

                        <p className="message">{data.message}</p>

                        <div className="line" />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <BottomGlow />
    </div>
  );
}
