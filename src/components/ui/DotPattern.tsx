interface DotPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children: React.ReactNode
}

export default function DotPattern({ className = '', children, ...rest }: DotPatternProps) {
  return (
    <div
      className={`bg-gray-100 ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
