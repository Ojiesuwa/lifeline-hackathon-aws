"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid3X3,
  UserPlus,
  Pause,
  PhoneOff,
} from "lucide-react";
import "./ActiveCall.css";

interface ActiveCallProps {
  onEnd?: () => void;
}

export default function ActiveCall({ onEnd }: ActiveCallProps) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = () => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    onEnd?.();
  };

  return (
    <motion.div
      className="active-call"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Ambient background */}
      <motion.div
        className="active-call__ambient"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="active-call__content">
        {/* Status */}
        <motion.div
          className="active-call__status"
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <span className="status-dot" />
          <span>CONNECTED</span>
        </motion.div>

        {/* Caller */}
        <motion.div
          className="active-caller"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 160,
            damping: 16,
          }}
        >
          <div className="active-caller__avatar">
            <span>LL</span>
          </div>

          <h1>LifeLine Bot</h1>

          <p>Emergency Coordination</p>

          <div className="call-duration">{formatDuration()}</div>
        </motion.div>

        {/* Fake audio activity */}
        <div className="audio-activity">
          {[...Array(13)].map((_, index) => (
            <motion.span
              key={index}
              animate={{
                height: [
                  5 + Math.random() * 5,
                  10 + Math.random() * 20,
                  5 + Math.random() * 8,
                ],
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.5,
                repeat: Infinity,
                repeatType: "mirror",
                delay: index * 0.06,
              }}
            />
          ))}
        </div>

        {/* Controls */}
        {/* <motion.div
          className="call-controls"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.2,
            type: "spring",
            stiffness: 150,
            damping: 18,
          }}
        >
          <CallControl
            icon={muted ? <MicOff /> : <Mic />}
            label={muted ? "Unmute" : "Mute"}
            active={muted}
            onClick={() => setMuted((value) => !value)}
          />

          <CallControl
            icon={speaker ? <Volume2 /> : <VolumeX />}
            label="Speaker"
            active={speaker}
            onClick={() => setSpeaker((value) => !value)}
          />

          <CallControl icon={<Grid3X3 />} label="Keypad" />

          <CallControl icon={<UserPlus />} label="Add call" />

          <CallControl icon={<Pause />} label="Hold" />
        </motion.div> */}
        <div className="space"></div>

        {/* End call */}
        <motion.button
          className="end-call-button"
          onClick={handleEndCall}
          whileHover={{
            scale: 1.06,
          }}
          whileTap={{
            scale: 0.9,
          }}
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(239, 68, 68, 0)",
              "0 0 0 12px rgba(239, 68, 68, 0.06)",
              "0 0 0 0 rgba(239, 68, 68, 0)",
            ],
          }}
          transition={{
            boxShadow: {
              duration: 2,
              repeat: Infinity,
            },
          }}
        >
          <PhoneOff size={28} />
        </motion.button>

        <span className="end-call-label">End call</span>
      </div>
    </motion.div>
  );
}

interface CallControlProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function CallControl({
  icon,
  label,
  active = false,
  onClick,
}: CallControlProps) {
  return (
    <div className="call-control">
      <motion.button
        className={`call-control__button ${
          active ? "call-control__button--active" : ""
        }`}
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
      >
        {icon}
      </motion.button>

      <span>{label}</span>
    </div>
  );
}
