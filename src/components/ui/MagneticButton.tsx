import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface MagneticButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  type?: 'button' | 'submit' | 'reset'
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void
  onMouseLeave?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = '',
  style = {},
  type = 'button',
  onMouseEnter,
  onMouseLeave
}) => {
  const ref = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    
    // Magnetic strength (lower divisor = stronger pull)
    setPosition({ x: middleX * 0.3, y: middleY * 0.3 })
  }

  const reset = (e: React.MouseEvent<HTMLButtonElement>) => {
    setPosition({ x: 0, y: 0 })
    if (onMouseLeave) onMouseLeave(e)
  }

  const { x, y } = position

  return (
    <motion.button
      ref={ref}
      type={type}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      disabled={disabled}
      className={className}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      style={{
        ...style,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        willChange: 'transform'
      }}
    >
      {/* Inner text content could also have a subtle opposite parallax but keeping it simple for now */}
      <motion.div
        animate={{ x: x * 0.2, y: y * 0.2 }}
        transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
        style={{
          pointerEvents: 'none',
          display: 'inherit',
          alignItems: 'inherit',
          justifyContent: 'inherit',
          gap: 'inherit'
        }}
      >
        {children}
      </motion.div>
    </motion.button>
  )
}
