import Konva from "konva";
import { lineCommonParameters } from "./../../constants";
import { ILine, ILineInitParams } from "./line.interface";
class Line implements ILine {
    private line: Konva.Line;
    constructor(initParams: ILineInitParams) {
        this.line = new Konva.Line({
            stroke: initParams.strokeColor,
            strokeWidth: initParams.strokeWidth,
            opacity: initParams.opacity,
            width: initParams.width,
            height: initParams.height,
            points: initParams.points,
            ...lineCommonParameters
        })
    }

    getPoints() {
        return this.line.points();
    }

    setPoints(points: Array<number>) {
        this.line.points(points);
    }

    getScale(): { x: number, y: number } {
        return this.line.scale();
    }

    setScale(x: number, y: number) {
        this.line.scale({ x: x, y: y });
    }

    remove() {
        this.line.remove();
    }

    getStrokeColor() {
        return this.line.stroke();
    }

    getStrokeWidth() {
        return this.line.strokeWidth();
    }

    getOpacity() {
        return this.line.opacity();
    }

    getInitalWidth() {
        return this.line.attrs.width;
    }

    getInitialHeight() {
        return this.line.attrs.height;
    }

    getInstance(): any {
        return this.line;
    }
}

export default Line