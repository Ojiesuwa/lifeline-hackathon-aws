"use client"
import styles from "./BottomGlow.module.css";

export default function BottomGlow() {
  return (
    <div className={styles.glow} aria-hidden="true">
      <div className={styles.blue} />
      <div className={styles.cyan} />
      <div className={styles.purple} />
    </div>
  );
}
