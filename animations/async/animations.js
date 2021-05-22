const futureFill = '#b39ddb';
const promiseFill = '#81c784';
const white = '#ffffff';
let durations = [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000];

const leftPadding = 25;
const topPadding = 25;
const topLineY = 50;
const bottomLineY = 100;
const operatorWidth = 100;
const operatorHeight = 100;
const operatorSpacing = 150;
const itemMargin = 15;
const itemR = 5;
const promiseSize = itemR * 2;
const msPerTick = 500;
const maxTime = msPerTick * 100;
const workingY = topPadding + operatorHeight + itemMargin;
const queueY = topPadding - itemMargin;

let time = 0;

function svgEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

class Scene {

    constructor(svgRoot) {
        this.operators = [];
        this.svgRoot = svgRoot;
        this.idCounter = 0;
        this.timeIdx = 0;
        this.time = 0;
        this.elapsed = 0;
        this.animations = [];
        this.tasks = [];
        this.timeline = null;
    }

    addTask(task, time) {
        this.tasks.push({ task, time });
    }

    finishTask() {
        if (this.tasks.length > 0) {
            let nextTask = this.tasks.pop();
            this.time = nextTask.time;
            nextTask.task();
            this.finishTask();
        }
    }

    tick() {
        this.timeIdx++;
        this.time += msPerTick;
    }

    getId() {
        return 'el' + this.idCounter++;
    }

    setup() {
        for (let opIdx = 0; opIdx < this.operators.length; opIdx++) {
            this.operators[opIdx].setup(this, opIdx);
            if (opIdx > 0) {
                this.setupConnection(opIdx - 1);
            }
        }
    }

    finish() {
        const timeline = anime.timeline({
            easing: 'easeInOutSine',
            loop: true,
            duration: this.time + msPerTick
        });
        for (const animation of this.animations) {
            timeline.add({
                targets: animation.target,
                keyframes: animation.keyframes
            }, 0);
        }
    }

    addKeyframe(animation, keyframe) {
        const delayNeeded = this.time - animation.lastTime - animation.lastDuration;
        if (delayNeeded > 0) {
            animation.keyframes.push({ duration: delayNeeded });
        }
        animation.keyframes.push(keyframe);
        animation.lastTime = this.time;
        animation.lastDuration = keyframe.duration;
    }

    createAnimation(id, x, upstream, initialAttrs = {}) {
        const animation = {
            target: `#${id}`,
            lastDuration: 0,
            lastTime: this.time,
            keyframes: [],
            x,
            originX: x,
            upstream,
            filled: false,
            future: null
        };
        if (this.time > 0 || Object.keys(initialAttrs).length > 0) {
            const initial = { duration: this.time };
            Object.assign(initial, initialAttrs);
            this.addKeyframe(animation, initial);
        }
        this.addKeyframe(animation, { duration: msPerTick, opacity: 1 });
        this.animations.push(animation);
        return animation;
    }

    getItemX(x, upstream) {
        const val = leftPadding + x * (operatorWidth + operatorSpacing);
        if (upstream) {
            return val + operatorWidth + itemMargin;
        } else {
            return val - itemMargin;
        }
    }

    getQueueX(x, idx) {
        const start = leftPadding + x * (operatorWidth + operatorSpacing);
        return start + (idx * itemMargin);
    }

    createQueuedFuture(x, queueIdx = 0) {
        const id = this.getId();
        const fut = svgEl('circle');
        this.svgRoot.appendChild(fut);
        const xPos = this.getQueueX(x, queueIdx);
        fut.id = id;
        fut.setAttribute('r', itemR);
        fut.setAttribute('class', 'future initially-invisible');
        fut.setAttribute('cx', xPos);
        fut.setAttribute('cy', queueY);
        return this.createAnimation(id, x, false);
    }

    createWorkingPromise(x, future, queueIdx = 0) {
        const id = this.getId();
        const promise = svgEl('rect');
        this.svgRoot.appendChild(promise);
        const xPos = this.getQueueX(x, queueIdx);
        promise.id = id;
        promise.setAttribute('width', promiseSize);
        promise.setAttribute('height', promiseSize);
        promise.setAttribute('x', xPos);
        promise.setAttribute('y', workingY - itemR);
        promise.setAttribute('class', 'promise initially-invisible');
        let result = this.createAnimation(id, x, false);
        result.future = future;
        return result;
    }

