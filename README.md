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

## Creating renderer class

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

Every renderer needs to have `RenderScheduler` as first contructor param.
  
## Creating renderers instances
Every renderer instance is wrapped in `rendererController`. While you could create it manually and pass to dispatcher it's prefered to use `RendererControllerFactory` it will:
- take care of setting proper scheduler and profiling options 
- validate at compile time if your renderer is capable of offscreen rendering
- fallback to main thread rendering if browser does not support offscreen

Factory methods
| Method | Description |
| --- | --- |
| create | Creates renderer on main thread |
| createOffscreenIfAvailable | Creates renderer in web worker if supported, if not fallsback to main thread |
| createOrchestratedOffscreenIfAvailable | Creates and orchestrator that will monitor workers and spawn and destroy if needed [link here to orch] |

## RenderDispatcher
Pass html element where you want to render and renderers object and from now on you only interact with dispatcher.

## Viewport manipulation
Library comes with default `ViewportManipulator` but you are free to create your own. All it does it listens to user events and invokes `setViewport` on dispatcher.

## render vs renderPatch
For your data to be delivered to webworker it first needs to be serialized so it can go through `postMessage`. Passing entire render object every time something small changed is obviously an overkill and will not scale well. To address that there is a companion method `renderPatch` which contains only changes. 

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

`renderPatch` also allows you to implement some more cleaver optimizations much easier. You know exacly which part of your render data changed so you can rerender only portion of the screen.

## Offscreen rendering requirements
This library can move the renderer to the web worker when created with `createOffscreenIfAvailable`/`createOrchestratedOffscreenIfAvailable` assuming the browser supports it. If it's not supported it will fallback to main thread rendering.

There are some requirements:
1. Renderer constructor type:
```js
constructor(renderScheduler: RenderScheduler, canvas: HTMLCanvasElement | OffscreenCanvas, ...otherParams: any)
}
```
| Param | Description |
| `renderScheduler` | Every renderer needs to have scheduler as it's first constructor param |
| `canvas` | Web worker proxy will transfer canvas control to the offscreen so it needs canvas as second param |
| `otherParams` | Other params that need to be serializable. Typescript should check that :) |

2. RenderPayload passed to render function needs to be serializable as well
3. You need to create web worker file template and expose it to rendering proxy with renderer contructor types:
```js
//renderWorker.template.ts
...
import { exposeToProxy } from "./viewer2d";
const renderWorker: Worker = self as any;
exposeToProxy(renderWorker, [MyCustomRenderer1, MyCustomRenderer2]);
```
4. You need to pass function that creates web workers to renderer factory. Library has no way of knowing how your boundling system works so you need to tell it how to create web workers:
```js
const createRenderWorker = (name: string) =>
  new Worker("./renderWorker.template.ts", {
    type: "module",
    name: `${name}.Renderer`,
  });
```
and that's it. Now your renderer can be used either on main thread or in web workers

## Offcreen rendering orchestration
It's possible to spawn multiple web workers for your renderer. When creating renderer with `createOrchestratedOffscreenIfAvailable` you have some extra options:

| Option | Description | Default  |
| --- | --- | --- |
| `balancedFields` | Field names in your payload that will be balanced. Works only with arrays. | [] |
| `frameTimeTresholds.tooSlowIfMoreThan` | When orchestrator runs balancer it will add worker if average fps is greater than this value | 16 |
| `frameTimeTresholds.tooFastIfLessThan` | When orchestrator runs balancer it will remove worker if average fps is lower than this value | 5 |
| `initialExecutors` | How many web workers should be spawn at start | 1 |
| `minExecutors` | Minimum number of web workers for this renderer | 1 |
| `maxExecutors` | Maximum number of web workers for this renderer | 4 |
| `frequency` | How often balancer will run (ms) | 5000 |
| `balancer` | Custom function to run your own balancing algorithm | Default balancer |

Default balancer will check `frameTimeTresholds` every time it runs and add/remove web workers accordingly.
![](https://github.com/mateuszmigas/viewer-2d/blob/master/docs/images/orch.gif)

# RenderScheduler
When rendering with multiple renderers in main thread and webworkers you may or may not want to synchronize stuff:

| Scheduler type | Description |
| --- | --- |
| `onDemand` | When renderer requests render it will be instantly invoked |
| `onDemandSynchronized` | When renderer requests render it will be scheduled for next animation frame (requestAnimationFrame) |

Keep in mind this is an optimistic synchronization, only renderers that are meeting the budget (<16fps) will be synchronized, rest will try to catch up.

## Monitoring performance
Internally library will monitor performance of offscreen renderers when they are managed by the orchestrator. You can also monitor performance of all workers with `RenderingStatsMonitorPanel`.

```js
  const monitorPanel = new RenderingStatsMonitorPanel();
  this.hostElement.current.appendChild(monitorPanel.getElement()); //add it to the dom

  const factory = new RendererControllerFactory(
    {
      ...
      profiling: {
        onRendererStatsUpdated: monitorPanel.updateStats, //glue monitor panel with render scheduler
      },
    },
  );
  ...
   monitorPanel.addRenderers(rendererControllers); //decide which renderers you want to monitor
```

## Typescript support

While it's possible to use it from Javascript it's recommended to use it with Typescript for best experience. It's obviously written in Typescript and come with type definitions. It favors compile-time checking over runtime exceptions.

## Performance
If your rendering is GPU bound, like manipulating thousands of rectangles in shaders, this library will not help you much. It will help you if your main thread is busy by rendering in workers. It can also help if you are not making use of your CPU cores, seems to work pretty well with Canvas2D.

## Developing

Terminal 1 (main directory):
`yarn`
`yarn run watch`

Terminal 2 (examples\react-host directory):
`yarn`
`yarn start`

## License

[MIT](https://choosealicense.com/licenses/mit/)
