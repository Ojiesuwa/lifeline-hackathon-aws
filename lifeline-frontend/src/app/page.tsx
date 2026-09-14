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

/*
 * Format milliseconds into a readable duration.
 * Pulled out of the component so it can be reused
 * without depending on component state/closures.
 */
const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
};

/*
 * Animation variants for the summary panel container
 * and its children (staggered entrance).
 */
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
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 8, transition: { duration: 0.15 } },
};

/*
 * A single "picked up / declined / failed" section card.
 */
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

/*
 * The full operation summary panel. Replaces the live
 * operation-list once the backend reports completion.
 */
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

  /*
   * Keep conversation in a ref as well as state.
   * This prevents stale state inside onDisconnect/onError.
   */
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

          /*
           * Agent status update
           */
          if (message.type === "AGENT_STATUS") {
            setOperation((prev) => [
              ...prev,
              {
                status: message.status,
                message: message.message,
              },
            ]);
          }

          /*
           * Call started
           */
          if (message.type === "CALL_STARTED") {
            setCallState("active");
          }

          /*
           * Agent became active
           */
          if (message.type === "AGENT_ACTIVE") {
            setAgentState("active");
          }

          /*
           * Lifeline wants to call a responder.
           *
           * Every call gets a new START_CALL message.
           */
          if (message.type === "START_CALL") {
            console.log("Incoming responder call:", message.data);

            sessionRef.current = message.session;
            agentVariable.current = message.data;

            setCallState("incoming");
          }

          /*
           * Entire emergency operation has finished.
           */
          if (message.type === "OPERATION_COMPLETE") {
            console.log("Operation complete:", message.summary);

            setOperationSummary(message.summary);
            console.log(message.summary);
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
          console.log("Retrying WebSocket connection in 3 seconds...");

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

  /*
   * Send message through WebSocket.
   */
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

  /*
   * Start a new emergency operation.
   */
  const handleAgentTrigger = () => {
    const emergency = text.trim();

    if (!emergency) return;

    /*
     * Clear previous operation data.
     */
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

  /*
   * Accept an incoming responder call.
   */
  const handleAccept = async () => {
    /*
     * Prevent duplicate acceptance.
     */
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
      /*
       * Ask browser for microphone permission.
       */
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      console.log("Microphone permission granted");

      /*
       * Make sure we have a current ElevenLabs session.
       */
      if (!sessionRef.current) {
        console.error("No ElevenLabs session");

        acceptingRef.current = false;
        setCallState("idle");

        return;
      }

      /*
       * Start ElevenLabs conversation.
       */
      const session = await Conversation.startSession({
        signedUrl: sessionRef.current,

        dynamicVariables: agentVariable.current,

        onConnect: () => {
          console.log("ElevenLabs connected");

          setCallState("active");
        },

        onDisconnect: () => {
          console.log("ElevenLabs disconnected");

          /*
           * Only end the call if there is
           * actually an active conversation.
           */
          if (conversationRef.current) {
            handleEndCall();
          }
        },

        onError: (error) => {
          console.error("ElevenLabs error:", error);

          /*
           * Notify backend that this call ended.
           */
          handleEndCall();
        },

        onModeChange: (mode) => {
          console.log("Agent mode:", mode.mode);
        },
      });

      /*
       * Store the conversation in both state and ref.
       */
      conversationRef.current = session;
      setConversation(session);
    } catch (error) {
      console.error("Failed to start call:", error);

      acceptingRef.current = false;
      conversationRef.current = null;
      setConversation(null);
      setCallState("idle");

      /*
       * Tell backend the call failed.
       */
      sendMessage({
        type: "CALL_DECLINED",
      });
    }
  };

  /*
   * Decline the incoming responder call.
   */
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

  /*
   * End the active ElevenLabs call.
   */
  const handleEndCall = async () => {
    /*
     * Use the ref because state may be stale
     * inside ElevenLabs callbacks.
     */
    const activeConversation = conversationRef.current;

    if (!activeConversation) {
      return;
    }

    /*
     * Clear refs first so onDisconnect triggered
     * by endSession doesn't call this function again.
     */
    conversationRef.current = null;
    setConversation(null);

    acceptingRef.current = false;

    sessionRef.current = null;
    agentVariable.current = null;

    setCallState("idle");

    try {
      await activeConversation.endSession();
    } catch (error) {
      console.error("Error ending ElevenLabs session:", error);
    }

    /*
     * Tell the backend that this particular
     * responder call has ended.
     */
    sendMessage({
      type: "CALL_ENDED",
    });
  };

  /*
   * Reset everything back to its original, pre-operation state.
   * Used by the "Reset" button on the summary panel.
   */
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

  return (
    <div className="home">
      <div className="main">
        {/* LEFT PHONE PANEL */}
        <div className="left-panel">
          <div className="phone-screen">
            {callState === "idle" ? (
              <ClockUI />
            ) : callState === "incoming" ? (
              <IncomingCall onAccept={handleAccept} onReject={handleDecline} />
            ) : (
              <ActiveCall onEnd={handleEndCall} />
            )}
          </div>

          <img src="/phone.png" alt="" className="" />
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
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
