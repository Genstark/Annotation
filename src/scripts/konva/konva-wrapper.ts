import Konva from "konva";
import { ActionType, Keys, cursorArray, CursorType, DrawingMode, EventsEnum, IOptions, IStartDrawingOptions, KEYBOARD_CURSOR_DIV_ID } from "./../constants";
import { hexToRgb } from "./../util";
import { IActionObject, IKonvaWrapper, IUndoRedoObject } from "./konva-wrapper.interface";
import { ILine } from "./line/line.interface";
import Line from './line/line'
import Stage from './stage/stage'
import { IStage } from "./stage/stage.interface";
class KonvaWrapper implements IKonvaWrapper {

    private stageMap: { [drawingArea: string]: IStage };
    private penOpacity: number;
    private highlighterOpacity: number;
    private resolution: number;
    private containmentBox: any;

    // properties for drawing
    private isDrawingActive: boolean;
    private strokeColor: string;
    private strokeWidth: number;
    private globalMouseTracker: boolean;
    private currentDrawingMode: DrawingMode

    //properties for erasing
    private isErasingActive: boolean;

    //for maintaining single line
    private lastLine: ILine;
    private startingDrawingArea: string;
    private currentDrawingArea: string;
    private lastPosition: any;

    private lastLine2: ILine;
    private startingDrawingArea2: string;
    private currentDrawingArea2: string;
    private lastPosition2: any;

    private events: any;

    private baseWidth: number;
    private baseHeight: number;
    private currentWidth: number;
    private currentHeight: number;


    //border color width
    private borderColor: string = 'black'; // Default border color
    private borderThickness: number = 2;   // Default additional thickness for border
    private highlighterBorderOpacity: number = 1; // Default border opacity
    private lastBorderLine: ILine;

    private lastAngle: number | null = null;

    //properties for selection box
    private selectionBox: any;
    private isSelectionBoxActive: boolean;
    private selectionBoxInitialX: any;
    private selectionBoxInitialY: any;

    // private currentHighlight;
    // private leftEdge;
    // private rightEdge;
    private startCap: ILine;
    private endCap: ILine;

    private lastEndCap: any;
    private lastStartCap: any;
    private lastLeftEdge: any;
    private lastRightEdge: any;
    private edgeOffset: any;
    // private lockedPoints: any;

    //properties for undo/redo stack
    private undoStack: Array<IUndoRedoObject>;
    private redoStack: Array<IUndoRedoObject>;

    //properties for cursor
    private defaultCursor;
    private penCustomCursor;
    private highlighterCustomCursor;
    private eraserCustomCursor;
    private mouseleave;
    private containmentDiv;

    //get last coordinates of hightlight
    private lastCordinates: any;
    private currentStrokeWidth: any;

    //properties for keyboard accessbility
    private shiftPressed;



    constructor(drawingAreas: Array<string>, options: IOptions) {
        this.stageMap = {}
        this.penOpacity = options.penOpacity && options.penOpacity <= 1 ? options.penOpacity : 1;
        this.highlighterOpacity = options.highlighterOpacity && options.highlighterOpacity ? options.highlighterOpacity : 0.6;
        this.resolution = options.resolution ? options.resolution : 3
        this.isDrawingActive = false;
        this.strokeColor = "#000000";
        this.strokeWidth = 4;
        this.lastLine = null;
        this.currentDrawingArea = '';
        this.startingDrawingArea = '';
        this.globalMouseTracker = false;
        this.currentDrawingMode = DrawingMode.PEN;
        this.baseWidth = options.baseWidth || 295;
        this.baseHeight = options.baseHeight || 420;
        this.isErasingActive = false;
        this.isSelectionBoxActive = false;
        this.undoStack = [];
        this.redoStack = [];
        this.penCustomCursor;
        this.highlighterCustomCursor;
        this.eraserCustomCursor;
        this.lastPosition;
        this.containmentDiv = options.containment;


        this.events = options.events;
        //bind this to handler 
        this.bindThisOnHandlers()

        //bind events on containment box
        this.bindEventsOnContainmentBox(options.containment)
        this.bindEventsOnWindow();
        this.trackMousePositionOnWindow();
        this.initSelectionBox(options.containment)

        // initlize stage instance
        drawingAreas.forEach((drawingArea: string) => {
            this.stageMap[drawingArea] = this.createKonvaStage(drawingArea);
        })
        if (options.cursorsArray) {
            this.addCustomCursors(options.cursorsArray);
        }

        this.mouseleave = false;
    }

    startDrawing(mode: DrawingMode, options?: IStartDrawingOptions) {
        console.log(options.strokeWidth);
        let isDrawingAlreadyActive = this.isDrawingActive;
        this.isDrawingActive = true;
        this.currentDrawingMode = mode;
        options && options.strokeColor ? this.strokeColor = options.strokeColor : null;
        options && options.strokeWidth ? this.strokeWidth = options.strokeWidth : null;
        this.isErasingActive && this.deactivateEraser();
        this.addCursorForDrawing(mode, !isDrawingAlreadyActive);
    }

    stopDrawing() {
        this.isDrawingActive = false;
        this.removeCursorForDrawing();
    }

    setStrokeColor(color: string) {
        this.strokeColor = color;
        this.isDrawingActive && this.addCursorForDrawing(this.currentDrawingMode, false);
    }

    setStrokeWidth(width: number) {
        this.strokeWidth = width;
        this.isDrawingActive && this.addCursorForDrawing(this.currentDrawingMode, false);
    }

    activateEraser() {
        this.isErasingActive = true;
        this.selectionBox.style.zIndex = '7';
        this.isDrawingActive && this.stopDrawing();
        this.addCursorForEraser();
    }

    deactivateEraser() {
        this.isErasingActive = false;
        this.selectionBox.style.zIndex = '-1';
        this.removeCursorForEraser();
    }

    getState() {
        let dataMap = {};
        Object.keys(this.stageMap).forEach(drawingArea => {
            dataMap[drawingArea] = this.getMinifiedJsonFromStage(this.stageMap[drawingArea])
        })
        return dataMap;
    }

    setState(stateObj) {
        this.reset();
        Object.keys(stateObj).forEach(drawArea => {
            let minifiedJson = stateObj[drawArea];
            if (this.stageMap[drawArea] && minifiedJson) {
                this.drawLineFromMinifiedJson(this.stageMap[drawArea], minifiedJson);
            }

        })
        // commented bcz it was causing a bug of triggering event(API calls) when setAnnotationState is called on every page load.
        // this.tiggerStateChange();
    }

