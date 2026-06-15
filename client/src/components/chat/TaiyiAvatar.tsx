import { useState, useCallback, useEffect } from "react";
import { motion, type Variants } from "framer-motion";

/** 机器人表情状态 */
export type TaiyiMood = "idle" | "thinking" | "talking" | "happy" | "surprised" | "sleeping";

interface TaiyiAvatarProps {
  mood?: TaiyiMood;
  size?: number;
  interactive?: boolean;
  onClick?: () => void;
}

const moodColors: Record<TaiyiMood, string> = {
  idle: "rgba(0, 240, 255, 0.3)",
  thinking: "rgba(245, 158, 11, 0.3)",
  talking: "rgba(0, 229, 160, 0.3)",
  happy: "rgba(236, 72, 153, 0.3)",
  surprised: "rgba(139, 92, 246, 0.3)",
  sleeping: "rgba(107, 114, 128, 0.3)",
};

const headVariants: Variants = {
  idle: { y: [0, -3, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  thinking: { rotate: [-3, 3, -3], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
  talking: { y: [0, -2, 0], transition: { duration: 1.2, repeat: Infinity } },
  happy: { y: [0, -6, 0], transition: { duration: 0.5, repeat: Infinity } },
  surprised: { y: -5 },
  sleeping: { rotate: 8, y: 3 },
};

const antennaVariants: Variants = {
  idle: { rotate: 0 },
  thinking: { rotate: [-8, 8, -8], transition: { duration: 1.5, repeat: Infinity } },
  talking: { rotate: [-5, 5, -5], transition: { duration: 0.8, repeat: Infinity } },
  happy: { rotate: [-12, 12, -12], transition: { duration: 0.4, repeat: Infinity } },
  surprised: { rotate: 15 },
  sleeping: { rotate: 20 },
};

/**
 * 判断是否为 talking 情绪
 * @param mood - 当前情绪
 * @returns 是否为 talking
 */
function isTalkingMood(mood: TaiyiMood): boolean {
  return mood === "talking";
}

/**
 * 赛博机器人头像组件 — Sci-Fi 风格吉祥物
 * @param props - 组件属性
 * @param props.mood - 表情状态
 * @param props.size - 尺寸
 * @param props.interactive - 是否启用交互
 * @param props.onClick - 点击回调
 */
export function TaiyiAvatar({
  mood = "idle",
  size = 120,
  interactive = true,
  onClick,
}: TaiyiAvatarProps) {
  const [hovered, setHovered] = useState(false);
  const [currentMood, setCurrentMood] = useState(mood);
  const glowColor = moodColors[currentMood];

  useEffect(() => { setCurrentMood(mood); }, [mood]);

  const handleMouseEnter = useCallback(() => {
    if (!interactive) return;
    setHovered(true);
    if (currentMood === "idle") setCurrentMood("happy");
  }, [interactive, currentMood]);

  const handleMouseLeave = useCallback(() => {
    if (!interactive) return;
    setHovered(false);
    if (currentMood === "happy") setCurrentMood("idle");
  }, [interactive, currentMood]);

  const handleClick = useCallback(() => {
    if (!interactive) return;
    const moods: TaiyiMood[] = ["thinking", "surprised", "happy"];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    setCurrentMood(randomMood);
    setTimeout(() => setCurrentMood("idle"), 2000);
    onClick?.();
  }, [interactive, onClick]);

  const isHappy = currentMood === "happy";
  const isSleeping = currentMood === "sleeping";
  const isSurprised = currentMood === "surprised";

  return (
    <div
      className="relative inline-flex items-center justify-center cursor-pointer select-none"
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        animate={{ scale: hovered ? 1.2 : 1, opacity: hovered ? 0.9 : 0.5 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: `1.5px solid ${glowColor.replace("0.3", "0.15")}`, borderStyle: "dashed" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
      <motion.svg
        viewBox="0 0 120 130"
        className="relative z-10 w-full h-full"
        animate={hovered ? { scale: 1.05 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#1a2744" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#0077ff" />
          </linearGradient>
          <linearGradient id="visorGradHappy" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="visorGradThink" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="visorGradTalk" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00e5a0" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="visorGradSurprise" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="visorGradSleep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.g
          style={{ transformOrigin: "60px 30px" }}
          variants={antennaVariants}
          animate={currentMood}
        >
          <line x1="60" y1="30" x2="60" y2="10" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
          <motion.circle
            cx="60" cy="8" r="3.5"
            fill={isHappy ? "#ec4899" : isSleeping ? "#6b7280" : "#00f0ff"}
            filter="url(#glow)"
            animate={currentMood === "thinking" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </motion.g>
        <rect x="52" y="82" width="16" height="12" rx="3" fill="#1a2744" stroke="#2a3a5c" strokeWidth="1" />
        <line x1="56" y1="84" x2="56" y2="92" stroke="#00f0ff" strokeWidth="0.8" opacity="0.4" />
        <line x1="60" y1="84" x2="60" y2="92" stroke="#00f0ff" strokeWidth="0.8" opacity="0.4" />
        <line x1="64" y1="84" x2="64" y2="92" stroke="#00f0ff" strokeWidth="0.8" opacity="0.4" />
        <motion.g
          variants={headVariants}
          animate={currentMood}
          style={{ transformOrigin: "60px 55px" }}
        >
          <path
            d="M 38 35 L 82 35 L 92 55 L 82 80 L 38 80 L 28 55 Z"
            fill="url(#bodyGrad)"
            stroke="#2a3a5c"
            strokeWidth="1.5"
          />
          <path d="M 35 45 L 85 45" stroke="#00f0ff" strokeWidth="0.5" opacity="0.15" />
          <path d="M 32 65 L 88 65" stroke="#00f0ff" strokeWidth="0.5" opacity="0.15" />
          <rect x="25" y="48" width="6" height="18" rx="2" fill="#0d1525" stroke="#2a3a5c" strokeWidth="1" />
          <rect x="89" y="48" width="6" height="18" rx="2" fill="#0d1525" stroke="#2a3a5c" strokeWidth="1" />
          <circle cx="28" cy="52" r="1.2" fill="#00f0ff" opacity="0.6" />
          <circle cx="28" cy="57" r="1.2" fill="#00f0ff" opacity="0.6" />
          <circle cx="28" cy="62" r="1.2" fill="#00f0ff" opacity="0.6" />
          <circle cx="92" cy="52" r="1.2" fill="#00f0ff" opacity="0.6" />
          <circle cx="92" cy="57" r="1.2" fill="#00f0ff" opacity="0.6" />
          <circle cx="92" cy="62" r="1.2" fill="#00f0ff" opacity="0.6" />
          <motion.rect
            x="36" y="44" width="48" height="16" rx="8"
            fill={isHappy ? "url(#visorGradHappy)" : isTalkingMood(currentMood) ? "url(#visorGradTalk)" : isSurprised ? "url(#visorGradSurprise)" : isSleeping ? "url(#visorGradSleep)" : currentMood === "thinking" ? "url(#visorGradThink)" : "url(#visorGrad)"}
            filter="url(#glow)"
            animate={currentMood === "thinking" ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
          <motion.line
            x1="38" y1="50" x2="82" y2="50"
            stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"
            animate={{ y: [48, 56, 48] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          {!isSleeping && (
            <>
              <motion.circle cx="52" cy="52" r="3" fill="white"
                animate={isSurprised ? { r: [3, 5, 3] } : { r: 3 }}
                transition={{ duration: 0.5, repeat: isSurprised ? Infinity : 0 }}
              />
              <motion.circle cx="68" cy="52" r="3" fill="white"
                animate={isSurprised ? { r: [3, 5, 3] } : { r: 3 }}
                transition={{ duration: 0.5, repeat: isSurprised ? Infinity : 0 }}
              />
            </>
          )}
          <motion.g
            animate={currentMood === "talking" ? { y: [0, 1, 0] } : { y: 0 }}
            transition={{ duration: 0.4, repeat: Infinity }}
          >
            {isHappy ? (
              <path d="M 50 68 Q 60 78 70 68" fill="none" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" filter="url(#glow)" />
            ) : isSurprised ? (
              <ellipse cx="60" cy="70" rx="5" ry="7" fill="none" stroke="#8b5cf6" strokeWidth="2" filter="url(#glow)" />
            ) : isSleeping ? (
              <ellipse cx="60" cy="70" rx="4" ry="3" fill="none" stroke="#6b7280" strokeWidth="1.5" />
            ) : (
              <path d="M 48 68 L 72 68" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            )}
          </motion.g>
          <circle cx="44" cy="72" r="1.5" fill={isHappy ? "#ec4899" : "#00f0ff"} opacity="0.5" />
          <circle cx="76" cy="72" r="1.5" fill={isHappy ? "#ec4899" : "#00f0ff"} opacity="0.5" />
          <g opacity="0.3">
            <line x1="34" y1="58" x2="34" y2="62" stroke="#00f0ff" strokeWidth="1" />
            <line x1="32" y1="58" x2="32" y2="62" stroke="#00f0ff" strokeWidth="1" />
            <line x1="86" y1="58" x2="86" y2="62" stroke="#00f0ff" strokeWidth="1" />
            <line x1="88" y1="58" x2="88" y2="62" stroke="#00f0ff" strokeWidth="1" />
          </g>
          {isSleeping && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0], y: -15 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <text x="78" y="38" fontSize="10" fill="#6b7280" fontWeight="bold" fontFamily="monospace">Z</text>
              <text x="85" y="30" fontSize="8" fill="#9ca3af" fontWeight="bold" fontFamily="monospace">z</text>
              <text x="90" y="23" fontSize="6" fill="#d1d5db" fontWeight="bold" fontFamily="monospace">z</text>
            </motion.g>
          )}
        </motion.g>
      </motion.svg>
      {hovered && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: "#00f0ff", color: "#030710" }}
        >
          点击互动
        </div>
      )}
    </div>
  );
}
