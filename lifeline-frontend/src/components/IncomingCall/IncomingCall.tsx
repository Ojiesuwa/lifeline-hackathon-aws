"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Phone, PhoneOff, ShieldAlert, Volume2 } from "lucide-react";
import "./IncomingCall.css";

interface IncomingCallProps {
  onAccept?: () => void;
  onReject?: () => void;
}

export default function IncomingCall({
  onAccept,
  onReject,
}: IncomingCallProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.loop = true;

    audio.play().catch(() => {
      // Browser may block autoplay until user interaction.
      console.log("Ringtone autoplay was blocked.");
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleAccept = () => {
    console.log("Accepe");
    audioRef.current?.pause();
    audioRef.current!.currentTime = 0;

    onAccept?.();
  };

  const handleReject = () => {
    audioRef.current?.pause();
    audioRef.current!.currentTime = 0;

    onReject?.();
  };

  return (
    <motion.div
      className="incoming-call"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <audio ref={audioRef} src="/call.mp3" preload="auto" autoPlay />

      {/* Background glow */}
      <motion.div
        className="incoming-call__glow"
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.35, 0.6, 0.35],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="incoming-call__content">
        {/* Incoming label */}
        <motion.div
          className="incoming-call__label"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Volume2 size={15} />
          <span>INCOMING CALL</span>
        </motion.div>

        {/* Avatar */}
        <motion.div
          className="caller-avatar-wrapper"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 180,
            damping: 15,
            delay: 0.15,
          }}
        >
          <motion.div
            className="caller-ring caller-ring--one"
            animate={{
              scale: [1, 1.35, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />

          <motion.div
            className="caller-ring caller-ring--two"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.6,
            }}
          />

          <div className="caller-avatar">
            <ShieldAlert size={42} strokeWidth={1.7} />
          </div>
        </motion.div>

        {/* Caller information */}
        <motion.div
          className="caller-info"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <h1>LifeLine Bot</h1>
          <p>Emergency Coordination</p>
        </motion.div>

        {/* Animated sound waves */}
        <div className="sound-waves" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((bar) => (
            <motion.span
              key={bar}
              animate={{
                height: ["8px", "28px", "12px", "22px", "8px"],
              }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: bar * 0.08,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <motion.div
          className="call-actions"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.4,
            type: "spring",
            stiffness: 160,
            damping: 18,
          }}
        >
          <div className="call-action">
            <motion.button
              className="call-button call-button--reject"
              onClick={handleReject}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.06 }}
              aria-label="Decline call"
            >
              <PhoneOff size={27} />
            </motion.button>

            <span>Decline</span>
          </div>

          <div className="call-action" onClick={handleAccept}>
            <motion.button
              className="call-button call-button--accept"
              onClick={handleAccept}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.06 }}
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(50, 220, 130, 0)",
                  "0 0 0 14px rgba(50, 220, 130, 0.08)",
                  "0 0 0 0 rgba(50, 220, 130, 0)",
                ],
              }}
              transition={{
                boxShadow: {
                  duration: 1.8,
                  repeat: Infinity,
                },
              }}
              aria-label="Accept call"
            >
              <Phone size={27} />
            </motion.button>

            <span>Answer</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