    reset() {
        this.undoStack = [];
        this.redoStack = [];
        Object.keys(this.stageMap).forEach(drawingArea => {
            this.clearLineFromStage(this.stageMap[drawingArea]);
        })
    }

    clearAll() {
        let actions: Array<IActionObject> = [];
        let isStateChange = false;
        Object.keys(this.stageMap).forEach(drawingArea => {
            let currentStage = this.stageMap[drawingArea];
            let linesFromStage: Array<any> = currentStage.getLines();
            let stageJson = this.getMinifiedJsonFromStage(currentStage);
            if (linesFromStage.length != 0) {
                isStateChange = true;
                currentStage.clearStage();
                actions.push({
                    drawingArea: drawingArea,
                    data: stageJson as string
                })
            }
        })

        if (isStateChange) {
            let undoObj: IUndoRedoObject = {
                actionType: ActionType.DELETE,
                actions: actions
            }
            this.undoStack.push(undoObj);
            this.tiggerStateChange()
        }
    }

    isUndoAvailable() {
        return this.undoStack.length > 0;
    }

    undo() {
        if (this.undoStack.length == 0) {
            return;
        }

        let undoObject: IUndoRedoObject = this.undoStack.pop() as any;

        if (undoObject.actionType === ActionType.LINE) {
            undoObject.actions.forEach((action: IActionObject) => {
                let linesFromStage = this.stageMap[action.drawingArea].getLines();
                if (linesFromStage.length != 0) {
                    linesFromStage[linesFromStage.length - 1].remove();
                }
                this.stageMap[action.drawingArea].batchDraw();

            });
        } else if (undoObject.actionType === ActionType.DELETE) {
            undoObject.actions.forEach((action: IActionObject) => {
                let stateJson = action.data as string;
                let stage = this.stageMap[action.drawingArea];
                // updating data key in action object with current stage json for performing redo action.
                action.data = this.getMinifiedJsonFromStage(stage)
                this.clearLineFromStage(stage);
                this.drawLineFromMinifiedJson(stage, stateJson);
            });
        }
        this.redoStack.push(undoObject);
        this.tiggerStateChange();
    }

    isRedoAvailable() {
        return this.redoStack.length > 0;
    }

    redo() {
        if (this.redoStack.length == 0) {
            return;
        }

        let redoObject: IUndoRedoObject = this.redoStack.pop() as any;

        if (redoObject.actionType === ActionType.LINE) {
            redoObject.actions.forEach((action: IActionObject) => {
                let line = action.data as ILine
                this.stageMap[action.drawingArea].addLine(line);
                this.stageMap[action.drawingArea].batchDraw();
            });
        } else if (redoObject.actionType === ActionType.DELETE) {
            redoObject.actions.forEach((action: IActionObject) => {
                let stateJson = action.data as string;
                let stage = this.stageMap[action.drawingArea];
                // updating data key in action object with current stage json for performing undo action.
                action.data = this.getMinifiedJsonFromStage(stage)
                this.clearLineFromStage(stage);
                this.drawLineFromMinifiedJson(stage, stateJson);
            });
        }
        this.undoStack.push(redoObject);
        this.tiggerStateChange();
    }

    setZoom(width: number, height: number) {

        if (width == this.currentWidth && height == this.currentHeight) {
            return;
        }

        let xScalingFactor = width / this.currentWidth;
        let yScalingFactor = height / this.currentHeight;

        this.currentWidth = width;
        this.currentHeight = height;

        Object.keys(this.stageMap).forEach(containerId => {
            let currentStage = this.stageMap[containerId];
            currentStage.setWidth(width);
            currentStage.setHeight(height);

            let lines: Array<any> = currentStage.getLines();

            lines.forEach((line: Konva.Line) => {
                let currentScale = line.scale();
                line.scaleX(currentScale.x * xScalingFactor);
                line.scaleY(currentScale.y * yScalingFactor);
            })
        })

        if (this.isDrawingActive) {
            this.addCursorForDrawing(this.currentDrawingMode, false);
        }
    }


    destroy() {
        Object.keys(this.stageMap).forEach(drawingArea => {
            this.stageMap[drawingArea].destroy();
        })

        this.stageMap = {};

        this.containmentBox.removeEventListener('mousedown', this._contaimentMouseDownHandler);
        this.containmentBox.removeEventListener('touchstart', this._contaimentMouseDownHandler);
        this.containmentBox.removeEventListener('mouseleave', this._contaimentMouseLeaveHandler);
        this.containmentBox.removeEventListener('touchend', this._contaimentMouseLeaveHandler);
        this.containmentBox.removeEventListener('mouseup', this._contaimentMouseUpHandler);
        this.containmentBox.removeEventListener('touchend', this._contaimentMouseUpHandler);
        document.removeEventListener('keyup', this._contaimentKeyUpHandler);
        document.removeEventListener('keydown', this._contaimentKeyDownHandler);
        this.containmentBox.removeEventListener('mousedown', this._selectionBoxMouseDownHandler);
        this.containmentBox.removeEventListener('touchstart', this._selectionBoxMouseDownHandler);
        this.containmentBox.removeEventListener('mouseup', this._selectionBoxMouseUpHandler);
        this.containmentBox.removeEventListener('touchend', this._selectionBoxMouseUpHandler);
        this.containmentBox.removeEventListener('mousemove', this._selectionBoxMouseMoveHandler);
        this.containmentBox.removeEventListener('touchmove', this._selectionBoxMouseMoveHandler);
        this.containmentBox.removeEventListener('mouseleave', this._selectionBoxMouseLeaveHandler);
        this.containmentBox.removeEventListener('touchend', this._selectionBoxMouseLeaveHandler);


        this.containmentBox = null;
        this.selectionBox = null;

        window.removeEventListener('mousemove', this._windowMouseMoveCallback);
        window.removeEventListener('mouseup', this._windowMouseUpCallback);
    }

    addCustomCursors(cursorsArray: Array<cursorArray>) {
        cursorsArray.map((cursor) => {
            if (cursor.type == CursorType.PEN) {
                this.penCustomCursor = cursor.cursor;
            }
            else if (cursor.type == CursorType.HIGHLIGHTER) {
                this.highlighterCustomCursor = cursor.cursor;
            } else {
                this.eraserCustomCursor = cursor.cursor;
            }
        });
    }

