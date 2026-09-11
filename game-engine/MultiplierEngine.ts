/**
 * Moteur mathématique de calcul de la courbe du multiplicateur.
 * Utilise une croissance exponentielle continue M(t) = e^(k * t).
 * k = 0.06 produit une montée progressive et intense, standard des jeux Crash.
 */

export class MultiplierEngine {
  public static readonly GROWTH_RATE = 0.06; // Facteur d'accélération

  /**
   * Calcule le multiplicateur à l'instant t (en secondes écoulées depuis le décollage).
   */
  public static calculateMultiplier(elapsedSeconds: number): number {
    if (elapsedSeconds <= 0) return 1.00;
    // M(t) = 1.00 * e^(GROWTH_RATE * t)
    const mult = Math.exp(this.GROWTH_RATE * elapsedSeconds);
    return Math.max(1.00, Number(mult.toFixed(2)));
  }

  /**
   * Calcule le temps théorique en secondes requis pour atteindre un multiplicateur donné.
   */
  public static calculateTimeForMultiplier(targetMultiplier: number): number {
    if (targetMultiplier <= 1.00) return 0;
    return Math.log(targetMultiplier) / this.GROWTH_RATE;
  }
}
