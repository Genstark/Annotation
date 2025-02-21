
import { ActionType, DrawingMode, IStartDrawingOptions, stateObj } from "../constants";
export interface IKonvaWrapper {
    getState(): stateObj;
    setState(stateObj: stateObj);
    startDrawing(mode: DrawingMode, options?: IStartDrawingOptions);
    stopDrawing(): void;
    setStrokeColor(color: string): void;
    setStrokeWidth(width: number): void;
    activateEraser(): void;
    deactivateEraser(): void;
    isUndoAvailable(): boolean;
    undo(): void;
    isRedoAvailable(): boolean;
    redo(): void;
    reset(): void;
    setZoom(width: number, height: number): void;
    destroy(): void;
    addCustomCursors(cursorsArray): void;
    clearAll(): void;
}
export interface IActionObject {
    drawingArea: string,
    data: any | string
}
export interface IUndoRedoObject {
    actionType: ActionType,
    actions: Array<IActionObject>
}