    private bindThisOnHandlers() {
        this._selectionBoxMouseDownHandler = this._selectionBoxMouseDownHandler.bind(this);
        this._selectionBoxMouseMoveHandler = this._selectionBoxMouseMoveHandler.bind(this);
        this._selectionBoxMouseUpHandler = this._selectionBoxMouseUpHandler.bind(this);
        this._selectionBoxMouseLeaveHandler = this._selectionBoxMouseLeaveHandler.bind(this);

        this._contaimentMouseDownHandler = this._contaimentMouseDownHandler.bind(this);
        this._contaimentMouseLeaveHandler = this._contaimentMouseLeaveHandler.bind(this);
        this._contaimentMouseUpHandler = this._contaimentMouseUpHandler.bind(this);
        this._contaimentKeyUpHandler = this._contaimentKeyUpHandler.bind(this);
        this._contaimentKeyDownHandler = this._contaimentKeyDownHandler.bind(this);
        this._windowMouseMoveCallback = this._windowMouseMoveCallback.bind(this);
        this._windowMouseUpCallback = this._windowMouseUpCallback.bind(this);
    }

    private initSelectionBox(containmentSelector) {
        let containmentDiv = document.querySelector(containmentSelector);
        if (containmentDiv == null) {
            throw new Error('containment div not found');
        }

        let selectionBox = document.createElement('div');
        selectionBox.setAttribute('id', 'selection-box');
        selectionBox.style.position = 'absolute';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px'
        selectionBox.style.top = '0px';
        selectionBox.style.left = '0px';
        selectionBox.style.background = 'grey';
        selectionBox.style.opacity = '0.5';

        this.selectionBox = selectionBox;

        containmentDiv.appendChild(selectionBox);

        containmentDiv.addEventListener('mousedown', this._selectionBoxMouseDownHandler);
        containmentDiv.addEventListener('touchstart', this._selectionBoxMouseDownHandler);
        containmentDiv.addEventListener('mouseup', this._selectionBoxMouseUpHandler);
        containmentDiv.addEventListener('touchend', this._selectionBoxMouseUpHandler);
        containmentDiv.addEventListener('mousemove', this._selectionBoxMouseMoveHandler);
        containmentDiv.addEventListener('touchmove', this._selectionBoxMouseMoveHandler);
        containmentDiv.addEventListener('mouseleave', this._selectionBoxMouseLeaveHandler);
        containmentDiv.addEventListener('touchend', this._selectionBoxMouseLeaveHandler);

    }

    private bindEventsOnContainmentBox(containerSelector) {
        let containmentBox = document.querySelector(containerSelector);
        if (containmentBox == null) {
            throw new Error('container not for' + containerSelector);
        }
        containmentBox.addEventListener('mousedown', this._contaimentMouseDownHandler);
        containmentBox.addEventListener('touchstart', this._contaimentMouseDownHandler);
        containmentBox.addEventListener('mouseleave', this._contaimentMouseLeaveHandler);
        containmentBox.addEventListener('touchend', this._contaimentMouseLeaveHandler);
        containmentBox.addEventListener('mouseup', this._contaimentMouseUpHandler);
        containmentBox.addEventListener('touchend', this._contaimentMouseUpHandler);
        document.addEventListener('keydown', this._contaimentKeyDownHandler);
        document.addEventListener('keyup', this._contaimentKeyUpHandler);
        this.containmentBox = containmentBox;
    }

    private bindEventsOnWindow() {
        window.addEventListener('mousemove', this._windowMouseMoveCallback);
        window.addEventListener('mouseup', this._windowMouseUpCallback);
    }

    private trackMousePositionOnWindow() {
        window['currentMouseX'] = 0;
        window['currentMouseY'] = 0;

        // Guess the initial mouse position approximately if possible:
        var hoveredElement: any = document.querySelectorAll(':hover');
        hoveredElement = hoveredElement[hoveredElement.length - 1]; // Get the most specific hovered element

        if (hoveredElement != null) {
            var rect = hoveredElement.getBoundingClientRect();
            // Set the values from hovered element's position
            window['currentMouseX'] = window.scrollX + rect.x;
            window['currentMouseY'] = window.scrollY + rect.y;
        }

        // Listen for mouse movements to set the correct values
        window.addEventListener('mousemove', function (e) {
            window['currentMouseX'] = e.pageX;
            window['currentMouseY'] = e.pageY;
        }, /*useCapture=*/true);
    }

    private _selectionBoxMouseDownHandler(event) {
        if (this.isErasingActive == true) {
            let x = event.x;
            let y = event.y;
            if (event.type == 'touchstart') {
                x = event.touches[0].pageX;
                y = event.touches[0].pageY;
            }
            let containmentRect = this.containmentBox.getBoundingClientRect();
            this.selectionBoxInitialX = x - containmentRect.left;
            this.selectionBoxInitialY = y - containmentRect.top;
            this.isSelectionBoxActive = true;
            this.selectionBox.style.border = '2px solid black';
            this.selectionBox.style.left = this.selectionBoxInitialX + 'px';
            this.selectionBox.style.top = this.selectionBoxInitialY + 'px';
            event.preventDefault();
        }
    }

    private _selectionBoxMouseMoveHandler(event) {
        if (this.isErasingActive == true && this.isSelectionBoxActive == true) {
            this.mouseleave = false;
            let x = event.x;
            let y = event.y;
            if (event.type == 'touchmove') {
                x = event.touches[0].pageX;
                y = event.touches[0].pageY;
            }
            let containmentRect = this.containmentBox.getBoundingClientRect();
            let newX = x - containmentRect.left;
            let newY = y - containmentRect.top;
            let left, top, width, height;

            if (newX < this.selectionBoxInitialX) {
                left = newX;
                width = this.selectionBoxInitialX - newX;
            } else {
                left = this.selectionBoxInitialX;
                width = newX - this.selectionBoxInitialX
            }

            if (newY < this.selectionBoxInitialY) {
                top = newY;
                height = this.selectionBoxInitialY - newY;
            } else {
                top = this.selectionBoxInitialY;
                height = newY - this.selectionBoxInitialY;
            }

            this.selectionBox.style.top = top + 'px';
            this.selectionBox.style.left = left + 'px';
            this.selectionBox.style.width = width + 'px';
            this.selectionBox.style.height = height + 'px';
            event.preventDefault();
        }
    }

