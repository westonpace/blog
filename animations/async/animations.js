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
        this.timeline = null;
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

    run(scene) {

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
        for (let i = 0; i < this.ticksPerRequest; i++) {
            this.scene.tick();
        }
        this.scene.fill(fut, promise);
        this.upstream.receiveFilledFuture(fut, promise);
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

// let remaining = function (idx) {
//     let sum = 0;
//     for (let i = idx; i < durations.length; i++) {
//         sum += durations[i];
//     }
//     return sum;
// };
// let range = function (idx1, idx2) {
//     let sum = 0;
//     for (let i = idx1; i < idx2; i++) {
//         sum += durations[i];
//     }
//     return sum;
// };
// let animation = anime.timeline({
//     easing: 'easeInOutSine',
//     loop: true,
//     duration: remaining(0)
// });
// animation.add({
//     targets: '#r',
//     keyframes: [
//         { translateX: -145, duration: durations[0] },
//         { opacity: 0, duration: durations[1] },
//         { duration: remaining(2) }
//     ]
// }).add({
//     targets: '#r2',
//     keyframes: [
//         { duration: durations[0] },
//         { opacity: 1, duration: durations[1] },
//         { translateX: -145, duration: durations[2] },
//         { duration: durations[3], opacity: 0 },
//         { duration: remaining(4) }
//     ]
// }, 0).add({
//     targets: '#p',
//     keyframes: [
//         { duration: durations[0] },
//         { opacity: 1, duration: durations[1] },
//         { duration: range(2, 7) },
//         { duration: durations[7], fill: promiseFill },
//         { duration: durations[8] },
//         { duration: durations[9], opacity: 0 },
//         { duration: durations[10], fill: white },
//         { duration: durations[11], opacity: 1 },
//         { duration: durations[12] },
//         { duration: durations[13] },
//         { duration: durations[14], fill: promiseFill }
//     ]
// }, 0).add({
//     targets: '#f',
//     keyframes: [
//         { duration: durations[0] },
//         { opacity: 1, duration: durations[1] },
//         { translateX: 145, duration: durations[2] },
//         { duration: range(3, 7) },
//         { duration: durations[7], fill: futureFill },
//         { duration: durations[8] },
//         { duration: durations[9], opacity: 0 },
//         { duration: durations[10], fill: white, translateX: 0 },
//         { duration: durations[11], opacity: 1 },
//         { duration: durations[12], translateX: 145 },
//         { duration: durations[13] },
//         { duration: durations[14], fill: futureFill }
//     ]
// }, 0).add({
//     targets: '#p2',
//     keyframes: [
//         { duration: range(0, 3) },
//         { opacity: 1, duration: durations[3] },
//         { duration: range(4, 6), rotate: '4turn' },
//         { duration: durations[6], fill: promiseFill },
//         { duration: durations[7], opacity: 0 },
//         { duration: range(8, 10), rotate: '0turn', fill: white },
//         { duration: durations[10], opacity: 1 },
//         { duration: range(11, 13), rotate: '4turn' },
//         { duration: durations[13], fill: promiseFill },
//         { duration: durations[14], opacity: 0 }
//     ]
// }, 0).add({
//     targets: '#f2',
//     keyframes: [
//         { duration: range(0, 3) },
//         { opacity: 1, duration: durations[3] },
//         { translateX: 145, duration: durations[4] },
//         { duration: durations[5] },
//         { duration: durations[6], fill: futureFill },
//         { duration: durations[7] },
//         { duration: durations[8], opacity: 0 },
//         { duration: range(9, 10), translateX: 0, fill: white },
//         { duration: durations[10], opacity: 1 },
//         { duration: durations[11], translateX: 145 },
//         { duration: durations[12] },
//         { duration: durations[13], fill: futureFill },
//         { duration: durations[14] }
//     ]
// }, 0).add({
//     targets: '#r3',
//     keyframes: [
//         { duration: range(0, 8) },
//         { opacity: 1, duration: durations[8] },
//         { translateX: -145, duration: durations[9] },
//         { duration: durations[10], opacity: 0 },
//         { duration: remaining(11) }
//     ]
// }, 0).add({
//     targets: '#r4',
//     keyframes: [
//         { duration: range(0, 9) },
//         { opacity: 1, duration: durations[9] },
//         { duration: durations[10], translateX: -145 },
//         { duration: durations[11], opacity: 0 },
//         { duration: remaining(12) }
//     ]
// }, 0);
