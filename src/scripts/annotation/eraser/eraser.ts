import { IKonvaWrapper } from "./../../konva/konva-wrapper.interface";
import { IEraser } from "./eraser.interface";

class Eraser implements IEraser {
    konvaWrapper: IKonvaWrapper

    constructor(konvaWrapper: IKonvaWrapper) {
        this.konvaWrapper = konvaWrapper;
    }

    start() {
        this.konvaWrapper.activateEraser();
    }

    stop() {
        this.konvaWrapper.deactivateEraser();
    }
}

export default Eraser