    private _selectionBoxMouseUpHandler(event) {
        if (this.isErasingActive == true && this.isSelectionBoxActive == true) {
            this.isSelectionBoxActive = false;
            //add delete logic here;
            this.deleteLines();
            //resetting selection box
            this.selectionBox.style.top = '0px';
            this.selectionBox.style.left = '0px';
            this.selectionBox.style.width = '0px';
            this.selectionBox.style.height = '0px';
            this.selectionBox.style.border = 'none';
            event.preventDefault();
        }
    }

    private _selectionBoxMouseLeaveHandler(event) {
        if (this.isErasingActive == true && this.isSelectionBoxActive == true) {
            let mouseMoveEvent: any = new Event('mousemove');
            if (event.type == 'touchend') {
                mouseMoveEvent.x = event.touches[0].pageX;
                mouseMoveEvent.y = event.touches[0].pageY;
            }
            else {
                mouseMoveEvent.x = event.x;
                mouseMoveEvent.y = event.y;
            }
            this.containmentBox.dispatchEvent(mouseMoveEvent);
            this.mouseleave = true;
        }
    }

    private _windowMouseUpCallback(event) {
        if (this.isErasingActive == true && this.isSelectionBoxActive == true) {
            this.mouseleave = false;

            this.isSelectionBoxActive = false;
            //add delete logic here;
            this.deleteLines();
            //resetting selection box
            this.selectionBox.style.top = '0px';
            this.selectionBox.style.left = '0px';
            this.selectionBox.style.width = '0px';
            this.selectionBox.style.height = '0px';
            this.selectionBox.style.border = 'none';
            event.preventDefault();
        }
    }

    private _windowMouseMoveCallback(e) {
        if (this.mouseleave) {
            let x = e.x;
            let y = e.y;
            if (e.type == 'touchmove') {
                x = e.touches[0].pageX;
                y = e.touches[0].pageY
            }
            let containmentRect = this.containmentBox.getBoundingClientRect();
            let newX = x < containmentRect.left ? 0 : (x - containmentRect.left > containmentRect.width ? containmentRect.width : x - containmentRect.left);
            let newY = y < containmentRect.top ? 0 : Math.min(y - containmentRect.top, containmentRect.height);
            let left, top, width, height;

            if (newX < this.selectionBoxInitialX) {
                left = newX;
                width = this.selectionBoxInitialX - newX;
            } else {
                left = this.selectionBoxInitialX;
                width = newX - this.selectionBoxInitialX
            }

            if (newY < this.selectionBoxInitialY) {
                top = newY;
                height = this.selectionBoxInitialY - newY;
            } else {
                top = this.selectionBoxInitialY;
                height = newY - this.selectionBoxInitialY;
            }

            this.selectionBox.style.top = top + 'px';
            this.selectionBox.style.left = left + 'px';
            this.selectionBox.style.width = width + 'px';
            this.selectionBox.style.height = height + 'px';
            e.preventDefault();
        }
    }


    private _contaimentMouseDownHandler(event) {
        this.globalMouseTracker = true;
    }

    private _moveKeyboardCursor(event, coords, currentHoverElementId) {
        let { currentXCoordinate, currentYCoordinate } = coords;
        let step = 2;
        if (event.altKey && event.ctrlKey) {
            step = 4;
        }
        switch (event.key) {
            case Keys.LEFT:
                currentXCoordinate -= step;
                break;
            case Keys.RIGHT:
                currentXCoordinate += step;
                break;
            case Keys.UP:
                currentYCoordinate -= step;
                break;
            case Keys.DOWN:
                currentYCoordinate += step;
                break;
        }

        // Only enable globalMouseTracker if Shift key is pressed with Arrow keys and the Shift key was pressed for the first time in the drawing area.
        if (event.shiftKey && event.ctrlKey && this.shiftPressed) {
            this.globalMouseTracker = true;
        }
        let ev = new MouseEvent("mousemove", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: Math.round(currentXCoordinate),
            clientY: Math.round(currentYCoordinate)
        });
        // Send event
        if (document.querySelector(currentHoverElementId + " canvas")) {
            document.querySelector(currentHoverElementId + " canvas").dispatchEvent(ev);
        } else {
            document.querySelector("body").dispatchEvent(ev);
        }

        let keyboardCursorDivFound: any = document.querySelector(`#${KEYBOARD_CURSOR_DIV_ID}`);

