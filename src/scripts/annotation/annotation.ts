import { cursorArray, IOptions } from "./../constants";
import Drawing from "./drawing/drawing";
import { IDrawing } from "./drawing/drawing.interface";
import Eraser from "./eraser/eraser";
import { IEraser } from "./eraser/eraser.interface";
import { IKonvaWrapper } from "./../konva/konva-wrapper.interface";
import KonvaWrapper from "./../konva/konva-wrapper";
import { IAnnotation } from "./annotation.interface";
class Annotation implements IAnnotation {

    private konvaWrapperInstance: IKonvaWrapper
    public Drawing: IDrawing;
    public Eraser: IEraser;

    constructor(drawingAreas: Array<string>, options: IOptions) {
        this.konvaWrapperInstance = new KonvaWrapper(drawingAreas, options);
        this.Drawing = new Drawing(this.konvaWrapperInstance);
        this.Eraser = new Eraser(this.konvaWrapperInstance);
        if (typeof Object.assign != "function") {
            Object.defineProperty(Object, "assign", {
              value: function assign(target, varArgs) {
                "use strict";
                if (target == null) {
                  throw new TypeError("Cannot convert undefined or null to object");
                }
                var to = Object(target);
                for (var index = 1; index < arguments.length; index++) {
                  var nextSource = arguments[index];
                  if (nextSource != null) {
                    for (var nextKey in nextSource) {
                      if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                      }
                    }
                  }
                }
                return to;
              },
              writable: true,
              configurable: true
            });
          }
    }

    reset() {
        this.konvaWrapperInstance.reset();
    }

    getState() {
        return this.konvaWrapperInstance.getState();
    }

    setState(stateObj) {
        this.konvaWrapperInstance.setState(stateObj);
    }

    isUndoAvailable() {
        return this.konvaWrapperInstance.isUndoAvailable();
    }

    undo() {
        this.konvaWrapperInstance.undo();
    }

    isRedoAvailable() {
        return this.konvaWrapperInstance.isRedoAvailable();
    }

    redo() {
        this.konvaWrapperInstance.redo();
    }

    setZoom(width: number, height: number) {
        this.konvaWrapperInstance.setZoom(width, height);
    }

    destroy() {
        this.konvaWrapperInstance.destroy();
    }

    addCustomCursors(cursorsArray: Array<cursorArray>) {
        this.konvaWrapperInstance.addCustomCursors(cursorsArray);
    }

    clearAll() {
        this.konvaWrapperInstance.clearAll();
    }
}

export default Annotation;