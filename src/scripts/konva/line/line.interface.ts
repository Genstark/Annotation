export interface ILine {
    getPoints(): Array<number>;
    setPoints(point: Array<number>): void;
    getScale(): { x: number, y: number };
    setScale(x: number, y: number): void;
    remove(): void;
    getStrokeColor(): string;
    getStrokeWidth(): number;
    getOpacity(): number;
    getInitalWidth(): number;
    getInitialHeight(): number;
    getInstance(): any;
}
export interface ILineInitParams {
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
    points: Array<number>;
    width: number;
    height: number;
    x?: number;
    y?: number;
}