        //Adjust cursor div as per steps taken by arrow keys
        if (keyboardCursorDivFound) {
            keyboardCursorDivFound.style.top = (currentYCoordinate) + "px";
            keyboardCursorDivFound.style.left = (currentXCoordinate) + "px";
        }
    }

    /*
        we are mimicking mousedown for keydown, mouseup for keyup, mousemove for movement for keyboard cursor
    */
    private _contaimentKeyDownHandler = function (event) {
        if (event.target && event.target.nodeName && event.target.nodeName == "INPUT") {
            return;
        }

        if (this.isDrawingActive || this.isErasingActive) {
            if ((event.ctrlKey || event.metaKey) && event.key && event.key.toLowerCase() === Keys.Z && !event.shiftKey) {
                // Call Undo 
                this.undo();
                return;
            }
            if (event.key && ((event.ctrlKey && event.key.toLowerCase() === Keys.Y) || (event.metaKey && event.shiftKey && event.key.toLowerCase() === Keys.Z))) {
                // Call Redo 
                this.redo();
                return;
            }

            let currentXCoordinate = Math.round(window['currentMouseX']);
            let currentYCoordinate = Math.round(window['currentMouseY']);

            let currentHoverElementId; // indicates the element where mouse is currently present
            let drawingContainersIds = Object.keys(this.stageMap);
            let drawingContainers = document.querySelectorAll(drawingContainersIds.join(",")); // array of drawing containers


            //Check if the current mouse position is present within the drawing containers
            for (let i = 0; i < drawingContainers.length; i++) {
                let elem = drawingContainers[i];
                let boundingRect = elem.getBoundingClientRect();
                if (currentXCoordinate >= Math.floor(boundingRect.x) && currentXCoordinate <= (Math.floor(boundingRect.x) + Math.floor(boundingRect.width)) &&
                    currentYCoordinate >= Math.floor(boundingRect.y) && currentYCoordinate <= (Math.floor(boundingRect.y) + Math.floor(boundingRect.height))) {
                    currentHoverElementId = drawingContainersIds[i];
                    break;
                }
            }

            if ([Keys.SHIFT, Keys.CONTROL, Keys.LEFT, Keys.RIGHT, Keys.UP, Keys.DOWN].indexOf(event.key) !== -1) {
                let pointerWidth = this.currentWidth / this.baseWidth * this.strokeWidth;

                if (event.shiftKey && event.ctrlKey) {
                    // Send mouse down event only if Shift pressed first time in the drawing area.

                    if (!this.shiftPressed && currentHoverElementId) {
                        this.shiftPressed = true;
                        let evMouseDown = new MouseEvent("mousedown", {
                            view: window,
                            bubbles: true,
                            cancelable: true,
                            clientX: currentXCoordinate,
                            clientY: currentYCoordinate
                        });
                        if (document.querySelector(currentHoverElementId + " canvas")) {
                            document.querySelector(currentHoverElementId + " canvas").dispatchEvent(evMouseDown);
                        }
                    }
                }

                if ([Keys.LEFT, Keys.RIGHT, Keys.UP, Keys.DOWN].indexOf(event.key) !== -1) {

                    let keyboardCursorDiv: any = document.querySelector(`#${KEYBOARD_CURSOR_DIV_ID}`);

                    if (!keyboardCursorDiv) {
                        //create new cursor only if no cursor already exists in DOM
                        keyboardCursorDiv = document.createElement('div');
                        keyboardCursorDiv.id = KEYBOARD_CURSOR_DIV_ID;
                    }

                    keyboardCursorDiv.style.cssText = 'font-size:' + (pointerWidth * 2) + 'px;line-height:0.5;position:fixed;z-index:1000;width:' + (pointerWidth) + 'px;height:' + (pointerWidth) + 'px;';
                    if (this.isDrawingActive) {
                        keyboardCursorDiv.style.backgroundColor = this.strokeColor;
                        keyboardCursorDiv.style.transform = 'translate(-' + (pointerWidth / 2) + "px,-" + (pointerWidth / 2) + "px)";
                    } else if (this.isErasingActive) {
                        keyboardCursorDiv.innerHTML = "+";
                        keyboardCursorDiv.style.color = "#000";
                        keyboardCursorDiv.style.transform = 'translate(-' + (pointerWidth / 2) + "px,-" + (pointerWidth / 2) + "px)";
                    }

                    //cursor div is only visible when arrow key is pressed
                    document.body.appendChild(keyboardCursorDiv);
                    keyboardCursorDiv.style.top = (currentYCoordinate) + "px";
                    keyboardCursorDiv.style.left = (currentXCoordinate) + "px";
                }

                this.isDrawingActive && this.addCursorForDrawing(this.currentDrawingMode, false);
                this.isErasingActive && this.addCursorForEraser()
                this._moveKeyboardCursor(event, { currentXCoordinate, currentYCoordinate }, currentHoverElementId)
            }
        }

    };

    private _contaimentKeyUpHandler = function (event) {
        if (event.key === Keys.SHIFT || event.key === Keys.CONTROL) {
            this.globalMouseTracker = false;
            this.shiftPressed = false;

            let keyboardCursorDiv = document.querySelector(`#${KEYBOARD_CURSOR_DIV_ID}`);
            if (keyboardCursorDiv) {
                keyboardCursorDiv.remove();
            }
            let evMouseUp = new MouseEvent("mouseup", {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: Math.round(window['currentMouseX']),
                clientY: Math.round(window['currentMouseY'])
            });
            let drawingContainersIds = Object.keys(this.stageMap);
            for (let i = 0; i < drawingContainersIds.length; i++) {
                document.querySelector(drawingContainersIds[i] + " canvas").dispatchEvent(evMouseUp);
            }
            if (this.isDrawingActive) {
                this.addCursorForDrawing(this.currentDrawingMode, false);
            }

            if (this.isErasingActive) {
                this.addCursorForEraser()
            }
            this.tiggerStateChange();
        }
    };

    private _contaimentMouseLeaveHandler(event) {
        if (this.globalMouseTracker == true) {
            this.globalMouseTracker = false;
            this.tiggerStateChange();
        }
    }

    private _contaimentMouseUpHandler(event) {
        this.globalMouseTracker = false;
    }

    private _calculateParallelOffset(points: number[], index: number, offset: number) {
        let dx, dy;

        // Calculate direction vector
        if (index === 0) {
            // First point - use vector to next point
            dx = points[2] - points[0];
            dy = points[3] - points[1];
        } else if (index >= points.length - 2) {
            // Last point - use vector from previous point
            dx = points[index] - points[index - 2];
            dy = points[index + 1] - points[index - 1];
        } else {
            // Middle points - average of vectors
            const dx1 = points[index] - points[index - 2];
            const dy1 = points[index + 1] - points[index - 1];
            const dx2 = points[index + 2] - points[index];
            const dy2 = points[index + 3] - points[index + 1];
            dx = (dx1 + dx2) / 2;
            dy = (dy1 + dy2) / 2;
        }

        // Normalize and calculate perpendicular vector
        const length = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        const perpX = -normalizedDy * offset;
        const perpY = normalizedDx * offset;

        return { x: perpX, y: perpY };
    }


    private _stageMouseDownHandler(drawingArea, eventObj) {
        console.log('mouse down');
        console.log(drawingArea);
        if (this.isDrawingActive) {
            this.globalMouseTracker = true;
            let currentState: IStage = this.stageMap[drawingArea];
            let pos: any = currentState.getPointerPosition();
            pos.x = Math.floor(pos.x);
            pos.y = Math.floor(pos.y);
            let scale = this.currentWidth / this.baseWidth;

            // Highlighter Stroke
            let line = new Line({
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth * scale,
                opacity: this.currentDrawingMode === DrawingMode.PEN ? this.penOpacity : this.highlighterOpacity,
                points: [pos.x, pos.y],
                width: this.currentWidth,
                height: this.currentHeight,
            });
            currentState.addLine(line);

            // Track the last drawn elements for undo/redo
            this.lastLine = line;
            // this.lastBorderLine = borderLine;
            // this.lastLine2 = borderLine2;
            this.startingDrawingArea = drawingArea;
            this.currentDrawingArea = drawingArea;
            this.lastPosition = JSON.parse(JSON.stringify(pos));
            // this.lockedPoints = JSON.parse(JSON.stringify(this.lastLine.getPoints()));

            // Add to undo stack
            let undoObj: IUndoRedoObject = {
                actionType: ActionType.LINE,
                actions: [
                    { drawingArea: drawingArea, data: line },
                ],
            };
            this.undoStack.push(undoObj);
            this.redoStack = [];

            eventObj.evt.preventDefault();
        }
    }


    private _stageMouseMoveHandler(drawingArea, eventObj) {
        this.currentDrawingArea = drawingArea;
        if (!this.isDrawingActive || !this.globalMouseTracker) {
            return;
        }

        const pos: any = this.stageMap[drawingArea].getPointerPosition();
        pos.x = Math.floor(pos.x);
        pos.y = Math.floor(pos.y);

        let stageWidth = Math.floor(this.stageMap[drawingArea].getWidth());
        let lastPosition = Math.floor(this.lastPosition.x);
        let pointerPosition = pos.x;

        if (eventObj.evt && eventObj.evt.type == 'touchmove') {
            if ((this.lastLine && lastPosition && lastPosition < stageWidth && pointerPosition >= stageWidth) || (this.lastLine && lastPosition && lastPosition > 0 && pointerPosition <= 0)) {
                let newStageMap = Object.keys(this.stageMap).filter((key) => !key.includes(drawingArea)).reduce((cur, key) => { return Object.assign(cur, { [key]: this.stageMap[key] }) }, {});
                let newStageKeys = Object.keys(newStageMap);
                if (newStageKeys.length) {
                    this.stageMap[drawingArea].fire("touchend");
                    this.stageMap[newStageKeys[0]].setPointersPositions(eventObj.evt);
                    this.stageMap[newStageKeys[0]].fire("touchmove");
                    return;
                }
            }
        }

        if (this.currentDrawingArea === "#drawing-area-A") {
            if (pos.x < Math.abs(this.stageMap[drawingArea].getWidth() * 0) - 7) {
                this._stageMouseUpHandler(drawingArea, eventObj);
            }
            else if (pos.y <  Math.abs(this.stageMap[drawingArea].getWidth() * 0 - 7) || pos.y > this.stageMap[drawingArea].getHeight() - 7) {
                this._stageMouseUpHandler(drawingArea, eventObj);
            }
        }
        else if (this.currentDrawingArea === "#drawing-area-B") {
            if (pos.x > this.stageMap[drawingArea].getWidth() - 7) {
                this._stageMouseUpHandler(drawingArea, eventObj);
            }
            else if (pos.y <  Math.abs(this.stageMap[drawingArea].getWidth() * 0 - 7) || pos.y > this.stageMap[drawingArea].getHeight() - 7) {
                this._stageMouseUpHandler(drawingArea, eventObj);
            }
        }

        if (this.currentDrawingArea !== this.startingDrawingArea) {
            console.log('box change');
            this.borderMaker(this.startingDrawingArea);
            let startContainerNewX = Math.abs(0 - pos.x) > Math.abs(this.stageMap[this.startingDrawingArea].getWidth() - pos.x) ? 0 : this.stageMap[this.startingDrawingArea].getWidth();
            let newPoints = this.lastLine && this.lastLine.getPoints().concat([startContainerNewX, pos.y]);
            this.lastLine.setPoints(newPoints);

            let newPosX = Math.abs(0 - pos.x) < Math.abs(this.stageMap[drawingArea].getWidth() - pos.x) ? 0 : this.stageMap[drawingArea].getWidth();
            let line = new Line({
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth * (this.currentWidth / this.baseWidth),
                opacity: this.currentDrawingMode == DrawingMode.PEN ? this.penOpacity : this.highlighterOpacity,
                points: [newPosX, pos.y],
                width: this.currentWidth,
                height: this.currentHeight,
            });

            this.stageMap[drawingArea].addLine(line);
            this.lastLine = line;
            this.lastPosition = pos;
            this.startingDrawingArea = drawingArea;
            this.currentDrawingArea = drawingArea;
            // console.log(this.lastLine);

            let undoObj = {
                drawingArea: drawingArea,
                data: line
            };
            this.undoStack[this.undoStack.length - 1].actions.push(undoObj);
        } else {
            let length = this.lastLine.getPoints().length;
            let lastX = this.lastLine.getPoints()[length - 2];
            let lastY = this.lastLine.getPoints()[length - 1];
            let newX = pos.x;
            let newY = pos.y;
            let dx = newX - lastX;
            let dy = newY - lastY;
            if (Math.sqrt(dx * dx + dy * dy) < this.resolution) {
                return;
            }
            let newPoints = this.lastLine.getPoints().concat([pos.x, pos.y]);
            this.lastLine.setPoints(newPoints);
        }

        eventObj.evt && eventObj.evt.preventDefault();
    }


    private _stageMouseUpHandler(drawingArea: string, eventObj: any) {
        // this.currentStrokeWidth = this.strokeWidth * (this.currentWidth / this.baseWidth);
        // this.lastCordinates = this.lastLine.getPoints();
        if (this.isDrawingActive && this.globalMouseTracker) {
            this.borderMaker(drawingArea);
            this.globalMouseTracker = false;
            this.tiggerStateChange();
        }
    }

    private borderMaker(drawingArea: string) {
        // this.currentStrokeWidth = this.strokeWidth * (this.currentWidth / this.baseWidth);
        this.lastCordinates = this.lastLine.getPoints();

        if (this.lastCordinates.length >= 4) {
            const points = this.lastCordinates;
            const scale = this.currentWidth / this.baseWidth;
            const borderOffset = (this.strokeWidth / 2) + 2;

            // Calculate start and end vectors
            const startOffset = this._calculateParallelOffset(points, 0, borderOffset);
            const endOffset = this._calculateParallelOffset(points, points.length - 2, borderOffset);
            // console.log(startOffset)

            // Generate points for parallel borders with extended ends
            const leftBorderPoints: number[] = [];
            const rightBorderPoints: number[] = [];

            // Add extended start point for borders
            const extensionLength = borderOffset * 0.1; // Reduced from previous value
            leftBorderPoints.push(
                points[0] + startOffset.x - startOffset.y * extensionLength,
                points[1] + startOffset.y + startOffset.x * extensionLength
            );
            rightBorderPoints.push(
                points[0] - startOffset.x - startOffset.y * extensionLength,
                points[1] - startOffset.y + startOffset.x * extensionLength
            );

            // Add all middle points
            for (let i = 0; i < points.length; i += 2) {
                const offset = this._calculateParallelOffset(points, i, borderOffset);
                leftBorderPoints.push(points[i] + offset.x, points[i + 1] + offset.y);
                rightBorderPoints.push(points[i] - offset.x, points[i + 1] - offset.y);
            }

            // Add extended end point for borders
            leftBorderPoints.push(
                points[points.length - 2] + endOffset.x + endOffset.y * extensionLength,
                points[points.length - 1] + endOffset.y - endOffset.x * extensionLength
            );
            rightBorderPoints.push(
                points[points.length - 2] - endOffset.x + endOffset.y * extensionLength,
                points[points.length - 1] - endOffset.y - endOffset.x * extensionLength
            );

            const leftBorderLine = new Line({
                strokeColor: this.borderColor,
                strokeWidth: 2 * scale,
                opacity: 1,
                points: leftBorderPoints,
                width: this.currentWidth,
                height: this.currentHeight,
            });

            const rightBorderLine = new Line({
                strokeColor: this.borderColor,
                strokeWidth: 2 * scale,
                opacity: 1,
                points: rightBorderPoints,
                width: this.currentWidth,
                height: this.currentHeight,
            });

            // Calculate perpendicular unit vectors for caps
            const startNormal = {
                x: -startOffset.y / Math.sqrt(startOffset.x * startOffset.x + startOffset.y * startOffset.y),
                y: startOffset.x / Math.sqrt(startOffset.x * startOffset.x + startOffset.y * startOffset.y)
            };
            const endNormal = {
                x: -endOffset.y / Math.sqrt(endOffset.x * endOffset.x + endOffset.y * endOffset.y),
                y: endOffset.x / Math.sqrt(endOffset.x * endOffset.x + endOffset.y * endOffset.y)
            };

            // Create caps with adjusted length
            const capLength = borderOffset * 1.2; // Reduced cap length
            const startCap = new Line({
                strokeColor: this.borderColor,
                strokeWidth: 2 * scale,
                opacity: 1,
                points: [
                    points[0] + startOffset.x + startNormal.x * capLength,
                    points[1] + startOffset.y + startNormal.y * capLength,
                    points[0] - startOffset.x + startNormal.x * capLength,
                    points[1] - startOffset.y + startNormal.y * capLength
                ],
                width: this.currentWidth,
                height: this.currentHeight,
            });

            const endCap = new Line({
                strokeColor: this.borderColor,
                strokeWidth: 2 * scale,
                opacity: 1,
                points: [
                    points[points.length - 2] + endOffset.x - endNormal.x * capLength,
                    points[points.length - 1] + endOffset.y - endNormal.y * capLength,
                    points[points.length - 2] - endOffset.x - endNormal.x * capLength,
                    points[points.length - 1] - endOffset.y - endNormal.y * capLength
                ],
                width: this.currentWidth,
                height: this.currentHeight,
            });

            this.stageMap[drawingArea].addLine(leftBorderLine);
            this.stageMap[drawingArea].addLine(rightBorderLine);
            this.stageMap[drawingArea].addLine(startCap);
            this.stageMap[drawingArea].addLine(endCap);

            // Save references for undo/redo
            this.lastBorderLine = leftBorderLine;
            this.lastLine2 = rightBorderLine;
            this.startCap = startCap;
            this.endCap = endCap;

            this.undoStack[this.undoStack.length - 1].actions.push(
                { drawingArea: drawingArea, data: leftBorderLine },
                { drawingArea: drawingArea, data: rightBorderLine },
                { drawingArea: drawingArea, data: startCap },
                { drawingArea: drawingArea, data: endCap }
            );
        }
    }

    private createKonvaStage(drawingArea): Stage {
        console.log('checking');

        let drawingAreaElement = document.querySelector(drawingArea);

        if (drawingAreaElement == null) {
            throw new Error('element not found ' + drawingArea);
        }

        let rectBox: DOMRect = drawingAreaElement.getBoundingClientRect();

        this.currentWidth = rectBox.width;
        this.currentHeight = rectBox.height;

        let stageInstance = new Stage({
            container: drawingArea,
            width: rectBox.width,
            height: rectBox.height
        })

        // binding events on stage
        stageInstance.on("mousedown touchstart", this._stageMouseDownHandler.bind(this, drawingArea));
        stageInstance.on("mouseup touchend", this._stageMouseUpHandler.bind(this, drawingArea));
        stageInstance.on("mousemove touchmove", this._stageMouseMoveHandler.bind(this, drawingArea));
        return stageInstance;
    }


    private deleteLines() {
        let selectionBoxRect: DOMRect = this.selectionBox.getBoundingClientRect();
        let isStateChange = false;
        let actions: Array<IActionObject> = [];
        Object.keys(this.stageMap).forEach(drawingArea => {
            let currentStage = this.stageMap[drawingArea];
            let drawingAreaElement: Element = document.querySelector(drawingArea) as Element;
            let stageRect = drawingAreaElement.getBoundingClientRect() as DOMRect;
            let readerContainer = this.containmentDiv;
            let borderLeft = readerContainer && Number(getComputedStyle(document.querySelector(readerContainer), null).getPropertyValue('border-left-width').slice(0, -2));
            let borderRight = readerContainer && Number(getComputedStyle(document.querySelector(readerContainer), null).getPropertyValue('border-right-width').slice(0, -2));
            //checking if selection box and stage overlap
            if (stageRect.left <= selectionBoxRect.left && (stageRect.left + stageRect.width + borderLeft + borderRight) >= selectionBoxRect.left
                || stageRect.left <= selectionBoxRect.left + selectionBoxRect.width && (stageRect.left + stageRect.width + borderLeft + borderRight) >= selectionBoxRect.left + selectionBoxRect.width
            ) {
                let stageJson = this.getMinifiedJsonFromStage(currentStage);
                if (this.deleteLinesFromStage(currentStage, stageRect, selectionBoxRect)) {
                    isStateChange = true;
                    actions.push({
                        drawingArea: drawingArea,
                        data: stageJson as string
                    })
                }
            }
        })

        if (isStateChange) {
            let undoObj: IUndoRedoObject = {
                actionType: ActionType.DELETE,
                actions: actions

            }
            this.undoStack.push(undoObj);
            this.tiggerStateChange()
        }

    }

    private deleteLinesFromStage(stage: IStage, stageRect: DOMRect, selectionBoxRect: DOMRect) {

        let lines = stage.getLines();
        let isStateChange = false;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i] as Konva.Line;
            let linePonits = line.points()
            let newLines = [] as any;
            let currentLinePoints = [] as any;
            let isDeleted = false;
            let j = 0;
            while (j < linePonits.length) {
                if (this.pointLiesInBox(stageRect, selectionBoxRect, linePonits[j] * line.scaleX(), linePonits[j + 1] * line.scaleY())) {
                    isDeleted = true;
                    isStateChange = true;
                    if (currentLinePoints.length) {
                        newLines.push(currentLinePoints);
                        currentLinePoints = [];
                    }
                } else {
                    currentLinePoints.push(linePonits[j], linePonits[j + 1]);
                }
                j = j + 2;
            }
            //adding last remaining point in newLines array
            if (currentLinePoints.length) {
                newLines.push(currentLinePoints)
            }

            if (isDeleted) {
                //remove current line from stage 
                line.remove()
                // add new sets of line
                for (let k = 0; k < newLines.length; k++) {
                    let newLine = new Line({
                        strokeColor: line.stroke(),
                        strokeWidth: line.strokeWidth(),
                        opacity: line.opacity(),
                        points: newLines[k],
                        width: line.attrs.width,
                        height: line.attrs.height,
                    })

                    newLine.setScale(line.scale().x, line.scale().y);
                    stage.addLine(newLine);
                    stage.batchDraw()
                }
            }
        }

        return isStateChange;
    }

    private pointLiesInBox(stageRect: DOMRect, boxRect: DOMRect, px: number, py: number) {
        let x1 = boxRect.left;
        let x2 = boxRect.left + boxRect.width;
        let y1 = boxRect.top;
        let y2 = boxRect.top + boxRect.height;
        if ((x1 <= stageRect.left + px && stageRect.left + px <= x2) && (y1 <= stageRect.top + py && stageRect.top + py <= y2)) {
            return true;
        }
        return false;
    }

    private tiggerStateChange() {
        if (this.events && this.events[EventsEnum.STATECHANGE]) {
            let stateData = this.getState();
            this.events[EventsEnum.STATECHANGE]({ id: EventsEnum.STATECHANGE, data: stateData });
        }
    }

    private getMinifiedJsonFromStage(stage: IStage) {
        let lines = stage.getLines();
        let minifiedLines = lines.map((line: Konva.Line) => {
            return {
                points: line.attrs.points,
                strokeWidth: line.attrs.strokeWidth,
                strokeColor: line.attrs.stroke,
                opacity: line.opacity(),
                width: line.attrs.width,
                height: line.attrs.height
            }
        })
        let stateJson = {
            lines: minifiedLines
        };
        return JSON.stringify(stateJson);
    }

    private drawLineFromMinifiedJson(stage: IStage, stateJson: string) {
        let json = JSON.parse(stateJson);
        json.lines && json.lines.forEach(line => {

            let xScalingFactor = this.currentWidth / line.width;
            let yScalingFactor = this.currentHeight / line.height;

            let newLine = new Line({
                strokeColor: line.strokeColor,
                strokeWidth: line.strokeWidth,
                opacity: line.opacity,
                points: line.points,
                width: line.width,
                height: line.height,
            })
            stage.addLine(newLine);
            newLine.setScale(xScalingFactor, yScalingFactor);
            stage.batchDraw();
            stage.batchDraw();
        })
    }

    private clearLineFromStage(stage: IStage) {
        stage.clearStage();
        stage.batchDraw();
    }


    private addCursorForDrawing(mode, saveDefaultCursor = true) {
        if (saveDefaultCursor) {
            this.defaultCursor = this.containmentBox.style.cursor;
        }
        if (this.shiftPressed) {
            this.containmentBox.style.cursor = "none";
        } else {
            let cursorRadius = this.strokeWidth * (this.currentWidth / this.baseWidth) / 2;
            let cursorSource;
            if (mode == DrawingMode.PEN) {
                if (this.penCustomCursor) {
                    cursorSource = this.penCustomCursor;
                    this.containmentBox.style.cursor = `url('${cursorSource}') , auto`;
                } else {
                    cursorSource = `data:image/svg+xml;utf8,<svg id=\"svg\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" width=\"${cursorRadius * 2}\" height=\"${cursorRadius * 2}\"><circle cx=\"${cursorRadius}\" cy=\"${cursorRadius}\" r=\"${cursorRadius}\" fill=\"${(hexToRgb)(this.strokeColor)}" /></svg>`;
                    this.containmentBox.style.cursor = `url('${cursorSource}') ${cursorRadius} ${cursorRadius}, auto`;
                }
            } else {
                if (this.highlighterCustomCursor) {
                    cursorSource = this.highlighterCustomCursor;
                    this.containmentBox.style.cursor = `url('${cursorSource}') , auto`;
                } else {
                    cursorSource = `data:image/svg+xml;utf8,<svg id=\"svg\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" width=\"${cursorRadius * 2}\" height=\"${cursorRadius * 2}\"><rect rx ="2" ry="2" width = \"${cursorRadius * 2}\" height =\"${cursorRadius * 2}\" fill = \"${(hexToRgb)(this.strokeColor)}" /></svg>`;
                    this.containmentBox.style.cursor = `url('${cursorSource}') ${cursorRadius} ${cursorRadius}, auto`;
                }
            }
        }
    }

    private removeCursorForDrawing() {
        this.containmentBox.style.cursor = this.defaultCursor
    }

    private addCursorForEraser() {
        if (this.eraserCustomCursor) {
            let cursorSource = this.eraserCustomCursor;
            this.containmentBox.style.cursor = `url('${cursorSource}'), auto`;
        }
        else {
            this.containmentBox.style.cursor = 'crosshair';
        }
    }

    private removeCursorForEraser() {
        this.containmentBox.style.cursor = this.defaultCursor;
    }

}

export default KonvaWrapper;