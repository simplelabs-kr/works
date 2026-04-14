'use client'

import { useEffect, useState } from 'react'

type ImageItem = { url: string; name: string }

interface ImageModalProps {
  images: ImageItem[]
  startIndex: number
  onClose: () => void
}

export default function ImageModal({ images, startIndex, onClose }: ImageModalProps) {
  const [idx, setIdx] = useState(startIndex)
  const multi = images.length > 1
  const current = images[idx]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (multi && e.key === 'ArrowLeft' && idx > 0) setIdx(i => i - 1)
      if (multi && e.key === 'ArrowRight' && idx < images.length - 1) setIdx(i => i + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, idx, multi, images.length])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Top right: index + close */}
      <div
        style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 12 }}
        onClick={e => e.stopPropagation()}
      >
        {multi && (
          <span style={{ color: '#fff', fontSize: 14 }}>
            {idx + 1} / {images.length}
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#fff', fontSize: 28,
            cursor: 'pointer', lineHeight: 1, padding: 0,
          }}
        >
          &times;
        </button>
      </div>

      {/* Left arrow */}
      {multi && idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }}
          style={{
            position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            fontSize: 28, width: 44, height: 44, borderRadius: '50%',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          &#8249;
        </button>
      )}

      {/* Right arrow */}
      {multi && idx < images.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }}
          style={{
            position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            fontSize: 28, width: 44, height: 44, borderRadius: '50%',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          &#8250;
        </button>
      )}

      {/* Main image */}
      {current && (
        <img
          src={current.url}
          alt={current.name}
          style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
          onClick={e => e.stopPropagation()}
        />
      )}

      {/* Bottom thumbnails */}
      {multi && (
        <div
          style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8,
          }}
          onClick={e => e.stopPropagation()}
        >
          {images.map((item, i) => (
            <img
              key={i}
              src={item.url}
              alt={item.name}
              onClick={() => setIdx(i)}
              style={{
                width: 48, height: 48, objectFit: 'cover', borderRadius: 4,
                cursor: 'pointer',
                opacity: i === idx ? 1 : 0.5,
                border: i === idx ? '2px solid white' : '2px solid transparent',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
