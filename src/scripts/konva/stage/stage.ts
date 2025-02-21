import Konva from "konva";
import { ILine } from "./../line/line.interface";
import { IStage, IStageInitParams } from "./stage.interface";
class Stage implements IStage {
    private stage: Konva.Stage

    constructor(initparams: IStageInitParams) {
        this.stage = new Konva.Stage({
            container: initparams.container,
            width: initparams.width,
            height: initparams.height
        })
        let layer = new Konva.Layer();
        this.stage.add(layer);
        this.stage.batchDraw();
        layer.batchDraw();
    }

    addLine(line: ILine) {
        this.stage.getLayers()[0].add(line.getInstance());
    }

    getLines(): Array<any> {
        return this.stage.find('Line');
    }

    on(events: string, eventHandler: any) {
        this.stage.on(events, eventHandler)
    }

    clearStage() {
        this.stage.getLayers()[0].destroyChildren();
    }

    batchDraw() {
        this.stage.batchDraw();
    }

    getPointerPosition(): { x: number, y: number } {
        return this.stage.getPointerPosition();
    }

    getWidth() {
        return this.stage.width();
    }

    setWidth(width: number) {
        this.stage.width(width);
    }

    getHeight() {
        return this.stage.height();
    }

    setHeight(height: number) {
        this.stage.height(height);
    }

    destroy() {
        this.stage.destroy();
    }

    fire(type, eventObj) {
        this.stage.fire(type, eventObj)
    }

    setPointersPositions(event) {
        this.stage.setPointersPositions(event);
    }
}

export default Stage