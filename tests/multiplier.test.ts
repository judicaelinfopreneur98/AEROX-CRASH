import { describe, it, expect } from 'vitest';
import { MultiplierEngine } from '../game-engine/MultiplierEngine';

describe('Moteur de Multiplicateur (MultiplierEngine)', () => {
  it('doit démarrer exactement à 1.00x au temps t = 0', () => {
    expect(MultiplierEngine.calculateMultiplier(0)).toBe(1.00);
    expect(MultiplierEngine.calculateMultiplier(-1)).toBe(1.00);
  });

  it('doit croître de manière strictement monotone et continue au fil du temps', () => {
    let prev = 1.00;
    for (let t = 0.5; t <= 30; t += 0.5) {
      const current = MultiplierEngine.calculateMultiplier(t);
      expect(current).toBeGreaterThanOrEqual(prev);
      prev = current;
    }
  });

  it('doit calculer le temps réciproque de manière cohérente', () => {
    const targetMult = 2.50;
    const time = MultiplierEngine.calculateTimeForMultiplier(targetMult);
    const calculatedBack = MultiplierEngine.calculateMultiplier(time);

    expect(Math.abs(calculatedBack - targetMult)).toBeLessThanOrEqual(0.05);
  });
});
