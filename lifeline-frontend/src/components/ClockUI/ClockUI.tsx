"use client";

import { useEffect, useState } from "react";
import "./ClockUI.css";

export default function ClockUI() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const updateClock = () => setNow(new Date());

    updateClock();

    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  const time = new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <div className="clock-ui">
      <div className="clock-time">{time}</div>
      <div className="clock-date">{date}</div>
    </div>
  );
}
