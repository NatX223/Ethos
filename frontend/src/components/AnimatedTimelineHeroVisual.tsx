import { motion } from 'framer-motion';

const SCALE = 1.3;
const DOTS = [60, 120, 180, 240, 300]; // x positions for dots
const LINE_LENGTH = 360 * SCALE;
const DOT_SIZE = 7 * SCALE;
const SVG_HEIGHT = 60 * SCALE;
const LINE_Y = SVG_HEIGHT / 2;

export default function AnimatedTimelineHeroVisual() {
  return (
    <div
      className="w-full h-48 flex items-center justify-center relative"
      style={{ minHeight: SVG_HEIGHT }}
    >
      {/* Animated SVG Line */}
      <svg
        width={LINE_LENGTH + 40 * SCALE}
        height={SVG_HEIGHT}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ zIndex: 1 }}
      >
        <motion.line
          x1={40 * SCALE}
          y1={LINE_Y}
          x2={LINE_LENGTH + 40 * SCALE}
          y2={LINE_Y}
          stroke="#6366f1"
          strokeWidth={4 * SCALE}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </svg>
      {/* Animated Dots */}
      {DOTS.map((x, i) => {
        const fromTop = i % 2 === 0;
        return (
          <motion.div
            key={i}
            initial={{ y: fromTop ? -SVG_HEIGHT / 2 : SVG_HEIGHT / 2, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 + i * 0.25, type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute"
            style={{
              left: `calc(50% + ${(x * SCALE) - (LINE_LENGTH / 2)}px)`,
              top: `calc(50% - ${DOT_SIZE / 2}px)`,
              zIndex: 2,
            }}
          >
            <div
              className="rounded-full bg-primary border-4 border-white shadow-lg"
              style={{ width: DOT_SIZE, height: DOT_SIZE }}
            />
          </motion.div>
        );
      })}
    </div>
  );
} 