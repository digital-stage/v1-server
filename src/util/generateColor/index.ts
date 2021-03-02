/* eslint no-bitwise: ["error", { "allow": ["~"] }] */
import HSLColor from "./HSLColor";

function generateColor(): HSLColor {
  return new HSLColor(~~(360 * Math.random()), 70, 80, 1);
}

export { HSLColor };
export default generateColor;