    createRequest(x) {
        const id = this.getId();
        const req = svgEl('circle');
        this.svgRoot.appendChild(req);
        const xPos = this.getItemX(x, false);
        req.id = id;
        req.setAttribute('r', itemR);
        req.setAttribute('class', 'request initially-invisible');
        req.setAttribute('cx', xPos);
        req.setAttribute('cy', bottomLineY);
        return this.createAnimation(id, x, false);
    }

    createFuture(x, filled = false) {
        const id = this.getId();
        const fut = svgEl('circle');
        this.svgRoot.appendChild(fut);
        const xPos = this.getItemX(x, true);
        fut.id = id;
        fut.setAttribute('r', itemR);
        fut.setAttribute('class', 'future initially-invisible');
        fut.setAttribute('cx', xPos);
        fut.setAttribute('cy', topLineY);
        let initialAttrs = {};
        if (filled) {
            initialAttrs['fill'] = futureFill;
        }
        let result = this.createAnimation(id, x, true, initialAttrs);
        if (filled) {
            result.filled = true;
        }
        return result;
    }

    sendFuture(fut) {
        const targetX = fut.x + 1;
        const targetXPos = this.getItemX(targetX, false);
        const targetOffset = targetXPos - this.getItemX(fut.originX, true);
        this.addKeyframe(fut, { duration: msPerTick, translateX: targetOffset });
        fut.x = targetX;
        fut.park = this.time + msPerTick;
    }

    fill(fut, promise = null) {
        this.addKeyframe(fut, { duration: msPerTick, fill: futureFill });
        if (promise) {
            this.addKeyframe(promise, { duration: msPerTick, fill: promiseFill });
        }
    }

    sendRequest(req) {
        const targetX = req.x - 1;
        const targetXPos = this.getItemX(targetX, true);
        const targetOffset = targetXPos - this.getItemX(req.originX, false);
        this.addKeyframe(req, { duration: msPerTick, translateX: targetOffset });
        req.x = targetX;
    }

    workPromise(promise, numTicks) {
        this.addKeyframe(promise, { duration: numTicks * msPerTick, rotate: '2turn' });
    }

    remove(req) {
        this.addKeyframe(req, { duration: msPerTick, opacity: 0 });
    }

    addOperator(op) {
        this.operators.push(op);
    }

    setupLine(leftIdx, y) {
        const line = svgEl('line');
        const left = leftPadding + operatorWidth + (leftIdx * (operatorWidth + operatorSpacing));
        const right = left + operatorSpacing;
        line.setAttribute('class', 'path');
        line.setAttribute('x1', left);
        line.setAttribute('x2', right);
        line.setAttribute('y1', y);
        line.setAttribute('y2', y);
        this.svgRoot.appendChild(line);
    }

    setupConnection(leftIdx) {
        this.setupLine(leftIdx, topLineY);
        this.setupLine(leftIdx, bottomLineY);
    }

};

class Operator {

    constructor(labels) {
        this.labels = labels;
        this.x = -1;
    }

    setup(scene, xIndex) {
        this.scene = scene;
        this.x = xIndex;
        const xPos = leftPadding + xIndex * (operatorWidth + operatorSpacing);
        const yPos = topPadding;
        const operatorGroup = svgEl('g')
        operatorGroup.setAttribute('transform', `translate(${xPos},${yPos})`);
        const operatorRect = svgEl('rect');
        operatorGroup.appendChild(operatorRect);
        operatorRect.setAttribute('class', 'operator');
        operatorRect.setAttribute('width', operatorWidth);
        operatorRect.setAttribute('height', operatorHeight);
        const labelGroup = svgEl('g');
        operatorGroup.appendChild(labelGroup);
        const textXPos = operatorWidth / 2;
        const textYPos = operatorHeight / 2;
        labelGroup.setAttribute('transform', `translate(${textXPos}, ${textYPos})`);
        const textContainer = svgEl('text');
        labelGroup.appendChild(textContainer);
        for (let labelIndex = 0; labelIndex < this.labels.length; labelIndex++) {
            const label = svgEl('tspan');
            label.setAttribute('x', 0);
            label.setAttribute('dy', `${labelIndex}em`);
            label.textContent = this.labels[labelIndex];
            textContainer.appendChild(label);
        }
        scene.svgRoot.appendChild(operatorGroup);
    }

};

function addCallback(fut, cb) {
    if (fut.filled) {
        cb();
    } else {
        fut.callback = cb;
    }
}

function triggerCb(cb) {
    if (cb) {
        cb();
    }
}

class Count extends Operator {

    constructor() {
        super(['Count']);
    }

