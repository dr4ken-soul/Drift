'use client';

import { useEffect, useRef } from 'react';

type Particle = { x: number; y: number; seed: number; amplitude: number; period: number; size: number };

/** Paints the sparse ambient canvas that sits behind every landing section. */
export function DriftField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const particles: Particle[] = [];
    let animationFrame = 0;
    let density = 0.22;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Rebuild the point field when the viewport changes size. */
    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles.length = 0;
      for (let index = 0; index < 140; index += 1) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          seed: Math.random() * Math.PI * 2,
          amplitude: 40 + Math.random() * 20,
          period: 18000 + Math.random() * 8000,
          size: 1 + Math.random(),
        });
      }
    };

    /** Draw one animation frame of the ambient field. */
    const draw = (time: number): void => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.globalAlpha = density;
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      particles.forEach((particle) => {
        const progress = reducedMotion ? 0 : (time % particle.period) / particle.period;
        const x = particle.x + Math.sin(progress * Math.PI * 2 + particle.seed) * particle.amplitude;
        const y = particle.y + Math.cos(progress * Math.PI * 2 + particle.seed) * particle.amplitude * 0.6;
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    /** Update opacity based on the active section's declared density. */
    const observeDensity = (): (() => void) => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sectionDensity = entry.target.getAttribute('data-density');
          density = sectionDensity === 'dense' ? 0.05 : sectionDensity === 'calm' ? 0.12 : 0.22;
        });
      }, { threshold: 0.45 });
      document.querySelectorAll('section[data-density]').forEach((section) => observer.observe(section));
      return () => observer.disconnect();
    };

    resize();
    window.addEventListener('resize', resize);
    const cleanupObserver = observeDensity();
    animationFrame = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
      cleanupObserver?.();
    };
  }, []);

    return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-80" />;
}
