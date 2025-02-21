import { DrawingMode, IStartDrawingOptions } from "./../../constants";
import { IKonvaWrapper } from "./../../konva/konva-wrapper.interface";
import { IDrawing } from "./drawing.interface";
class Drawing implements IDrawing {
    konvaWrapper: IKonvaWrapper;

    constructor(konvaWrapper: IKonvaWrapper) {
        this.konvaWrapper = konvaWrapper;
    }

    start(mode: DrawingMode, options: IStartDrawingOptions) {
        this.konvaWrapper.startDrawing(mode, options);
    }

    stop() {
        this.konvaWrapper.stopDrawing();
    }

    setStrokeColor(color: string) {
        this.konvaWrapper.setStrokeColor(color);
    }

    setStrokeWidth(width: number) {
        this.konvaWrapper.setStrokeWidth(width);
    }

}

export default Drawing;