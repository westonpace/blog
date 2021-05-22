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
const msPerTick = 200;
const maxTime = msPerTick * 100;
const workingY = topPadding + operatorHeight + itemMargin;

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
        this.tasks.push({task, time});
    }

    finishTask() {
        if (this.tasks.length > 0) {
            let nextTask = this.tasks.pop();
            this.time = nextTask.time;
            nextTask.task();
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

    createAnimation(id, x, upstream) {
        const animation = {
            target: `#${id}`,
            lastDuration: 0,
            lastTime: this.time,
            keyframes: [],
            x,
            originX: x,
            upstream
        };
        if (this.time > 0) {
            this.addKeyframe(animation, { duration: this.time });
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

    createWorkingPromise(x) {
        const id = this.getId();
        const promise = svgEl('rect');
        this.svgRoot.appendChild(promise);
        const xPos = this.getQueueX(x, 0);
        promise.id = id;
        promise.setAttribute('width', promiseSize);
        promise.setAttribute('height', promiseSize);
        promise.setAttribute('x', xPos);
        promise.setAttribute('y', workingY - itemR);
        promise.setAttribute('class', 'promise initially-invisible');
        return this.createAnimation(id, x, false);
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

    createFuture(x) {
        const id = this.getId();
        const fut = svgEl('circle');
        this.svgRoot.appendChild(fut);
        const xPos = this.getItemX(x, true);
        fut.id = id;
        fut.setAttribute('r', itemR);
        fut.setAttribute('class', 'future initially-invisible');
        fut.setAttribute('cx', xPos);
        fut.setAttribute('cy', topLineY);
        return this.createAnimation(id, x, true);
    }

    sendFuture(fut) {
        const targetX = fut.x + 1;
        const targetXPos = this.getItemX(targetX, false);
        const targetOffset = targetXPos - this.getItemX(fut.originX, true);
        this.addKeyframe(fut, { duration: msPerTick, translateX: targetOffset });
        fut.x = targetX;
        fut.park = this.time + msPerTick;
    }

    fill(fut, promise) {
        this.addKeyframe(fut, { duration: msPerTick, fill: futureFill });
        this.addKeyframe(promise, { duration: msPerTick, fill: promiseFill });
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

class FileSystem extends Operator {

    constructor(ticksPerRequest) {
        super(['File', 'System'])
        this.upstream = null;
        this.ticksPerRequest = ticksPerRequest;
    }

    receiveRequest(req) {
        this.scene.remove(req);
        const promise = this.scene.createWorkingPromise(this.x);
        const fut = this.scene.createFuture(this.x);
        this.scene.tick();
        this.scene.sendFuture(fut);
        this.scene.workPromise(promise, this.ticksPerRequest);
        this.scene.addTask(() => {
            this.scene.fill(fut, promise);
            this.upstream.receiveFilledFuture(fut, promise);
        }, this.scene.time + this.ticksPerRequest * msPerTick);
        this.scene.finishTask();
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
        this.downstream.receiveRequest(req);
    }

    receiveFilledFuture(fut, promise) {
        this.scene.remove(fut);
        this.scene.remove(promise);
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
    }

    receiveRequest(req) {
        this.scene.remove(req);
        if (this.queuedFutures.length > 0) {
            let fut = this.queuedFutures.shift(1);
        } else {

        }
    }

    receiveFilledFuture() {

    }
}

function run() {

    const svgRoot = document.querySelector('#svg-root');

    const fileSystem = new FileSystem(3);
    const userApp = new UserApp();
    const scene = new Scene(svgRoot);

    scene.addOperator(fileSystem);
    scene.addOperator(userApp);
    fileSystem.upstream = userApp;
    userApp.downstream = fileSystem;
    scene.setup();

    userApp.start();

    scene.finish();
}

window.addEventListener('load', () => {
    run();
});
