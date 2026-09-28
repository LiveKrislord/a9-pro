import type { ControllerKind } from '../types';
import { padDiagram } from './pad';
import { keyboardDiagram } from './keyboard';

export interface Diagram {
  el: SVGSVGElement;
  /** Highlight a set of input ids (PadInput ids or KeyboardEvent.code values). */
  set(active: Set<string>): void;
}

export function makeDiagram(kind: ControllerKind): Diagram {
  return kind === 'keyboard' ? keyboardDiagram() : padDiagram(kind);
}
