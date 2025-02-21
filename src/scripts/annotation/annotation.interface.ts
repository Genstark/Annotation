import { stateObj } from "../constants";
import { IDrawing } from "./drawing/drawing.interface";
import { IEraser } from "./eraser/eraser.interface";
export interface IAnnotation {
    getState(): stateObj
    setState(stateObj: stateObj): void
    reset(): void;
    undo(): void;
    isUndoAvailable(): boolean;
    redo(): void;
    isRedoAvailable(): boolean;
    setZoom(width: number, height: number);
    addCustomCursors(cursorArray);
    destroy(): void;
    clearAll(): void;
    Drawing: IDrawing;
    Eraser: IEraser;
}
