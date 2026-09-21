'use client';

import React, { useRef, useEffect } from 'react';
import { GameState } from '@/game-engine/types';

interface CrashCanvasProps {
  status: GameState;
  multiplier: number;
  bettingTimeLeft: number;
  crashPoint?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

export function CrashCanvas({
  status,
  multiplier,
  bettingTimeLeft,
  crashPoint,
}: CrashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation states
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const shockwaveRef = useRef<{ radius: number; maxRadius: number; alpha: number } | null>(null);
  const animFrameId = useRef<number>(0);

  // Initialisation des étoiles d'ambiance
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 75; i++) {
      stars.push({
        x: Math.random() * 1200,
        y: Math.random() * 800,
        speed: 0.5 + Math.random() * 2,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.7,
      });
    }
    starsRef.current = stars;
  }, []);

  // Déclenchement de l'onde de choc lors du crash
  useEffect(() => {
    if (status === 'CRASHED') {
      shockwaveRef.current = { radius: 10, maxRadius: 300, alpha: 1.0 };
      const burst: Particle[] = [];
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        burst.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 3,
          color: Math.random() > 0.3 ? '#FF3366' : '#FFAA00',
          alpha: 1,
          life: 0,
          maxLife: 35 + Math.random() * 25,
        });
      }
      particlesRef.current.push(...burst);
    }
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let width = canvas.parentElement?.clientWidth || 800;
    let height = canvas.parentElement?.clientHeight || 400;

    const setupCanvasSize = () => {
      if (!canvas || !canvas.parentElement) return;
      dpr = window.devicePixelRatio || 1;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setupCanvasSize();
    window.addEventListener('resize', setupCanvasSize);

    // Boucle de rendu Canvas
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. FOND DE L'ESPACE QUANTIQUE
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#06080E');
      bgGrad.addColorStop(0.5, '#0B0F19');
      bgGrad.addColorStop(1, '#05070C');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. ÉTOILES ET PARTICULES DE VITESSE
      const isFlying = status === 'RUNNING';
      const speedFactor = isFlying ? Math.min(7, 1 + Math.log2(multiplier) * 1.5) : 0.8;

      ctx.save();
      for (const star of starsRef.current) {
        star.x -= star.speed * speedFactor;
        if (star.x < 0) {
          star.x = width + 10;
          star.y = Math.random() * height;
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        if (isFlying && speedFactor > 2) {
          ctx.strokeStyle = `rgba(0, 240, 255, ${star.alpha * 0.7})`;
          ctx.lineWidth = star.size;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x + speedFactor * 4, star.y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 3. GRILLE DE TÉLÉMÉTRIE D'ALTITUDE
      ctx.save();
      ctx.strokeStyle = 'rgba(31, 41, 66, 0.35)';
      ctx.lineWidth = 1;
      const stepY = Math.max(40, Math.floor(height / 6));
      for (let y = height - 30; y > 30; y -= stepY) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 15, y);
        ctx.stroke();
      }
      const stepX = Math.max(60, Math.floor(width / 7));
      for (let x = 30; x < width; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, height - 30);
        ctx.stroke();
      }
      ctx.restore();

      // 4. LOGIQUE DE VOL & TRAJECTOIRE
      const originX = Math.min(45, width * 0.1);
      const originY = height - 35;

      if (status === 'RUNNING' || status === 'CRASHED') {
        const progress = Math.min(1.0, Math.log2(multiplier) / 5.5);
        const maxPlaneX = width - Math.min(80, width * 0.2);
        const planeX = originX + progress * (maxPlaneX - originX);
        const planeY = originY - Math.pow(progress, 0.75) * (height - Math.min(90, height * 0.25));

        // A. ZONE GLOW SOUS LA COURBE
        const areaGrad = ctx.createLinearGradient(originX, originY, planeX, planeY);
        if (status === 'CRASHED') {
          areaGrad.addColorStop(0, 'rgba(255, 51, 102, 0.02)');
          areaGrad.addColorStop(1, 'rgba(255, 51, 102, 0.25)');
        } else {
          areaGrad.addColorStop(0, 'rgba(0, 240, 255, 0.02)');
          areaGrad.addColorStop(0.7, 'rgba(139, 92, 246, 0.15)');
          areaGrad.addColorStop(1, 'rgba(0, 240, 255, 0.3)');
        }

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        const cpX = originX + (planeX - originX) * 0.45;
        const cpY = originY;
        ctx.quadraticCurveTo(cpX, cpY, planeX, planeY);
        ctx.lineTo(planeX, originY);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // B. LIGNE DE TRAJECTOIRE NÉON
        ctx.save();
        ctx.shadowColor = status === 'CRASHED' ? '#FF3366' : '#00F0FF';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = status === 'CRASHED' ? '#FF3366' : '#00F0FF';
        ctx.lineWidth = width < 400 ? 2.5 : 3.5;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.quadraticCurveTo(cpX, cpY, planeX, planeY);
        ctx.stroke();
        ctx.restore();

        // C. PARTICULES DE PROPULSION
        if (status === 'RUNNING') {
          for (let i = 0; i < 2; i++) {
            particlesRef.current.push({
              x: planeX - 10,
              y: planeY + 1,
              vx: -(1.5 + Math.random() * 3),
              vy: (Math.random() - 0.5) * 1.5,
              size: 1.5 + Math.random() * 2.5,
              color: Math.random() > 0.4 ? '#00F0FF' : '#8B5CF6',
              alpha: 0.9,
              life: 0,
              maxLife: 18 + Math.random() * 12,
            });
          }
        }

        // D. RENDU DU VAISSEAU SUPERSONIQUE AEROX-X1
        if (status === 'RUNNING') {
          ctx.save();
          ctx.translate(planeX, planeY);

          const scale = width < 400 ? 0.8 : 1.0;
          ctx.scale(scale, scale);

          const angle = -Math.min(0.55, progress * 0.6);
          ctx.rotate(angle);

          ctx.shadowColor = '#00F0FF';
          ctx.shadowBlur = 16;

          // Corps principal furtif
          ctx.fillStyle = '#0F172A';
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(24, 0);
          ctx.lineTo(-12, -11);
          ctx.lineTo(-7, -4);
          ctx.lineTo(-16, 0);
          ctx.lineTo(-7, 4);
          ctx.lineTo(-12, 11);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Lignes de flux
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-7, -7);
          ctx.moveTo(8, 0);
          ctx.lineTo(-7, 7);
          ctx.stroke();

          // Cockpit Quantum
          ctx.fillStyle = '#00F0FF';
          ctx.beginPath();
          ctx.ellipse(2, 0, 7, 2.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // Flamme postcombustion
          const flameLength = 8 + Math.random() * 12;
          const flameGrad = ctx.createLinearGradient(-16, 0, -16 - flameLength, 0);
          flameGrad.addColorStop(0, '#FFFFFF');
          flameGrad.addColorStop(0.3, '#00F0FF');
          flameGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(-16, -2.5);
          ctx.lineTo(-16 - flameLength, 0);
          ctx.lineTo(-16, 2.5);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }

        // E. ONDE DE CHOC LORS DU CRASH
        if (shockwaveRef.current) {
          const sw = shockwaveRef.current;
          ctx.save();
          ctx.strokeStyle = `rgba(255, 51, 102, ${sw.alpha})`;
          ctx.lineWidth = 3.5 * sw.alpha;
          ctx.beginPath();
          ctx.arc(planeX, planeY, sw.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          sw.radius += 10;
          sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
          if (sw.alpha <= 0) shockwaveRef.current = null;
        }
      }

      // 5. RENDU ET ANIMATION DES PARTICULES
      ctx.save();
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }
      ctx.restore();

      // 6. ANIMATION RADAR DURANT BETTING OU WAITING
      if (status === 'BETTING' || status === 'WAITING') {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.28;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX - radius - 8, centerY);
        ctx.lineTo(centerX + radius + 8, centerY);
        ctx.moveTo(centerX, centerY - radius - 8);
        ctx.lineTo(centerX, centerY + radius + 8);
        ctx.stroke();

        const sweepAngle = (Date.now() / 1000) * 2;
        const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
        sweepGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, sweepAngle - 0.4, sweepAngle);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', setupCanvasSize);
      cancelAnimationFrame(animFrameId.current);
    };
  }, [status, multiplier]);

  return (
    <div className="relative w-full h-[220px] xs:h-[260px] sm:h-[340px] md:h-[400px] lg:h-full min-h-[220px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-border bg-[#06080E] shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
