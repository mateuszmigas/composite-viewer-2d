# Viewer 2D

This is an experimental project for bringing together different kinds of renderers and using them as one with offscreen rendering capabilities.

//example here

Just a robot right? But it's rendered by 4 different renderers

![](https://github.com/mateuszmigas/viewer-2d/blob/master/docs/images/sync.gif)

| Renderer | Part | Executor |
| --- | --- |---|
| PixiJS | eyes/mouth | Main thread |
| HtmlDivElement | text | Main thread |
| Canvas2D | borders | Web worker |
| ThreeJS | rectangles | Spread accross 1-4 web workers |


# Quick Overview
When you start developing software that shows some complex 2D views you will quickly realize that there is no library that is good at everything.
While WebGL is good at displaying large amount of shapes it won't do well with lots of text or some editable controls. This library allows you to use different technologies together to get best out of all worlds. It does not impmlement any renderers on it's own altho it comes with some examples how to integrate with pupular ones. It's purpose is to be used in combination with existing graphic libraries like ThreeJS, PixiJS and others. 

## What it can be used for
Applications that use some 2D rendering like:
- graphs
- architectual designers
- 2D games

## What value does it bring
- manipulatting different renderers with one manipulator
- synchronizing rendering output [section here]
- offscreen web worker rendering with same API as main thread, this can free your main thread and make application more responsive
- orchestrated offscreen web worker rendering with same API as main thread. It monitors web workers performance and spawns and destroys them as needed

# How does it work?

![](https://github.com/mateuszmigas/viewer-2d/blob/master/docs/diagrams/howitworks.svg)


## Browser support

| Browser         | Is supported     |
| ----------------- | --------------------- |
| Chrome | yes |
| rest :) | not tested |

# How to use it?

## Creating renderer

Create a class that implements Renderer<T> interface where T is your payload
```js
export interface Renderer<T> {
  render(payload: T): void;
  renderPatches(payloadPatches: Patch<T>[]): void;
  setSize(size: Size): void;
  setViewport(viewport: Viewport): void;
  setVisibility(visible: boolean): void;
  pickObjects(options: PickingOptions): Promise<PickingResult[]>;
  dispose(): void;
}
```
| Param | Description |
| --- | --- |
| `render` | Your main render function. Pass all the data you need for rendering. If something never changes pass it in constructor |
| `renderPatches` | Use it to update your render state. You could use render but there will be an overhead when passing data to web workers |
| `setSize` | Resize the rendering area |
| `setViewport` | Move and scale your objects: translate host/move camera or simply redraw objects if it's best option |
| `pickObjects` | Find and return objects requested by options ff your renderer supports picking objects |
| `dispose` | Unsubscribe from all events here and free resouces

## render vs renderPatch
For your data to be delivered to webworker it first needs to be serialized so it can go through postMessage. Passing entire render object every time something small changed is obviously an overkill and will not scale well. To address that there is a companion method "renderPatch" which contains only "changes". 

| render | renderPatch |
| Used to replace existing payload | Used to apply patches to existing payload |
renderPatch does shallow patching, no support for deep patching. Consider you have and object:

```js
const payload = {
  layer: string,
  rectangles: [rect1, rect2, rect]
}
```

You can do the following operations
```js
[
  { path: "layer", value: "someLayer" }, //replace object
  { path: "rectangles", op: "add", values: [rect3, rect5] }, //add two rectangles
  { path: "rectangles", op: "replace", index: 1,  values rect7 }, //replace second rectangle
  { path: "rectangles", op: "replace", indexes: [0,1] } //remove first and second rectangle
]               
```

"renderPatch" also allows you to implement some more cleaver optimizations much easier. You know exacly which part of your render data changed so you can rerender only portion of the screen.

# RenderScheduler
When rendering with multiple renderers in main thread and webworkers you may or may not want to synchronize stuff:

| Scheduler type | Description |
| --- | --- |
| `onDemand` | When renderer requests render it will be instantly invoked |
| `onDemandSynchronized` | When renderer requests render it will be scheduled for next animation frame (requestAnimationFrame) |

Keep in mind this is an optimistic synchronization, only renderers that are meeting the budget (<16fps) will be synchronized, rest will try to catch up. 

## Offscreen rendering requirements

This library can move the renderer to the web worker assuming the browser supports it. If it's not supported it will fallback to main thread rendering.

There are some requirements:

1. type must be as follows:

```js
constructor(renderScheduler: RenderScheduler, canvas: HTMLCanvasElement | OffscreenCanvas, ...otherParams: any)

render(payload: Serializable<T>)
}
```

otherParams must be serializable

1. Your renderer needs to have contructor of type (renderScheduler: RenderScheduler, canvas: HtmlCanvasElement, ...otherParams: Serializable<T>)

- renderScheduler will be used to synchronize rendering with main thread. You don't have to use it but it's better to do so
- canvas - this is the element it will draw on, control will be transfered to offscreen
- otherParams - any params that can be serialized. This renderer will be created in web worker so this data has to be passed through postMessage

2. RenderPayload passed to render function needs to be serializable for same reason as above
3. You need to create web worker file template and expose it to rendering proxy with renderer contructor types:

```js
//renderWorker.template.ts
import { MyCustomRenderer } from "./MyCustomRenderer";
import { exposeToProxy } from "./viewer2d";
const renderWorker: Worker = self as any;
exposeToProxy(renderWorker, [MyCustomRenderer]);
```

4. You need to pass function that creates web workers to renderer factory. Library has no way of knowing how your boundling system works so you need to tell it how to create web workers

```js
const createRenderWorker = (name: string) =>
  new Worker("./renderWorker.template.ts", {
    type: "module",
    name: `${name}.Renderer`,
  });
```

and that's it. Now your renderer can be used either on main thread or in webworker(s). This also ensures it can be orchestrated (spread into multiple workers)

## Offcreen rendering orchestration

It's possible to spawn multiple web workers for your renderer.
Create your renderer with ....

Initially it will spawn one web worker and monitor it's performance. If it's less than {16ms} it will spawn another worker and split rendering.
There are two ways:

- ....
- ....

## Typescript support

While it's possible to use it from Javascript it's recommended to use it with Typescript for best experience. It's obviously written in Typescript and come with type definitions. It favors compile-time checking over runtime exceptions.

## Performance
If your rendering is GPU bound, like manipulating thousands of rectangles in shaders, this library will not help you much. 
- making your , altho it might free your main thread in some cases. It should help with 

## Developing

Terminal 1 (main directory):
`yarn`
`yarn run watch`

Terminal 2 (examples\react-host directory):
`yarn`
`yarn start`

## License

[MIT](https://choosealicense.com/licenses/mit/)
