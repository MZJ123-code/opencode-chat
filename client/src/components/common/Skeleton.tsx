import styles from './Skeleton.module.css'

export function Skeleton({ width = '100%', height = 60, count = 3 }: {
  width?: string | number
  height?: number
  count?: number
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={styles.item}
          style={{ width, height }}
        />
      ))}
    </>
  )
}
