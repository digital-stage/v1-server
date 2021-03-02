class HSLColor {
  private readonly _hue: number;

  private readonly _saturation: number;

  private readonly _luminance: number;

  private readonly _alpha: number;

  constructor(hue: number, saturation = 70, luminance = 80, alpha = 1) {
    this._hue = hue;
    this._saturation = saturation;
    this._luminance = luminance;
    this._alpha = alpha;
  }

  get h(): number {
    return this._hue;
  }

  get s(): number {
    return this._saturation;
  }

  get l(): number {
    return this._luminance;
  }

  get a(): number {
    return this._alpha;
  }

  hue(hue: number): HSLColor {
    return new HSLColor(hue, this._saturation, this._luminance, this._alpha);
  }

  saturation(saturation: number): HSLColor {
    return new HSLColor(this._hue, saturation, this._luminance, this._alpha);
  }

  luminance(luminance: number): HSLColor {
    return new HSLColor(this._hue, this._saturation, luminance, this._alpha);
  }

  alpha(alpha: number): HSLColor {
    return new HSLColor(this._hue, this._saturation, this._luminance, alpha);
  }

  toString(): string {
    return `hsla(${this._hue},${this._saturation}%,${this._luminance}%,${this._alpha})`;
  }
}

export default HSLColor;
