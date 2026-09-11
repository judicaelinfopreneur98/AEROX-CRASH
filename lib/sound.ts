/**
 * Synthétiseur audio procédural haute performance et moteur musical cyberpunk via Web Audio API.
 * Génère des effets sonores réactifs et une bande-son synthwave dynamique sans aucune dépendance externe.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  // --- MOTEUR DE MUSIQUE DE FOND (BGM) CYBERPUNK ---
  private isBgmPlaying: boolean = false;
  private bgmMasterGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private bgmVolume: number = 0.24; // Volume doux et confortable par défaut
  private bgmSchedulerTimer: any = null;
  private current16thStep: number = 0;
  private nextNoteTime: number = 0;
  private readonly tempoBpm: number = 118; // Tempo dynamique synthwave
  private gamePhase: 'WAITING' | 'BETTING' | 'RUNNING' | 'CRASHED' = 'WAITING';
  private currentMultiplier: number = 1.00;
  private hasRegisteredAutoPlay: boolean = false;
  private bgmListeners: Set<(playing: boolean) => void> = new Set();

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopFlightSound();
      if (this.bgmMasterGain && this.ctx) {
        this.bgmMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
    } else {
      if (this.isBgmPlaying && this.bgmMasterGain && this.ctx) {
        this.bgmMasterGain.gain.setTargetAtTime(this.bgmVolume, this.ctx.currentTime, 0.1);
      }
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // =========================================================================
  // 1. EFFETS SONORES (SFX)
  // =========================================================================

  /**
   * Bip discret lors du placement de mise ou sélection.
   */
  public playBetPlaced() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  /**
   * Bip de compte à rebours (phase de mise).
   */
  public playCountdownTick(isLast = false) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const freq = isLast ? 880 : 440;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  /**
   * Son continu de réacteur en vol qui monte en fréquence avec le multiplicateur.
   */
  public updateFlightSound(multiplier: number) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    if (!this.engineOsc) {
      this.engineOsc = ctx.createOscillator();
      this.engineGain = ctx.createGain();
      this.engineOsc.type = 'sawtooth';

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);

      this.engineGain.gain.setValueAtTime(0.035, ctx.currentTime);
      this.engineOsc.start();
    }

    const baseFreq = 80;
    const targetFreq = Math.min(600, baseFreq + Math.log2(multiplier) * 90);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.05);
  }

  public stopFlightSound() {
    if (this.engineOsc && this.engineGain) {
      try {
        const ctx = this.getContext();
        if (ctx) {
          this.engineGain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.03);
          setTimeout(() => {
            if (this.engineOsc) {
              this.engineOsc.stop();
              this.engineOsc.disconnect();
              this.engineOsc = null;
              this.engineGain = null;
            }
          }, 60);
        }
      } catch (e) {
        this.engineOsc = null;
        this.engineGain = null;
      }
    }
  }

  /**
   * Son de Cash-out réussi (accords majeurs triomphants).
   */
  public playCashoutSuccess() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.04);
      osc.stop(ctx.currentTime + idx * 0.04 + 0.35);
    });
  }

  /**
   * Son de Crash (onde de choc basse fréquence et bruit blanc).
   */
  public playCrash() {
    this.stopFlightSound();
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(140, ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.4);

    subGain.gain.setValueAtTime(0.25, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start();
    subOsc.stop(ctx.currentTime + 0.5);
  }

  // =========================================================================
  // 2. MOTEUR MUSICAL CYBERPUNK TEMPS RÉEL (BGM)
  // =========================================================================

  private initBgmAudioGraph() {
    const ctx = this.getContext();
    if (!ctx) return;

    if (!this.bgmMasterGain) {
      this.bgmMasterGain = ctx.createGain();
      this.bgmFilter = ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.setValueAtTime(850, ctx.currentTime);
      this.bgmFilter.Q.setValueAtTime(2.2, ctx.currentTime);

      this.bgmFilter.connect(this.bgmMasterGain);
      this.bgmMasterGain.connect(ctx.destination);

      const targetGain = this.isMuted ? 0 : this.bgmVolume;
      this.bgmMasterGain.gain.setValueAtTime(targetGain, ctx.currentTime);
    }
  }

  public startBgm() {
    if (this.isBgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.initBgmAudioGraph();
    this.isBgmPlaying = true;
    this.current16thStep = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;

    if (this.bgmMasterGain && !this.isMuted) {
      this.bgmMasterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.bgmMasterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      this.bgmMasterGain.gain.setTargetAtTime(this.bgmVolume, ctx.currentTime, 0.4);
    }

    if (this.bgmSchedulerTimer) clearInterval(this.bgmSchedulerTimer);
    this.bgmSchedulerTimer = setInterval(() => this.scheduleBgmLookahead(), 30);

    if (typeof window !== 'undefined') {
      localStorage.setItem('aerox_bgm_enabled', 'true');
    }
    this.notifyBgmListeners(true);
  }

  public stopBgm() {
    if (!this.isBgmPlaying) return;
    const ctx = this.getContext();

    if (this.bgmMasterGain && ctx) {
      this.bgmMasterGain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.15);
    }

    setTimeout(() => {
      if (this.bgmSchedulerTimer) {
        clearInterval(this.bgmSchedulerTimer);
        this.bgmSchedulerTimer = null;
      }
      this.isBgmPlaying = false;
      this.notifyBgmListeners(false);
    }, 200);

    if (typeof window !== 'undefined') {
      localStorage.setItem('aerox_bgm_enabled', 'false');
    }
  }

  public toggleBgm(): boolean {
    if (this.isBgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  public isBgmActive(): boolean {
    return this.isBgmPlaying;
  }

  public setBgmVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    const ctx = this.getContext();
    if (this.bgmMasterGain && ctx && !this.isMuted && this.isBgmPlaying) {
      this.bgmMasterGain.gain.setTargetAtTime(this.bgmVolume, ctx.currentTime, 0.05);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('aerox_bgm_volume', this.bgmVolume.toString());
    }
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public onBgmChange(cb: (playing: boolean) => void): () => void {
    this.bgmListeners.add(cb);
    cb(this.isBgmPlaying);
    return () => this.bgmListeners.delete(cb);
  }

  private notifyBgmListeners(playing: boolean) {
    this.bgmListeners.forEach((cb) => cb(playing));
  }

  /**
   * Adapte dynamiquement la texture musicale selon la phase de jeu et le multiplicateur.
   */
  public updateBgmPhase(phase: 'WAITING' | 'BETTING' | 'RUNNING' | 'CRASHED', multiplier: number = 1.00) {
    this.gamePhase = phase;
    this.currentMultiplier = multiplier;

    const ctx = this.getContext();
    if (!ctx || !this.bgmFilter) return;

    const now = ctx.currentTime;
    if (phase === 'WAITING' || phase === 'BETTING') {
      // Ambiance cyber-lounge feutrée et hypnotique
      this.bgmFilter.frequency.setTargetAtTime(800, now, 0.3);
    } else if (phase === 'RUNNING') {
      // Ouverture du filtre proportionnelle à la vitesse du vaisseau
      const cutoff = Math.min(4200, 850 + Math.log2(multiplier) * 850);
      this.bgmFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    } else if (phase === 'CRASHED') {
      // Déflagration sonore : étouffement subit (onde de choc) puis remontée progressive
      this.bgmFilter.frequency.cancelScheduledValues(now);
      this.bgmFilter.frequency.setValueAtTime(280, now);
      this.bgmFilter.frequency.setTargetAtTime(800, now + 0.3, 0.7);
    }
  }

  /**
   * Démarre la musique de fond de manière transparente dès la première interaction utilisateur.
   */
  public initInteractionAutoPlay() {
    if (typeof window === 'undefined' || this.hasRegisteredAutoPlay) return;
    this.hasRegisteredAutoPlay = true;

    // Récupérer la préférence utilisateur sauvegardée (active par défaut)
    const saved = localStorage.getItem('aerox_bgm_enabled');
    const savedVol = localStorage.getItem('aerox_bgm_volume');
    if (savedVol) {
      const parsed = parseFloat(savedVol);
      if (!isNaN(parsed)) this.bgmVolume = parsed;
    }

    if (saved === 'false') {
      // L'utilisateur a explicitement coupé la musique
      return;
    }

    const onFirstUserAction = () => {
      window.removeEventListener('click', onFirstUserAction);
      window.removeEventListener('keydown', onFirstUserAction);
      window.removeEventListener('touchstart', onFirstUserAction);

      if (!this.isBgmPlaying) {
        this.startBgm();
      }
    };

    window.addEventListener('click', onFirstUserAction, { once: true });
    window.addEventListener('keydown', onFirstUserAction, { once: true });
    window.addEventListener('touchstart', onFirstUserAction, { once: true });
  }

  // =========================================================================
  // 3. HORLOGE AUDIO ET SYNTHÈSE DE LA BANDE-SON
  // =========================================================================

  private scheduleBgmLookahead() {
    if (!this.isBgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const secondsPer16th = (60.0 / this.tempoBpm) / 4.0;
    const lookaheadSec = 0.12;

    while (this.nextNoteTime < ctx.currentTime + lookaheadSec) {
      this.renderBgmStep(this.current16thStep, this.nextNoteTime);
      this.nextNoteTime += secondsPer16th;
      this.current16thStep = (this.current16thStep + 1) % 64; // Boucle de 4 mesures (64 doubles-croches)
    }
  }

  private renderBgmStep(step: number, time: number) {
    const ctx = this.getContext();
    if (!ctx || !this.bgmFilter) return;

    // Définition des 4 mesures harmoniques (Am -> F -> C -> G)
    const barIndex = Math.floor(step / 16); // 0, 1, 2, 3
    const stepInBar = step % 16; // 0..15

    let rootBassFreq = 55.0; // Am (A1)
    let chordNotes = [220.0, 261.63, 329.63]; // A3, C4, E4
    let leadNotes = [440.0, 523.25, 659.25, 783.99]; // A4, C5, E5, G5

    if (barIndex === 1) {
      // Fmaj
      rootBassFreq = 43.65; // F1
      chordNotes = [174.61, 220.0, 261.63]; // F3, A3, C4
      leadNotes = [349.23, 440.0, 523.25, 659.25];
    } else if (barIndex === 2) {
      // Cmaj
      rootBassFreq = 65.41; // C2
      chordNotes = [130.81, 164.81, 196.0]; // C3, E3, G3
      leadNotes = [392.0, 523.25, 659.25, 783.99];
    } else if (barIndex === 3) {
      // Gmaj / Em
      rootBassFreq = 49.0; // G1
      chordNotes = [196.0, 246.94, 293.66]; // G3, B3, D4
      leadNotes = [293.66, 392.0, 493.88, 587.33];
    }

    // 1. Kick sub-bass feutré sur les 4 temps (steps 0, 4, 8, 12)
    if (stepInBar % 4 === 0) {
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'triangle';
      kickOsc.frequency.setValueAtTime(105, time);
      kickOsc.frequency.exponentialRampToValueAtTime(36, time + 0.09);

      const kickVol = this.gamePhase === 'RUNNING' ? 0.28 : 0.20;
      kickGain.gain.setValueAtTime(kickVol, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      kickOsc.connect(kickGain);
      kickGain.connect(this.bgmFilter);
      kickOsc.start(time);
      kickOsc.stop(time + 0.12);
    }

    // 2. Ligne de basse Synthwave pulsée (sur chaque croche)
    if (stepInBar % 2 === 0) {
      const isOctaveUp = stepInBar % 4 === 2;
      const bassFreq = isOctaveUp ? rootBassFreq * 2 : rootBassFreq;

      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, time);

      const bassEnvDuration = isOctaveUp ? 0.08 : 0.14;
      const bassVol = this.gamePhase === 'RUNNING' ? 0.16 : 0.12;

      bassGain.gain.setValueAtTime(bassVol, time);
      bassGain.gain.exponentialRampToValueAtTime(0.001, time + bassEnvDuration);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmFilter);
      bassOsc.start(time);
      bassOsc.stop(time + bassEnvDuration);
    }

    // 3. Nappe atmosphérique (Pad) au début de chaque mesure
    if (stepInBar === 0) {
      chordNotes.forEach((f, idx) => {
        const padOsc = ctx.createOscillator();
        const padGain = ctx.createGain();
        padOsc.type = 'sine';
        padOsc.frequency.setValueAtTime(f + (idx % 2 === 0 ? 0.8 : -0.8), time);

        padGain.gain.setValueAtTime(0.001, time);
        padGain.gain.linearRampToValueAtTime(0.07, time + 0.3);
        padGain.gain.exponentialRampToValueAtTime(0.001, time + 1.9);

        padOsc.connect(padGain);
        padGain.connect(this.bgmFilter!);
        padOsc.start(time);
        padOsc.stop(time + 2.0);
      });
    }

    // 4. Rythmique Cyber-Hat (sur les contre-temps)
    if (stepInBar % 4 === 2 || (this.gamePhase === 'RUNNING' && stepInBar % 2 === 1)) {
      const hatOsc = ctx.createOscillator();
      const hatGain = ctx.createGain();
      hatOsc.type = 'triangle';
      hatOsc.frequency.setValueAtTime(3200, time);
      hatOsc.frequency.exponentialRampToValueAtTime(800, time + 0.025);

      const hatVol = this.gamePhase === 'RUNNING' ? 0.045 : 0.025;
      hatGain.gain.setValueAtTime(hatVol, time);
      hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      hatOsc.connect(hatGain);
      hatGain.connect(this.bgmFilter);
      hatOsc.start(time);
      hatOsc.stop(time + 0.03);
    }

    // 5. Arpèges hypnotiques en vol (phase RUNNING)
    if (this.gamePhase === 'RUNNING') {
      const noteIdx = stepInBar % leadNotes.length;
      const arpFreq = leadNotes[noteIdx];

      const arpOsc = ctx.createOscillator();
      const arpGain = ctx.createGain();
      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpFreq, time);

      const arpVol = Math.min(0.08, 0.03 + Math.log2(this.currentMultiplier) * 0.015);
      arpGain.gain.setValueAtTime(arpVol, time);
      arpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      arpOsc.connect(arpGain);
      arpGain.connect(this.bgmFilter);
      arpOsc.start(time);
      arpOsc.stop(time + 0.08);
    }
  }
}

export const soundManager = new SoundSynthesizer();
