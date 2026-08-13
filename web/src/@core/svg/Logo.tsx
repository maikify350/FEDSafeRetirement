// React Imports
import type { SVGAttributes } from 'react'

const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 32 32'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      {/* Rounded square background */}
      <rect width='32' height='32' rx='8' fill='currentColor' />
      {/* JM text */}
      <text
        x='16'
        y='22'
        textAnchor='middle'
        fontFamily='Inter, system-ui, sans-serif'
        fontWeight='700'
        fontSize='13'
        fill='white'
        letterSpacing='-0.5'
      >
        JM
      </text>
    </svg>
  )
}

export default Logo
