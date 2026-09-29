import type { ActionId, ControllerKind } from '../types';
import { padDiagram } from './pad';
import { keyboardDiagram } from './keyboard';
import { tiltDiagram } from './tilt';

export interface Diagram {
  el: SVGSVGElement;
  /** Highlight a set of input ids (PadInput ids, KeyboardEvent.code values, or action ids for the phone). */
  set(active: Set<string>): void;
  /** Phone layout only: lean the horizon by this many degrees. */
  setTilt?(deg: number): void;
  /** Phone layout only: make the drawn buttons real touch targets. */
  bind?(press: (action: ActionId, down: boolean, t: number) => void): void;
}

export function makeDiagram(kind: ControllerKind): Diagram {
  if (kind === 'keyboard') return keyboardDiagram();
  if (kind === 'tilt') return tiltDiagram();
  return padDiagram(kind);
}