    receiveRequest(req) {
        this.scene.remove(req);
        const fut = this.scene.createFuture(this.x, true);
        this.scene.tick();
        this.scene.sendFuture(fut);
        this.scene.tick();
        return fut;
    }

}


class FileSystem extends Operator {

    constructor(ticksPerRequest) {
        super(['File', 'System'])
        this.ticksPerRequest = ticksPerRequest;
    }

    receiveRequest(req) {
        this.scene.remove(req);
        const fut = this.scene.createFuture(this.x);
        const promise = this.scene.createWorkingPromise(this.x, fut);
        this.scene.tick();
        this.scene.sendFuture(fut);
        this.scene.workPromise(promise, this.ticksPerRequest);
        this.scene.addTask(() => {
            this.scene.fill(fut, promise);
            this.scene.remove(promise);
            triggerCb(fut.callback);
        }, this.scene.time + this.ticksPerRequest * msPerTick);
        return fut;
    }

};

class UserApp extends Operator {

    constructor() {
        super(['User', 'App']);
        this.downstream = null;
    }

    start() {
        const req = this.scene.createRequest(this.x);
        this.scene.tick();
        this.scene.sendRequest(req);
        this.scene.tick();
        const fut = this.downstream.receiveRequest(req);
        addCallback(fut, () => this.onFill(fut));
        this.scene.finishTask();
    }

    onFill(fut) {
        this.scene.remove(fut);
        this.scene.tick();
        if (this.scene.time < maxTime) {
            this.start();
        }
    }

}

class SerialReadahead extends Operator {

    constructor() {
        super(['Serial', 'Readahead']);
        this.downstream = null;
        this.upstream = null;
        this.queuedFutures = [];
        this.queuedPromises = [];
    }

    receiveRequest(req) {
        this.scene.remove(req);
        if (this.queuedFutures.length > 0) {
            const fut = this.queuedFutures.shift(1);
            this.scene.remove(fut);
            const upFut = this.scene.createFuture(this.x, fut.filled);
            this.scene.tick();
            this.scene.sendFuture(upFut);
            this.scene.tick();
            return upFut;
        } else {
            const queueX = this.queuedPromises.length;
            const fut = this.scene.createFuture(this.x);
            const promise = this.scene.createWorkingPromise(this.x, fut, queueX);
            this.queuedPromises.push(promise);
            const req = this.scene.createRequest(this.x);
            this.scene.tick();
            this.scene.sendFuture(fut);
            this.scene.sendRequest(req);
            const downFut = this.downstream.receiveRequest(req);
            this.scene.tick();
            addCallback(downFut, () => {
                this.onFill(downFut);
            });
            return fut;
        }
    }

    onFill(fut) {
        this.scene.remove(fut);
        this.scene.tick();
        if (this.queuedPromises.length > 0) {
            const promise = this.queuedPromises.shift();
            const future = promise.future;
            const req = this.scene.createRequest(this.x);
            this.scene.tick();
            this.scene.sendRequest(req);
            this.scene.tick();
            const downFut = this.downstream.receiveRequest(req);
            this.scene.remove(downFut);
            this.queuedFutures.push(downFut);
            this.scene.createQueuedFuture(this.x, this.queuedFutures.length);
            this.scene.fill(future, promise);
            this.scene.remove(promise);
            triggerCb(future.callback);
        } else {
            this.queuedFutures.push(fut);
            this.scene.createQueuedFuture(this.x, this.queuedFutures.length);
            const req = this.scene.createRequest(this.x);
            this.scene.tick();
            this.scene.sendRequest(req);
        }
    }

    findNextUnfilledPromise() {
        for (let i = 0; i < this.queuedPromises.length; i++) {
            if (!this.queuedPromises[i].filled) {
                return i;
            }
        }
        return -1;
    }

}

function run() {

    const svgRoot = document.querySelector('#svg-root');

    const count = new Count();
    const fileSystem = new FileSystem(6);
    const serialReadahead = new SerialReadahead();
    const userApp = new UserApp();
    const scene = new Scene(svgRoot);

    // scene.addOperator(count);
    scene.addOperator(fileSystem);
    scene.addOperator(serialReadahead);
    scene.addOperator(userApp);

    serialReadahead.downstream = fileSystem;
    serialReadahead.upstream = userApp;
    userApp.downstream = serialReadahead;

    // userApp.downstream = fileSystem;

    // userApp.downstream = count;

    scene.setup();

    userApp.start();

    scene.finish();
}

window.addEventListener('load', () => {
    run();
});
