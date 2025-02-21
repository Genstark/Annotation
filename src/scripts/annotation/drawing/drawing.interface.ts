import { DrawingMode, IStartDrawingOptions } from "./../../constants";
export interface IDrawing {
    start(mode: DrawingMode, options?: IStartDrawingOptions);
    stop(): void;
    setStrokeColor(color: string): void;
    setStrokeWidth(width: number): void;
}