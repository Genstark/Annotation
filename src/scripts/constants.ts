export enum EventsEnum {
    STATECHANGE = 'stateChange'
}

export const KEYBOARD_CURSOR_DIV_ID = 'cursorDiv'
export enum Keys {
    LEFT = 'ArrowLeft',
    RIGHT = 'ArrowRight',
    UP = 'ArrowUp',
    DOWN = 'ArrowDown',
    Z = 'z',
    Y = 'y',
    SHIFT = 'Shift',
    CONTROL = 'Control'
}
export enum ActionType {
    LINE = 'line',
    DELETE = 'delete'
}

export enum DrawingMode {
    PEN = 'pen',
    HIGHLIGHTER = 'highlighter'
}
export enum CursorType {
    PEN = 'pen',
    HIGHLIGHTER = 'highlighter',
    ERASER = 'eraser'
}

export const lineCommonParameters = {
    globalCompositeOperation: "source-over" as any,
    lineCap: "square" as any,
    lineJoin: "square" as any,
    tension: 0.3,
}
export interface IOptions {
    containment: string;
    resolution?: number;
    penOpacity?: number; // value between 0 - 1
    highlighterOpacity?: number; // value between 0 - 1
    events?: {
        stateChange?: (newState) => void
    }
    baseHeight: number;
    baseWidth: number;
    cursorsArray?: Array<cursorArray>;
}
export interface IStartDrawingOptions {
    strokeColor?: string;
    strokeWidth?: number;
}
export interface stateObj {
    [drawingArea: string]: string;
}
export interface cursorArray {
    type: CursorType;
    cursor : string;
}