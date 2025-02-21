import { ILine } from "./../line/line.interface";
export interface IStageInitParams {
    container: string,
    width: number,
    height: number,
}
export interface IStage {
    addLine(line: ILine): void;
    getLines(): Array<any>
    batchDraw(): void
    on(events: string, eventHandler: any): void;
    clearStage(): void;
    getPointerPosition(): { x: number, y: number }
    getWidth(): number;
    setWidth(width: number): void;
    getHeight(): number;
    setHeight(height: number): void;
    destroy(): void;
    fire(type, eventObj?): void;
    setPointersPositions(event): void;
}