import useInView from '../../hooks/useInView'

export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children }) {
  const [ref, inView] = useInView()

  return (
    <Tag
      ref={ref}
      className={`${inView ? 'animate-fade-in-up' : 'opacity-0'} ${className}`}
      style={inView ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
